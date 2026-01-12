import { apiFetch } from './api-client';

export type UserProfile = {
  id: string;
  email: string;
  fullName: string | null;
  cpf: string | null;
  birthDate: string | null;
  addressZip: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressDistrict: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressCountry: string | null;
};

export type UserProfileUpdate = Partial<
  Omit<UserProfile, 'id' | 'email'>
>;

const authHeaders = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const usersApi = {
  getProfile: (token: string | null) =>
    apiFetch<UserProfile>('/users/me', { headers: authHeaders(token) }),
  updateProfile: (token: string | null, payload: UserProfileUpdate) =>
    apiFetch<UserProfile>('/users/me', {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
};
