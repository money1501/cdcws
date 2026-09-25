import { apiClient } from '@/lib/api-client';
import type { Board } from '@shared/board';
import type {
  Comment,
  CreateCommentInput,
  FeedItem,
  FeedItemDetail,
  VoteResult,
} from '@shared/community';

export async function listCommunityFeed(query?: string): Promise<FeedItem[]> {
  const res = await apiClient.get<FeedItem[]>('/community/boards', {
    params: query ? { q: query } : undefined,
  });
  return res.data;
}

export async function listSavedBoards(): Promise<FeedItem[]> {
  const res = await apiClient.get<FeedItem[]>('/community/boards/saved');
  return res.data;
}

export async function getCommunityBoard(id: string): Promise<FeedItemDetail> {
  const res = await apiClient.get<FeedItemDetail>(`/community/boards/${id}`);
  return res.data;
}

export async function duplicateBoard(id: string): Promise<Board> {
  const res = await apiClient.post<Board>(`/community/boards/${id}/duplicate`);
  return res.data;
}

export async function setVote(id: string, value: 1 | -1): Promise<VoteResult> {
  const res = await apiClient.put<VoteResult>(`/community/boards/${id}/vote`, {
    value,
  });
  return res.data;
}

export async function removeVote(id: string): Promise<VoteResult> {
  const res = await apiClient.delete<VoteResult>(`/community/boards/${id}/vote`);
  return res.data;
}

export async function listComments(boardId: string): Promise<Comment[]> {
  const res = await apiClient.get<Comment[]>(
    `/community/boards/${boardId}/comments`,
  );
  return res.data;
}

export async function addComment(
  boardId: string,
  input: CreateCommentInput,
): Promise<Comment> {
  const res = await apiClient.post<Comment>(
    `/community/boards/${boardId}/comments`,
    input,
  );
  return res.data;
}

export async function listUserBoards(userId: string): Promise<FeedItem[]> {
  const res = await apiClient.get<FeedItem[]>(`/community/boards/user/${userId}`);
  return res.data;
}

export async function deleteComment(
  boardId: string,
  commentId: string,
): Promise<void> {
  await apiClient.delete(`/community/boards/${boardId}/comments/${commentId}`);
}

export async function addBookmark(id: string): Promise<{ bookmarked: true }> {
  const res = await apiClient.put<{ bookmarked: true }>(
    `/community/boards/${id}/bookmark`,
  );
  return res.data;
}

export async function removeBookmark(id: string): Promise<{ bookmarked: false }> {
  const res = await apiClient.delete<{ bookmarked: false }>(
    `/community/boards/${id}/bookmark`,
  );
  return res.data;
}
