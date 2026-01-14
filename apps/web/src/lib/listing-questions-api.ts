import { apiFetch } from './api-client';

export type ListingQuestionUser = {
  id: string;
  fullName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

export type ListingQuestionListing = {
  id: string;
  title: string;
  sellerId?: string | null;
  media?: { id: string; url: string; type: string }[];
};

export type ListingQuestion = {
  id: string;
  listingId: string;
  askedById: string;
  question: string;
  answer?: string | null;
  answeredById?: string | null;
  answeredAt?: string | null;
  createdAt: string;
  updatedAt: string;
  askedBy?: ListingQuestionUser;
  answeredBy?: ListingQuestionUser | null;
  listing?: ListingQuestionListing | null;
};

export type ListingQuestionsResponse = {
  items: ListingQuestion[];
  total: number;
  skip?: number;
  take?: number;
};

const authHeaders = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

const withPagination = (path: string, skip?: number, take?: number) => {
  const params = new URLSearchParams();
  if (typeof skip === 'number') {
    params.set('skip', `${skip}`);
  }
  if (typeof take === 'number') {
    params.set('take', `${take}`);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
};

const withQuery = (
  path: string,
  query: Record<string, string | undefined>,
  skip?: number,
  take?: number,
) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });
  if (typeof skip === 'number') {
    params.set('skip', `${skip}`);
  }
  if (typeof take === 'number') {
    params.set('take', `${take}`);
  }
  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
};

export const listingQuestionsApi = {
  listPublic: (listingId: string, skip?: number, take?: number) =>
    apiFetch<ListingQuestionsResponse>(
      withPagination(`/public/listings/${listingId}/questions`, skip, take),
    ),

  createQuestion: (token: string | null, listingId: string, text: string) =>
    apiFetch<ListingQuestion>(`/listings/${listingId}/questions`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ question: text }),
    }),

  answerQuestion: (token: string | null, questionId: string, answer: string) =>
    apiFetch<ListingQuestion>(`/listing-questions/${questionId}/answer`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify({ answer }),
    }),

  listSent: (token: string | null, skip?: number, take?: number) =>
    apiFetch<ListingQuestion[]>(
      withQuery('/listing-questions', { scope: 'sent' }, skip, take),
      { headers: authHeaders(token) },
    ),

  listReceived: (token: string | null, skip?: number, take?: number) =>
    apiFetch<ListingQuestion[]>(
      withQuery('/listing-questions', { scope: 'received' }, skip, take),
      { headers: authHeaders(token) },
    ),

  deleteQuestion: (token: string | null, questionId: string) =>
    apiFetch<{ success: boolean }>(`/listing-questions/${questionId}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),
};
