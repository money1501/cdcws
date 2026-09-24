import { apiClient } from '@/lib/api-client';
import type {
  Board,
  BoardSummary,
  BoardVisibility,
  CreateBoardInput,
  BoardCollaborator,
} from '@shared/board';
import type { BoardPostMedia } from '@shared/board';

export async function listBoards(): Promise<BoardSummary[]> {
  const res = await apiClient.get<BoardSummary[]>('/boards');
  return res.data;
}

export async function getBoard(id: string): Promise<Board> {
  const res = await apiClient.get<Board>(`/boards/${id}`);
  return res.data;
}

export async function createBoard(input: CreateBoardInput): Promise<Board> {
  const res = await apiClient.post<Board>('/boards', input);
  return res.data;
}

export async function updateBoardSnapshot(
  id: string,
  snapshot: Record<string, unknown>,
  thumbnail?: string,
): Promise<Board> {
  const res = await apiClient.patch<Board>(`/boards/${id}/snapshot`, {
    snapshot,
    ...(thumbnail ? { thumbnail } : {}),
  });
  return res.data;
}

export async function renameBoard(id: string, title: string): Promise<Board> {
  const res = await apiClient.patch<Board>(`/boards/${id}/title`, { title });
  return res.data;
}

export async function updateBoardVisibility(
  id: string,
  visibility: BoardVisibility,
): Promise<Board> {
  const res = await apiClient.patch<Board>(`/boards/${id}/visibility`, {
    visibility,
  });
  return res.data;
}

export async function updateBoardPost(
  id: string,
  input: {
    postTitle: string;
    postDetails: string;
    postTags: string[];
    postMedia: BoardPostMedia[];
  },
): Promise<Board> {
  const res = await apiClient.patch<Board>(`/boards/${id}/post`, input);
  return res.data;
}

export async function publishBoard(
  id: string,
  input: {
    postTitle: string;
    postDetails: string;
    postTags: string[];
    postMedia: BoardPostMedia[];
  },
): Promise<Board> {
  const res = await apiClient.post<Board>(`/boards/${id}/publish`, input);
  return res.data;
}

export async function deleteBoard(id: string): Promise<void> {
  await apiClient.delete(`/boards/${id}`);
}

export async function inviteCollaborator(
  boardId: string,
  username: string,
  role: 'editor' | 'viewer' = 'editor',
): Promise<void> {
  await apiClient.post(`/boards/${boardId}/collaborators`, { username, role });
}

export async function removeCollaborator(
  boardId: string,
  userId: string,
): Promise<void> {
  await apiClient.delete(`/boards/${boardId}/collaborators/${userId}`);
}

export async function listCollaborators(
  boardId: string,
): Promise<BoardCollaborator[]> {
  const res = await apiClient.get<BoardCollaborator[]>(`/boards/${boardId}/collaborators`);
  return res.data;
}

export async function listSharedBoards(): Promise<BoardSummary[]> {
  const res = await apiClient.get<BoardSummary[]>('/boards/shared');
  return res.data;
}

export async function generateInviteLink(
  boardId: string,
  role: 'editor' | 'viewer' = 'editor',
): Promise<{ token: string }> {
  const res = await apiClient.post<{ token: string }>(`/boards/${boardId}/collaborators/invite-link`, { role });
  return res.data;
}

export async function joinBoardViaToken(token: string): Promise<{ boardId: string }> {
  const res = await apiClient.post<{ boardId: string }>(`/boards/join/${token}`);
  return res.data;
}
