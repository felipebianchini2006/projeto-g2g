import { apiFetch } from './api-client';
import type { RgVerification, RgStatus } from './rg-api';

export type RejectRgInput = {
    reason?: string;
};

const authHeaders = (token: string | null): Record<string, string> =>
    token ? { Authorization: `Bearer ${token}` } : {};

export const adminRgApi = {
    list: (token: string | null, status?: RgStatus) =>
        apiFetch<RgVerification[]>(
            status && status !== 'NOT_SUBMITTED'
                ? `/admin/rg?status=${encodeURIComponent(status)}`
                : '/admin/rg',
            { headers: authHeaders(token) },
        ),

    get: (token: string | null, verificationId: string) =>
        apiFetch<RgVerification>(`/admin/rg/${verificationId}`, {
            headers: authHeaders(token),
        }),

    approve: (token: string | null, verificationId: string) =>
        apiFetch<RgVerification>(`/admin/rg/${verificationId}/approve`, {
            method: 'POST',
            headers: authHeaders(token),
        }),

    reject: (token: string | null, verificationId: string, input: RejectRgInput) =>
        apiFetch<RgVerification>(`/admin/rg/${verificationId}/reject`, {
            method: 'POST',
            headers: authHeaders(token),
            body: JSON.stringify(input),
        }),
};
