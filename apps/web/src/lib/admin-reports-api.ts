import { apiFetch } from './api-client';
import type { ListingReport, ProfileReport, ReportStatus } from './reports-api';

export type UpdateReportInput = {
    status?: ReportStatus;
    adminNote?: string;
};

const authHeaders = (token: string | null): Record<string, string> =>
    token ? { Authorization: `Bearer ${token}` } : {};

export const adminReportsApi = {
    listReports: (token: string | null, status?: ReportStatus) =>
        apiFetch<ListingReport[]>(
            status
                ? `/admin/reports/listings?status=${encodeURIComponent(status)}`
                : '/admin/reports/listings',
            { headers: authHeaders(token) },
        ),

    getReport: (token: string | null, reportId: string) =>
        apiFetch<ListingReport>(`/admin/reports/listings/${reportId}`, {
            headers: authHeaders(token),
        }),

    updateReport: (token: string | null, reportId: string, input: UpdateReportInput) =>
        apiFetch<ListingReport>(`/admin/reports/listings/${reportId}`, {
            method: 'PATCH',
            headers: authHeaders(token),
            body: JSON.stringify(input),
        }),
    listProfileReports: (token: string | null, status?: ReportStatus) =>
        apiFetch<ProfileReport[]>(
            status
                ? `/admin/reports/profiles?status=${encodeURIComponent(status)}`
                : '/admin/reports/profiles',
            { headers: authHeaders(token) },
        ),
    getProfileReport: (token: string | null, reportId: string) =>
        apiFetch<ProfileReport>(`/admin/reports/profiles/${reportId}`, {
            headers: authHeaders(token),
        }),
    updateProfileReport: (token: string | null, reportId: string, input: UpdateReportInput) =>
        apiFetch<ProfileReport>(`/admin/reports/profiles/${reportId}`, {
            method: 'PATCH',
            headers: authHeaders(token),
            body: JSON.stringify(input),
        }),
};
