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
    remove: jest.fn(),
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
      relations: { owner: true },
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
      visibility: BoardVisibility.PRIVATE,
      anyoneCanEdit: false,
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
      visibility: BoardVisibility.PRIVATE,
      anyoneCanEdit: false,
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
      visibility: BoardVisibility.PRIVATE,
      anyoneCanEdit: false,
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
      visibility: BoardVisibility.PRIVATE,
      anyoneCanEdit: false,
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

  it('publish auto-duplicates the board into a PUBLISHED snapshot and leaves original board untouched', async () => {
    const original = {
      id: 'board-1',
      ownerId: 'owner-1',
      title: 'Design System',
      visibility: BoardVisibility.PRIVATE,
      snapshot: { document: { store: { id: 1 } } },
      thumbnailUrl: 'thumb.jpg',
    } as Board;
    const publishedDuplicate = {
      id: 'board-pub-1',
      ownerId: 'owner-1',
      title: 'Design System',
      publishedFromId: 'board-1',
      visibility: BoardVisibility.PUBLISHED,
      anyoneCanEdit: false,
      originalOwnerId: 'owner-1',
      originalOwnerName: null,
      snapshot: original.snapshot,
      thumbnailUrl: 'thumb.jpg',
      postTitle: 'My Community Post',
      postDetails: 'Details here',
      postTags: ['design'],
      postMedia: [],
    } as Board;

    repository.findOne!.mockResolvedValue(original);
    repository.create!.mockReturnValue(publishedDuplicate);
    repository.save!.mockResolvedValue(publishedDuplicate);

    const result = await service.publish('board-1', 'owner-1', {
      postTitle: 'My Community Post',
      postDetails: 'Details here',
      postTags: ['design'],
      postMedia: [],
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: 'owner-1',
        title: 'Design System',
        publishedFromId: 'board-1',
        visibility: BoardVisibility.PUBLISHED,
        anyoneCanEdit: false,
        originalOwnerId: 'owner-1',
        originalOwnerName: null,
        postTitle: 'My Community Post',
      }),
    );
    expect(original.visibility).toBe(BoardVisibility.PRIVATE);
    expect(result.id).toBe('board-pub-1');
  });

  it('duplicate by non-owner sets originalOwnerId and originalOwnerName', async () => {
    const original = {
      id: 'board-pub-1',
      ownerId: 'owner-1',
      title: 'Design System',
      visibility: BoardVisibility.PUBLISHED,
      snapshot: { document: { store: { id: 1 } } },
      thumbnailUrl: 'thumb.jpg',
      owner: { id: 'owner-1', name: 'Alice' },
    } as unknown as Board;
    const manualCopy = {
      id: 'board-copy-1',
      ownerId: 'user-2',
      title: 'Design System (copy)',
      visibility: BoardVisibility.PRIVATE,
      anyoneCanEdit: false,
      publishedFromId: null,
      originalOwnerId: 'owner-1',
      originalOwnerName: 'Alice',
    } as Board;

    repository.findOne!.mockResolvedValue(original);
    repository.create!.mockReturnValue(manualCopy);
    repository.save!.mockResolvedValue(manualCopy);

    const result = await service.duplicate('board-pub-1', 'user-2');

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: 'user-2',
        title: 'Design System (copy)',
        visibility: BoardVisibility.PRIVATE,
        originalOwnerId: 'owner-1',
        originalOwnerName: 'Alice',
      }),
    );
    expect(result.id).toBe('board-copy-1');
  });

  it('allows admin to access, update, and remove any board', async () => {
    const board = {
      id: 'board-other-1',
      ownerId: 'other-user',
      title: 'Other Board',
      visibility: BoardVisibility.PRIVATE,
      snapshot: {},
    } as Board;

    repository.findOne!.mockResolvedValue(board);
    repository.remove!.mockResolvedValue(board);
    repository.save!.mockImplementation((b) => Promise.resolve(b));

    // Admin can find board
    const found = await service.findOneOwnedBy('board-other-1', 'admin-user', true);
    expect(found.id).toBe('board-other-1');

    // Admin can update snapshot
    const updated = await service.updateSnapshot('board-other-1', 'admin-user', {
      snapshot: { test: 123 },
    }, true);
    expect(updated).toBeDefined();

    // Admin can remove board
    await service.remove('board-other-1', 'admin-user', true);
    expect(repository.remove).toHaveBeenCalledWith(board);
  });
});
