import { apiFetch } from './api-client';

export type CommunityAuthor = {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
};

export type CommunityPostPublic = {
  id: string;
  title?: string | null;
  content: string;
  couponCode?: string | null;
  pinned: boolean;
  createdAt: string;
  author: CommunityAuthor;
  stats: { likes: number; comments: number };
};

export type CommunityCommentPublic = {
  id: string;
  content: string;
  createdAt: string;
  user: CommunityAuthor;
};

export type CommunityPostsResponse = {
  items: CommunityPostPublic[];
  total: number;
};

export type CommunityCommentsResponse = {
  items: CommunityCommentPublic[];
  total: number;
};

export type CommunityListParams = {
  skip?: number;
  take?: number;
};

const buildQuery = (params?: CommunityListParams) => {
  if (!params) return '';
  const search = new URLSearchParams();
  if (typeof params.skip === 'number') {
    search.set('skip', `${params.skip}`);
  }
  if (typeof params.take === 'number') {
    search.set('take', `${params.take}`);
  }
  return search.toString();
};

export const publicCommunityApi = {
  listUserPosts: (userId: string, params?: CommunityListParams) => {
    const query = buildQuery(params);
    const path = query ? `/public/users/${userId}/posts?${query}` : `/public/users/${userId}/posts`;
    return apiFetch<CommunityPostsResponse>(path);
  },
  listPostComments: (postId: string, params?: CommunityListParams) => {
    const query = buildQuery(params);
    const path = query
      ? `/public/posts/${postId}/comments?${query}`
      : `/public/posts/${postId}/comments`;
    return apiFetch<CommunityCommentsResponse>(path);
  },
};
