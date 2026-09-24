import { apiClient } from '@/lib/api-client';
import type { PublicUserProfile, UpdateProfileInput, UserProfile, UserSearchResult } from '@shared/user';

export async function getMyProfile(): Promise<UserProfile> {
  const res = await apiClient.get<UserProfile>('/users/me/profile');
  return res.data;
}

export async function updateMyProfile(
  input: UpdateProfileInput,
): Promise<UserProfile> {
  const res = await apiClient.patch<UserProfile>('/users/me/profile', input);
  return res.data;
}

export async function getPublicProfile(userId: string): Promise<PublicUserProfile> {
  const res = await apiClient.get<PublicUserProfile>(`/users/${userId}/profile`);
  return res.data;
}

export async function followUser(userId: string): Promise<void> {
  await apiClient.put(`/users/${userId}/follow`);
}

export async function unfollowUser(userId: string): Promise<void> {
  await apiClient.delete(`/users/${userId}/follow`);
}

export async function getFollowing(userId: string): Promise<any[]> {
  const res = await apiClient.get<any[]>(`/users/${userId}/following`);
  return res.data;
}

export async function getFollowers(userId: string): Promise<any[]> {
  const res = await apiClient.get<any[]>(`/users/${userId}/followers`);
  return res.data;
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const res = await apiClient.get<UserSearchResult[]>('/users/search', {
    params: { q: query },
  });
  return res.data;
}
