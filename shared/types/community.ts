export interface FeedItem {
  id: string;
  title: string;
  boardTitle: string;
  postTitle: string | null;
  postDetails: string | null;
  postTags: string[];
  postMedia: { name: string; type: string; url: string }[];
  ownerId: string;
  ownerName: string;
  thumbnailUrl: string | null;
  visibility?: string;
  anyoneCanEdit?: boolean;
  originalOwnerId?: string | null;
  originalOwnerName?: string | null;
  createdAt: string;
  updatedAt: string;
  score: number;
  myVote: 1 | -1 | null;
  commentCount: number;
  bookmarked: boolean;
}

export interface FeedItemDetail extends FeedItem {
  snapshot: Record<string, unknown>;
}

export interface CommentAuthor {
  id: string;
  name: string;
  email: string;
}

export interface Comment {
  id: string;
  boardId: string;
  userId: string;
  parentCommentId: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  user: CommentAuthor;
}

export interface CreateCommentInput {
  body: string;
  parentCommentId?: string;
}

export interface VoteResult {
  score: number;
  myVote: 1 | -1 | null;
}

export type CommunityRole = 'owner' | 'moderator' | 'member';

/** A named, topic-scoped community — addressed as `d/<slug>`. */
export interface CommunitySummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  memberCount: number;
  boardCount: number;
  joined: boolean;
  role: CommunityRole | null;
  createdAt: string;
}

export interface CreateCommunityInput {
  slug: string;
  name: string;
  description?: string;
  iconUrl?: string;
}

export interface UpdateCommunityInput {
  name?: string;
  description?: string;
  iconUrl?: string;
}

