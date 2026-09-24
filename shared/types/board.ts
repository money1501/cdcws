export type BoardVisibility = 'private' | 'public';

export interface BoardPostMedia {
  name: string;
  type: string;
  url: string;
}

export interface BoardSummary {
  id: string;
  ownerId: string;
  title: string;
  publishedFromId: string | null;
  postTitle: string | null;
  postDetails: string | null;
  postTags: string[];
  postMedia: BoardPostMedia[];
  visibility: BoardVisibility;
  /** Community the board is filed under, or null when unfiled. */
  communityId: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Board extends BoardSummary {
  snapshot: Record<string, unknown>;
}

export interface CreateBoardInput {
  title: string;
}

export interface UpdateBoardSnapshotInput {
  snapshot: Record<string, unknown>;
}

export interface UpdateBoardVisibilityInput {
  visibility: BoardVisibility;
}

export interface BoardCollaborator {
  userId: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  role: 'editor' | 'viewer';
}
