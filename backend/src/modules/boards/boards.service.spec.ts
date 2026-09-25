import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Board, BoardVisibility } from '../../database/entities/board.entity';
import { BoardCollaborator } from '../../database/entities/board-collaborator.entity';
import { BoardsService } from './boards.service';

type MockRepository = Partial<Record<keyof Repository<any>, jest.Mock>>;

function createMockRepository(): MockRepository {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
}

describe('BoardsService', () => {
  let service: BoardsService;
  let repository: MockRepository;
  let collabsRepository: MockRepository;

  beforeEach(async () => {
    repository = createMockRepository();
    collabsRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardsService,
        {
          provide: getRepositoryToken(Board),
          useValue: repository,
        },
        {
          provide: getRepositoryToken(BoardCollaborator),
          useValue: collabsRepository,
        },
      ],
    }).compile();

    service = module.get(BoardsService);
  });

  it('listByOwner scopes the query to the given owner', async () => {
    repository.find!.mockResolvedValue([]);

    await service.listByOwner('owner-1');

    expect(repository.find).toHaveBeenCalledWith({
      where: { ownerId: 'owner-1', publishedFromId: IsNull() },
      order: { updatedAt: 'DESC' },
    });
  });

  it('findOneOwnedBy throws NotFoundException when no board matches the id+owner pair', async () => {
    repository.findOne!.mockResolvedValue(null);

    await expect(
      service.findOneOwnedBy('board-1', 'owner-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'board-1', ownerId: 'owner-1' },
    });
  });

  it("findOneOwnedBy does not leak another owner's board", async () => {
    // Simulates the real repository behaviour: a board owned by someone
    // else never matches the { id, ownerId } filter, so it comes back null
    // regardless of whether a board with that id exists at all.
    repository.findOne!.mockResolvedValue(null);

    await expect(
      service.findOneOwnedBy('someone-elses-board', 'owner-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create persists a new board owned by the given user with an empty snapshot', async () => {
    const created = {
      ownerId: 'owner-1',
      title: 'My board',
      snapshot: {},
    } as Board;
    repository.create!.mockReturnValue(created);
    repository.save!.mockResolvedValue({
      ...created,
      id: 'board-1',
      visibility: BoardVisibility.PRIVATE,
    });

    const result = await service.create('owner-1', { title: 'My board' });

    expect(repository.create).toHaveBeenCalledWith({
      ownerId: 'owner-1',
      title: 'My board',
      snapshot: {},
      thumbnailUrl: null,
    });
    expect(repository.save).toHaveBeenCalledWith(created);
    expect(result.id).toBe('board-1');
  });

  it('create persists a new board with provided snapshot and thumbnail', async () => {
    const customSnapshot = { document: { store: { shape1: 'val' } } };
    const customThumbnail = 'data:image/webp;base64,12345';
    const created = {
      ownerId: 'owner-1',
      title: 'Anonymous Board Upgraded',
      snapshot: customSnapshot,
      thumbnailUrl: customThumbnail,
    } as Board;
    repository.create!.mockReturnValue(created);
    repository.save!.mockResolvedValue({
      ...created,
      id: 'board-2',
      visibility: BoardVisibility.PRIVATE,
    });

    const result = await service.create('owner-1', {
      title: 'Anonymous Board Upgraded',
      snapshot: customSnapshot,
      thumbnail: customThumbnail,
    });

    expect(repository.create).toHaveBeenCalledWith({
      ownerId: 'owner-1',
      title: 'Anonymous Board Upgraded',
      snapshot: customSnapshot,
      thumbnailUrl: customThumbnail,
    });
    expect(repository.save).toHaveBeenCalledWith(created);
    expect(result.id).toBe('board-2');
  });

  it('updateSnapshot only updates a board owned by the requesting user or editor collaborator', async () => {
    const existing = {
      id: 'board-1',
      ownerId: 'owner-1',
      snapshot: {},
    } as Board;
    repository.findOne!.mockResolvedValue(existing);
    repository.save!.mockImplementation((board) => Promise.resolve(board));

    const result = await service.updateSnapshot('board-1', 'owner-1', {
      snapshot: { document: { store: {} } },
    });

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'board-1' },
    });
    expect(result.snapshot).toEqual({ document: { store: {} } });
  });
});
