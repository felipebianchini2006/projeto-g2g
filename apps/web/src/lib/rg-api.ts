import { apiFetch } from './api-client';

export type RgStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_SUBMITTED';

export type RgVerification = {
    id: string;
    userId: string;
    rgNumber: string;
    rgPhotoUrl: string;
    status: RgStatus;
    submittedAt: string;
    reviewedAt?: string | null;
    reviewedByAdminId?: string | null;
    adminReason?: string | null;
    createdAt: string;
    updatedAt: string;
    user?: {
        id: string;
        email: string;
        fullName?: string | null;
        avatarUrl?: string | null;
    } | null;
    reviewedByAdmin?: {
        id: string;
        email: string;
    } | null;
};

export type RgStatusResponse = RgVerification | { status: 'NOT_SUBMITTED' };

const authHeaders = (token: string | null): Record<string, string> =>
    token ? { Authorization: `Bearer ${token}` } : {};

export const rgApi = {
    getStatus: (token: string | null) =>
        apiFetch<RgStatusResponse>('/users/me/rg', {
            headers: authHeaders(token),
        }),

    submit: async (token: string | null, rgNumber: string, file: File) => {
        const formData = new FormData();
        formData.append('rgNumber', rgNumber);
        formData.append('file', file);

        const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
        const response = await fetch(`${baseUrl}/users/me/rg`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Erro ao enviar RG.');
        }

        return response.json() as Promise<RgVerification>;
    },
};
