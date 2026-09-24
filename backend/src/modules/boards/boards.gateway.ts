import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Server, Socket } from 'socket.io';
import { auth } from '../../common/auth/auth.instance';
import { Board } from '../../database/entities/board.entity';
import { BoardCollaborator } from '../../database/entities/board-collaborator.entity';

export interface ActiveCollaborator {
  socketId: string;
  userId: string;
  name: string;
  role: 'owner' | 'editor' | 'viewer';
}

function roomName(boardId: string) {
  return `board:${boardId}`;
}

@WebSocketGateway({
  namespace: '/boards-sync',
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  },
})
export class BoardsGateway implements OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(BoardsGateway.name);

  /** boardId -> Map<socketId, ActiveCollaborator> */
  private readonly activeRooms = new Map<string, Map<string, ActiveCollaborator>>();
  /** socketId -> boardId */
  private readonly socketBoard = new Map<string, string>();

  constructor(
    @InjectRepository(Board)
    private readonly boardsRepo: Repository<Board>,
    @InjectRepository(BoardCollaborator)
    private readonly collabsRepo: Repository<BoardCollaborator>,
  ) {}

  private async getUser(client: Socket) {
    const cookie = client.handshake.headers.cookie;
    if (!cookie) return null;
    try {
      const session = await auth.api.getSession({
        headers: new Headers({ cookie }),
      });
      return session?.user ?? null;
    } catch {
      return null;
    }
  }

  @SubscribeMessage('join-board')
  async handleJoinBoard(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { boardId?: string },
  ) {
    const boardId = body?.boardId;
    if (!boardId) return { error: 'boardId is required' };

    const user = await this.getUser(client);
    const board = await this.boardsRepo.findOne({ where: { id: boardId } });
    if (!board) return { error: 'Board not found' };

    let role: 'owner' | 'editor' | 'viewer' = 'viewer';
    if (user && board.ownerId === user.id) {
      role = 'owner';
    } else if (user) {
      const collab = await this.collabsRepo.findOne({
        where: { boardId, userId: user.id },
      });
      if (collab) {
        role = collab.role;
      } else if (board.visibility !== 'public') {
        return { error: 'Unauthorized' };
      }
    } else if (board.visibility !== 'public') {
      return { error: 'Unauthorized' };
    }

    const room = roomName(boardId);
    await client.join(room);
    this.socketBoard.set(client.id, boardId);

    const member: ActiveCollaborator = {
      socketId: client.id,
      userId: user?.id ?? 'anonymous',
      name: user?.name || user?.email || 'Anonymous',
      role,
    };

    let members = this.activeRooms.get(boardId);
    if (!members) {
      members = new Map<string, ActiveCollaborator>();
      this.activeRooms.set(boardId, members);
    }
    members.set(client.id, member);

    const activeList = Array.from(members.values());
    // Broadcast updated presence to all clients in the room
    this.server.to(room).emit('board:presence', { activeCollaborators: activeList });

    this.logger.log(`User ${member.name} (${role}) joined board ${boardId} live sync`);
    return { ok: true, role, activeCollaborators: activeList };
  }

  @SubscribeMessage('board:changes')
  handleBoardChanges(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { boardId?: string; diff?: unknown },
  ) {
    const boardId = body?.boardId || this.socketBoard.get(client.id);
    if (!boardId || !body?.diff) return;

    const member = this.activeRooms.get(boardId)?.get(client.id);
    if (member && member.role === 'viewer') {
      // Viewers are read-only and cannot broadcast changes
      return;
    }

    // Broadcast changes to all other clients in the board room
    client.to(roomName(boardId)).emit('board:changes', {
      diff: body.diff,
      fromSocketId: client.id,
      fromUserId: member?.userId,
    });
  }

  @SubscribeMessage('board:cursor')
  handleBoardCursor(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { boardId?: string; point?: { x: number; y: number } },
  ) {
    const boardId = body?.boardId || this.socketBoard.get(client.id);
    if (!boardId || !body?.point) return;

    const member = this.activeRooms.get(boardId)?.get(client.id);
    client.to(roomName(boardId)).emit('board:cursor', {
      fromSocketId: client.id,
      userId: member?.userId,
      name: member?.name,
      point: body.point,
    });
  }

  @SubscribeMessage('leave-board')
  handleLeaveBoard(@ConnectedSocket() client: Socket) {
    this.removeClientFromBoard(client);
  }

  handleDisconnect(client: Socket) {
    this.removeClientFromBoard(client);
  }

  private removeClientFromBoard(client: Socket) {
    const boardId = this.socketBoard.get(client.id);
    if (!boardId) return;

    const members = this.activeRooms.get(boardId);
    if (members) {
      members.delete(client.id);
      if (members.size === 0) {
        this.activeRooms.delete(boardId);
      } else {
        const activeList = Array.from(members.values());
        this.server.to(roomName(boardId)).emit('board:presence', { activeCollaborators: activeList });
      }
    }

    void client.leave(roomName(boardId));
    this.socketBoard.delete(client.id);
    this.logger.log(`Client ${client.id} left board ${boardId} live sync`);
  }
}
