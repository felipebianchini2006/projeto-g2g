import { apiFetch } from './api-client';

export type ReportReason = 'SCAM' | 'PROHIBITED_CONTENT' | 'MISLEADING_DESCRIPTION' | 'DUPLICATE' | 'OTHER';
export type ReportStatus = 'OPEN' | 'REVIEWING' | 'RESOLVED' | 'REJECTED';

export type CreateReportInput = {
    reason: ReportReason;
    message?: string;
};

export type ListingReport = {
    id: string;
    listingId: string;
    reporterId: string;
    reason: ReportReason;
    message?: string | null;
    status: ReportStatus;
    reviewedByAdminId?: string | null;
    adminNote?: string | null;
    resolvedAt?: string | null;
    createdAt: string;
    updatedAt: string;
    listing?: {
        id: string;
        title: string;
        status: string;
        sellerId: string;
        priceCents?: number;
        currency?: string;
        seller?: { id: string; email: string } | null;
    } | null;
    reporter?: { id: string; email: string } | null;
    reviewedByAdmin?: { id: string; email: string } | null;
};

export type ProfileReport = {
    id: string;
    userId: string;
    reporterId: string;
    reason: ReportReason;
    message?: string | null;
    status: ReportStatus;
    reviewedByAdminId?: string | null;
    adminNote?: string | null;
    resolvedAt?: string | null;
    createdAt: string;
    updatedAt: string;
    user?: { id: string; email: string; fullName?: string | null } | null;
    reporter?: { id: string; email: string } | null;
    reviewedByAdmin?: { id: string; email: string } | null;
};

const authHeaders = (token: string | null): Record<string, string> =>
    token ? { Authorization: `Bearer ${token}` } : {};

export const reportsApi = {
    createReport: (token: string | null, listingId: string, input: CreateReportInput) =>
        apiFetch<ListingReport>(`/listings/${listingId}/report`, {
            method: 'POST',
            headers: authHeaders(token),
            body: JSON.stringify(input),
        }),
    createProfileReport: (token: string | null, userId: string, input: CreateReportInput) =>
        apiFetch<ProfileReport>(`/users/${userId}/report`, {
            method: 'POST',
            headers: authHeaders(token),
            body: JSON.stringify(input),
        }),
};
