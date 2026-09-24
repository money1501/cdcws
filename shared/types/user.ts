export interface UserProfile {
  userId: string;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUserProfile extends UserProfile {
  /** Display name from better-auth's user.name */
  name: string;
  /** Email — exposed on the public endpoint but can be hidden in UI */
  email: string;
  followersCount: number;
  followingCount: number;
  /** Whether the currently authenticated user follows this profile (null if unauthenticated or viewing self) */
  isFollowedByMe: boolean | null;
}

export interface FollowSummary {
  userId: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
}

/** Lightweight shape returned by GET /users/search */
export interface UserSearchResult {
  userId: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

export interface UpdateProfileInput {
  username?: string;
  bio?: string;
  avatarUrl?: string;
}
