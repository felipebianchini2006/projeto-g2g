'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ExternalLink, Flag, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

import { ApiClientError } from '../../lib/api-client';
import {
    adminReportsApi,
    type UpdateReportInput,
} from '../../lib/admin-reports-api';
import type { ListingReport, ReportStatus, ReportReason } from '../../lib/reports-api';
import { useAuth } from '../auth/auth-provider';
import { AdminShell } from '../admin/admin-shell';
import { NotificationsBell } from '../notifications/notifications-bell';

const statusLabel: Record<ReportStatus, string> = {
    OPEN: 'Aberta',
    REVIEWING: 'Em Análise',
    RESOLVED: 'Resolvida',
    REJECTED: 'Rejeitada',
};

const statusIcon: Record<ReportStatus, React.ReactNode> = {
    OPEN: <AlertTriangle size={14} className="text-yellow-500" />,
    REVIEWING: <Clock size={14} className="text-blue-500" />,
    RESOLVED: <CheckCircle size={14} className="text-green-500" />,
    REJECTED: <XCircle size={14} className="text-red-500" />,
};

const reasonLabel: Record<ReportReason, string> = {
    SCAM: 'Golpe / Fraude',
    PROHIBITED_CONTENT: 'Conteúdo Proibido',
    MISLEADING_DESCRIPTION: 'Descrição Enganosa',
    DUPLICATE: 'Anúncio Duplicado',
    OTHER: 'Outro',
};

const formatDate = (dateStr: string) =>
    new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(dateStr));

export const AdminReportsContent = () => {
    const { user, accessToken, loading } = useAuth();
    const [reports, setReports] = useState<ListingReport[]>([]);
    const [selectedReport, setSelectedReport] = useState<ListingReport | null>(null);
    const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('OPEN');
    const [adminNote, setAdminNote] = useState('');
    const [busyAction, setBusyAction] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const handleError = (err: unknown, fallback: string) => {
        if (err instanceof ApiClientError) {
            setError(err.message);
        } else {
            setError(fallback);
        }
    };

    const loadReports = async () => {
        if (!accessToken) return;
        setBusyAction('load');
        try {
            const data = await adminReportsApi.listReports(
                accessToken,
                statusFilter === 'all' ? undefined : statusFilter,
            );
            setReports(data);
        } catch (err) {
            handleError(err, 'Erro ao carregar denúncias.');
        } finally {
            setBusyAction(null);
        }
    };

    useEffect(() => {
        if (accessToken && user?.role === 'ADMIN') {
            loadReports();
        }
    }, [accessToken, user?.role, statusFilter]);

    const handleStatusUpdate = async (newStatus: ReportStatus) => {
        if (!selectedReport || !accessToken) return;
        setBusyAction(newStatus);
        setError('');
        setNotice('');
        try {
            const input: UpdateReportInput = { status: newStatus };
            if (adminNote.trim()) {
                input.adminNote = adminNote.trim();
            }
            const updated = await adminReportsApi.updateReport(accessToken, selectedReport.id, input);
            setNotice(`Denúncia marcada como ${statusLabel[newStatus]}.`);
            setSelectedReport(updated);
            loadReports();
        } catch (err) {
            handleError(err, 'Erro ao atualizar denúncia.');
        } finally {
            setBusyAction(null);
        }
    };

    const handleSaveNote = async () => {
        if (!selectedReport || !accessToken || !adminNote.trim()) return;
        setBusyAction('note');
        setError('');
        try {
            const updated = await adminReportsApi.updateReport(accessToken, selectedReport.id, {
                adminNote: adminNote.trim(),
            });
            setNotice('Nota salva.');
            setSelectedReport(updated);
        } catch (err) {
            handleError(err, 'Erro ao salvar nota.');
        } finally {
            setBusyAction(null);
        }
    };

    if (loading) {
        return (
            <section className="bg-white px-6 py-12">
                <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-4 text-sm text-meow-muted">
                    Carregando sessão...
                </div>
            </section>
        );
    }

    if (!user || user.role !== 'ADMIN') {
        return (
            <section className="bg-white px-6 py-12">
                <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
                    <p className="text-sm text-meow-muted">Acesso restrito ao admin.</p>
                    <Link
                        className="mt-4 inline-flex rounded-full border border-meow-red/30 px-6 py-2 text-sm font-bold text-meow-deep"
                        href="/conta"
                    >
                        Voltar para conta
                    </Link>
                </div>
            </section>
        );
    }

    return (
        <AdminShell
            breadcrumbs={[
                { label: 'Inicio', href: '/' },
                { label: 'Admin', href: '/admin/atendimento' },
                { label: 'Denúncias' },
            ]}
        >
            <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-black text-meow-charcoal">Denúncias de Anúncios</h1>
                        <p className="mt-2 text-sm text-meow-muted">
                            Gerencie denúncias enviadas pelos usuários.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <NotificationsBell />
                        <Link
                            className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
                            href="/conta"
                        >
                            Voltar para conta
                        </Link>
                    </div>
                </div>
            </div>

            {error ? <div className="state-card error">{error}</div> : null}
            {notice ? <div className="state-card success">{notice}</div> : null}

            <div className="admin-listings-grid">
                <div className="order-card">
                    <div className="panel-header">
                        <h2>Denúncias</h2>
                        <div className="form-field">
                            <span className="summary-label">Status</span>
                            <select
                                className="form-input"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as ReportStatus | 'all')}
                            >
                                <option value="all">Todas</option>
                                <option value="OPEN">Abertas</option>
                                <option value="REVIEWING">Em Análise</option>
                                <option value="RESOLVED">Resolvidas</option>
                                <option value="REJECTED">Rejeitadas</option>
                            </select>
                        </div>
                    </div>

                    {busyAction === 'load' ? (
                        <div className="state-card">Carregando denúncias...</div>
                    ) : null}

                    {reports.length === 0 && busyAction !== 'load' ? (
                        <div className="state-card">Nenhuma denúncia encontrada.</div>
                    ) : null}

                    <div className="support-list">
                        {reports.map((report) => (
                            <button
                                className={`support-row ${selectedReport?.id === report.id ? 'bg-meow-red/5' : ''}`}
                                key={report.id}
                                type="button"
                                onClick={() => {
                                    setSelectedReport(report);
                                    setAdminNote(report.adminNote ?? '');
                                    setError('');
                                    setNotice('');
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <Flag size={14} className="text-meow-muted" />
                                    <div>
                                        <strong className="text-sm">{report.listing?.title ?? 'Anúncio removido'}</strong>
                                        <span className="auth-helper block text-xs">
                                            {reasonLabel[report.reason]} • {report.reporter?.email ?? 'Anônimo'}
                                        </span>
                                    </div>
                                </div>
                                <div className="ticket-meta">
                                    <span className="flex items-center gap-1 text-xs">
                                        {statusIcon[report.status]}
                                        {statusLabel[report.status]}
                                    </span>
                                    <small>{formatDate(report.createdAt)}</small>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="order-card">
                    <div className="panel-header">
                        <h2>Detalhes</h2>
                    </div>

                    {!selectedReport ? (
                        <div className="state-card">Selecione uma denúncia para ver detalhes.</div>
                    ) : (
                        <>
                            <div className="order-summary">
                                <div className="summary-row">
                                    <span className="summary-label">ID</span>
                                    <span className="summary-value font-mono text-xs">{selectedReport.id}</span>
                                </div>
                                <div className="summary-row">
                                    <span className="summary-label">Motivo</span>
                                    <span className="summary-value">{reasonLabel[selectedReport.reason]}</span>
                                </div>
                                <div className="summary-row">
                                    <span className="summary-label">Status</span>
                                    <span className="summary-value flex items-center gap-1">
                                        {statusIcon[selectedReport.status]}
                                        {statusLabel[selectedReport.status]}
                                    </span>
                                </div>
                                <div className="summary-row">
                                    <span className="summary-label">Data</span>
                                    <span className="summary-value">{formatDate(selectedReport.createdAt)}</span>
                                </div>
                                <div className="summary-row">
                                    <span className="summary-label">Denunciante</span>
                                    <span className="summary-value">
                                        {selectedReport.reporter?.email ?? 'N/A'}
                                    </span>
                                </div>
                                {selectedReport.reviewedByAdmin ? (
                                    <div className="summary-row">
                                        <span className="summary-label">Analisado por</span>
                                        <span className="summary-value">
                                            {selectedReport.reviewedByAdmin.email}
                                        </span>
                                    </div>
                                ) : null}
                                {selectedReport.resolvedAt ? (
                                    <div className="summary-row">
                                        <span className="summary-label">Resolvido em</span>
                                        <span className="summary-value">
                                            {formatDate(selectedReport.resolvedAt)}
                                        </span>
                                    </div>
                                ) : null}
                            </div>

                            {selectedReport.listing ? (
                                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-meow-charcoal">
                                                {selectedReport.listing.title}
                                            </p>
                                            <p className="text-xs text-meow-muted">
                                                Vendedor: {selectedReport.listing.seller?.email ?? selectedReport.listing.sellerId}
                                            </p>
                                        </div>
                                        <Link
                                            href={`/anuncios/${selectedReport.listing.id}`}
                                            target="_blank"
                                            className="flex items-center gap-1 rounded-full border border-meow-red/30 px-3 py-1 text-xs font-bold text-meow-deep hover:bg-meow-50"
                                        >
                                            <ExternalLink size={12} />
                                            Ver anúncio
                                        </Link>
                                    </div>
                                </div>
                            ) : null}

                            {selectedReport.message ? (
                                <div className="state-card info mt-4">
                                    <p className="text-xs font-bold text-meow-muted mb-1">Mensagem do denunciante:</p>
                                    <p className="text-sm">{selectedReport.message}</p>
                                </div>
                            ) : null}

                            <label className="form-field mt-4">
                                Nota do admin
                                <textarea
                                    className="form-textarea"
                                    rows={3}
                                    value={adminNote}
                                    onChange={(e) => setAdminNote(e.target.value)}
                                    placeholder="Adicione uma nota sobre esta denúncia..."
                                />
                            </label>
                            <button
                                className="ghost-button mt-2"
                                type="button"
                                onClick={handleSaveNote}
                                disabled={busyAction === 'note' || !adminNote.trim()}
                            >
                                {busyAction === 'note' ? 'Salvando...' : 'Salvar nota'}
                            </button>

                            <div className="order-actions mt-6">
                                <button
                                    className="ghost-button"
                                    type="button"
                                    onClick={() => handleStatusUpdate('REVIEWING')}
                                    disabled={busyAction === 'REVIEWING' || selectedReport.status === 'REVIEWING'}
                                >
                                    {busyAction === 'REVIEWING' ? '...' : 'Marcar em Análise'}
                                </button>
                                <button
                                    className="admin-primary-button"
                                    type="button"
                                    onClick={() => handleStatusUpdate('RESOLVED')}
                                    disabled={busyAction === 'RESOLVED' || selectedReport.status === 'RESOLVED'}
                                >
                                    {busyAction === 'RESOLVED' ? '...' : 'Marcar Resolvida'}
                                </button>
                                <button
                                    className="ghost-button text-red-600 hover:bg-red-50"
                                    type="button"
                                    onClick={() => handleStatusUpdate('REJECTED')}
                                    disabled={busyAction === 'REJECTED' || selectedReport.status === 'REJECTED'}
                                >
                                    {busyAction === 'REJECTED' ? '...' : 'Rejeitar'}
                                </button>
                            </div>

                            <p className="mt-4 text-xs text-meow-muted">
                                Para suspender o anúncio, acesse a{' '}
                                <Link href="/admin/anuncios" className="text-meow-deep underline">
                                    moderação de anúncios
                                </Link>
                                .
                            </p>
                        </>
                    )}
                </div>
            </div>
        </AdminShell>
    );
};
