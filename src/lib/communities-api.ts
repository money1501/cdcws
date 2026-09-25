import { apiClient } from '@/lib/api-client';
import type { Board } from '@shared/board';
import type {
  CommunitySummary,
  CreateCommunityInput,
  UpdateCommunityInput,
  FeedItem,
} from '@shared/community';

export async function listCommunities(query?: string): Promise<CommunitySummary[]> {
  const res = await apiClient.get<CommunitySummary[]>('/communities', {
    params: query ? { q: query } : undefined,
  });
  return res.data;
}

export async function listMyCommunities(): Promise<CommunitySummary[]> {
  const res = await apiClient.get<CommunitySummary[]>('/communities/mine');
  return res.data;
}

export async function getCommunity(slug: string): Promise<CommunitySummary> {
  const res = await apiClient.get<CommunitySummary>(`/communities/${slug}`);
  return res.data;
}

export async function createCommunity(
  input: CreateCommunityInput,
): Promise<CommunitySummary> {
  const res = await apiClient.post<CommunitySummary>('/communities', input);
  return res.data;
}

export async function updateCommunity(
  slug: string,
  input: UpdateCommunityInput,
): Promise<CommunitySummary> {
  const res = await apiClient.patch<CommunitySummary>(`/communities/${slug}`, input);
  return res.data;
}

export async function listCommunityBoards(slug: string): Promise<FeedItem[]> {
  const res = await apiClient.get<FeedItem[]>(`/communities/${slug}/boards`);
  return res.data;
}

export async function joinCommunity(slug: string): Promise<CommunitySummary> {
  const res = await apiClient.put<CommunitySummary>(
    `/communities/${slug}/membership`,
  );
  return res.data;
}

export async function leaveCommunity(slug: string): Promise<CommunitySummary> {
  const res = await apiClient.delete<CommunitySummary>(
    `/communities/${slug}/membership`,
  );
  return res.data;
}

export async function deleteCommunity(slug: string): Promise<void> {
  await apiClient.delete(`/communities/${slug}`);
}

export async function setBoardCommunity(
  boardId: string,
  slug: string | null,
): Promise<Board> {
  const res = await apiClient.put<Board>(`/boards/${boardId}/community`, { slug });
  return res.data;
}

export async function setBoardCommunities(
  boardId: string,
  slugs: string[],
): Promise<Board> {
  const res = await apiClient.put<Board>(`/boards/${boardId}/communities`, {
    slugs,
  });
  return res.data;
}
