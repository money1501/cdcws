import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Board, BoardVisibility } from '../../database/entities/board.entity';
import { BoardCommunity } from '../../database/entities/board-community.entity';
import { Community } from '../../database/entities/community.entity';
import {
  CommunityMember,
  CommunityRole,
} from '../../database/entities/community-member.entity';
import { CommunitiesService } from './communities.service';
import { CommunityService } from './community.service';

type MockRepository = Partial<Record<keyof Repository<any>, jest.Mock>>;

function createMockRepository(): MockRepository {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    existsBy: jest.fn(),
    create: jest.fn((entity) => entity),
    save: jest.fn(async (entity) => ({ id: 'comm-1', createdAt: new Date(), ...entity })),
    remove: jest.fn(),
    query: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn(),
  };
}

describe('CommunitiesService', () => {
  let service: CommunitiesService;
  let communitiesRepo: MockRepository;
  let membersRepo: MockRepository;
  let boardsRepo: MockRepository;
  let boardCommunitiesRepo: MockRepository;
  let mockDataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    communitiesRepo = createMockRepository();
    membersRepo = createMockRepository();
    boardsRepo = createMockRepository();
    boardCommunitiesRepo = createMockRepository();
    mockDataSource = {
      transaction: jest.fn(async (cb) => {
        const manager = {
          findOneBy: communitiesRepo.findOneBy,
          createQueryBuilder: jest.fn((entity) => {
            if (entity === BoardCommunity) {
              return {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([{ boardId: 'board-1' }]),
              };
            }
            if (entity === Board) {
              return {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([{ boardId: 'board-2' }]),
              };
            }
            // General update builder
            return {
              update: jest.fn().mockReturnThis(),
              set: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              execute: jest.fn().mockResolvedValue({ affected: 2 }),
            };
          }),
          remove: communitiesRepo.remove,
        };
        return cb(manager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunitiesService,
        {
          provide: getRepositoryToken(Community),
          useValue: communitiesRepo,
        },
        {
          provide: getRepositoryToken(CommunityMember),
          useValue: membersRepo,
        },
        {
          provide: getRepositoryToken(Board),
          useValue: boardsRepo,
        },
        {
          provide: getRepositoryToken(BoardCommunity),
          useValue: boardCommunitiesRepo,
        },
        {
          provide: CommunityService,
          useValue: {
            enrichBoards: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get(CommunitiesService);

    // Default mock setup for summarise
    membersRepo.createQueryBuilder = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ communityId: 'comm-1', count: '1' }]),
    });
    membersRepo.find!.mockResolvedValue([
      { communityId: 'comm-1', userId: 'user-1', role: CommunityRole.OWNER },
    ]);
  });

  describe('create', () => {
    it('generates slug from custom name and assigns owner role', async () => {
      communitiesRepo.existsBy!.mockResolvedValue(false);

      const result = await service.create('user-1', {
        name: 'Anime Enthusiasts',
        description: 'All about anime',
      });

      expect(communitiesRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'anime-enthusiasts',
          name: 'Anime Enthusiasts',
          description: 'All about anime',
          createdBy: 'user-1',
        }),
      );
      expect(membersRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          communityId: 'comm-1',
          userId: 'user-1',
          role: CommunityRole.OWNER,
        }),
      );
      expect(result.slug).toBe('anime-enthusiasts');
      expect(result.name).toBe('Anime Enthusiasts');
    });

    it('auto-generates default name and slug when name is empty', async () => {
      communitiesRepo.existsBy!.mockResolvedValue(false);

      const result = await service.create('user-1', {
        name: '',
      });

      expect(communitiesRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringMatching(/^Community \d+$/),
          slug: expect.stringMatching(/^community-\d+$/),
          createdBy: 'user-1',
        }),
      );
      expect(result.name).toMatch(/^Community \d+$/);
    });

    it('handles slug collisions by adding incrementing suffix', async () => {
      // First check (base slug 'anime') exists, second check ('anime-2') does not exist
      communitiesRepo.existsBy!
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await service.create('user-1', {
        name: 'Anime',
      });

      expect(communitiesRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'anime-2',
          name: 'Anime',
          createdBy: 'user-1',
        }),
      );
      expect(result.slug).toBe('anime-2');
    });
  });

  describe('remove', () => {
    it('updates affected posts to private and removes community in transaction', async () => {
      const mockCommunity = {
        id: 'comm-1',
        slug: 'anime',
        name: 'Anime',
        createdBy: 'user-1',
      };
      communitiesRepo.findOneBy!.mockImplementation((entity, criteria) => {
        if (entity === Community || criteria.slug) return Promise.resolve(mockCommunity);
        if (entity === CommunityMember || criteria.userId) {
          return Promise.resolve({
            communityId: 'comm-1',
            userId: 'user-1',
            role: CommunityRole.OWNER,
          });
        }
        return Promise.resolve(null);
      });

      await service.remove('anime', 'user-1');

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(communitiesRepo.remove).toHaveBeenCalledWith(Community, mockCommunity);
    });

    it('rejects deletion by non-owner / non-admin', async () => {
      const mockCommunity = {
        id: 'comm-1',
        slug: 'anime',
        name: 'Anime',
        createdBy: 'owner-id',
      };
      communitiesRepo.findOneBy!.mockImplementation((entity, criteria) => {
        if (entity === Community || criteria.slug) return Promise.resolve(mockCommunity);
        if (entity === CommunityMember || criteria.userId) {
          return Promise.resolve({
            communityId: 'comm-1',
            userId: 'other-user',
            role: CommunityRole.MEMBER,
          });
        }
        return Promise.resolve(null);
      });

      await expect(service.remove('anime', 'other-user', false)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
