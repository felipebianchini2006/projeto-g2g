import { apiFetch } from './api-client';

export type CreateCommunityPostPayload = {
  title?: string;
  content: string;
  couponCode?: string;
  pinned?: boolean;
};

export type ToggleLikeResponse = {
  liked: boolean;
  likes: number;
};

export type CommunityCommentResponse = {
  comment: {
    id: string;
    content: string;
    createdAt: string;
    user: { id: string; displayName: string; avatarUrl?: string | null };
  };
  comments: number;
};

const authHeaders = (token: string | null): HeadersInit | undefined =>
  token ? { Authorization: `Bearer ${token}` } : undefined;

export const communityApi = {
  createPost: (token: string | null, payload: CreateCommunityPostPayload) =>
    apiFetch('/community/posts', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  setPinned: (token: string | null, postId: string, pinned: boolean) =>
    apiFetch(`/community/posts/${postId}/pin`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify({ pinned }),
    }),
  deletePost: (token: string | null, postId: string) =>
    apiFetch(`/community/posts/${postId}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),
  toggleLike: (token: string | null, postId: string) =>
    apiFetch<ToggleLikeResponse>(`/community/posts/${postId}/like`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({}),
    }),
  createComment: (token: string | null, postId: string, content: string) =>
    apiFetch<CommunityCommentResponse>(`/community/posts/${postId}/comments`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ content }),
    }),
};
