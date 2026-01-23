'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
    ExternalLink,
    Flag,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock,
    ChevronLeft,
    MessageSquare,
    Filter
} from 'lucide-react';

import { ApiClientError } from '../../lib/api-client';
import {
    adminReportsApi,
    type UpdateReportInput,
} from '../../lib/admin-reports-api';
import type { ListingReport, ProfileReport, ReportStatus, ReportReason } from '../../lib/reports-api';
import { useAuth } from '../auth/auth-provider';
import { AdminShell } from '../admin/admin-shell';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

const statusLabel: Record<ReportStatus, string> = {
    OPEN: 'Aberta',
    REVIEWING: 'Em Análise',
    RESOLVED: 'Resolvida',
    REJECTED: 'Rejeitada',
};

const statusBadgeVariant: Record<ReportStatus, 'warning' | 'info' | 'success' | 'danger'> = {
    OPEN: 'warning',
    REVIEWING: 'info',
    RESOLVED: 'success',
    REJECTED: 'danger',
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
    const [reportScope, setReportScope] = useState<'listings' | 'profiles'>('listings');
    const [reports, setReports] = useState<Array<ListingReport | ProfileReport>>([]);
    const [selectedReport, setSelectedReport] = useState<ListingReport | ProfileReport | null>(null);
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
            const data = reportScope === 'listings'
                ? await adminReportsApi.listReports(
                    accessToken,
                    statusFilter === 'all' ? undefined : statusFilter,
                )
                : await adminReportsApi.listProfileReports(
                    accessToken,
                    statusFilter === 'all' ? undefined : statusFilter,
                );
            setReports(data);
            if (data.length === 0) {
                setSelectedReport(null);
                return;
            }
            if (!selectedReport || !data.some((report) => report.id === selectedReport.id)) {
                setSelectedReport(data[0] ?? null);
            }
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
    }, [accessToken, reportScope, user?.role, statusFilter]);

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
            const updated = reportScope === 'listings'
                ? await adminReportsApi.updateReport(accessToken, selectedReport.id, input)
                : await adminReportsApi.updateProfileReport(accessToken, selectedReport.id, input);
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
            const updated = reportScope === 'listings'
                ? await adminReportsApi.updateReport(accessToken, selectedReport.id, {
                    adminNote: adminNote.trim(),
                })
                : await adminReportsApi.updateProfileReport(accessToken, selectedReport.id, {
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

    const isListingReport = (report: ListingReport | ProfileReport): report is ListingReport =>
        'listingId' in report;

    const getReportTitle = (report: ListingReport | ProfileReport) =>
        isListingReport(report)
            ? report.listing?.title ?? 'Anúncio'
            : report.user?.fullName ?? report.user?.email ?? 'Perfil';

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
                        className="mt-4 inline-flex rounded-full bg-meow-linear px-6 py-2 text-sm font-bold text-white transition hover:opacity-90"
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
                { label: 'Início', href: '/' },
                { label: 'Admin', href: '/admin/atendimento' },
                { label: 'Denúncias' },
            ]}
        >
            <Card className="rounded-2xl border border-meow-red/20 p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-black text-meow-charcoal">Denúncias</h1>
                        <p className="mt-2 text-sm text-meow-muted">
                            Gerencie denúncias enviadas pelos usuários.
                        </p>
                    </div>
                    <Link
                        href="/conta"
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition hover:text-meow-deep hover:shadow-md"
                    >
                        <ChevronLeft size={24} />
                    </Link>
                </div>
            </Card>

            {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-in fade-in slide-in-from-top-2">
                    {error}
                </div>
            ) : null}
            {notice ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 animate-in fade-in slide-in-from-top-2">
                    {notice}
                </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    className={`rounded-full border px-4 py-2 text-xs font-bold transition ${reportScope === 'listings'
                        ? 'border-meow-red/30 bg-meow-red/10 text-meow-deep'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-meow-red/30 hover:text-meow-deep'
                        }`}
                    onClick={() => {
                        setReportScope('listings');
                        setSelectedReport(null);
                        setAdminNote('');
                    }}
                >
                    Anúncios
                </button>
                <button
                    type="button"
                    className={`rounded-full border px-4 py-2 text-xs font-bold transition ${reportScope === 'profiles'
                        ? 'border-meow-red/30 bg-meow-red/10 text-meow-deep'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-meow-red/30 hover:text-meow-deep'
                        }`}
                    onClick={() => {
                        setReportScope('profiles');
                        setSelectedReport(null);
                        setAdminNote('');
                    }}
                >
                    Perfis
                </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_450px]">
                {/* Left Column: List */}
                <div className="space-y-4">
                    <Card className="rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center gap-4">
                            <label className="grid gap-1.5 text-xs font-semibold text-slate-500 flex-1">
                                <span className="flex items-center gap-1.5">
                                    <Filter size={12} /> Status da Denúncia
                                </span>
                                <div className="relative">
                                    <select
                                        className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 pr-8 text-sm font-medium text-slate-700 outline-none focus:border-meow-red/50 focus:ring-4 focus:ring-meow-red/10"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value as ReportStatus | 'all')}
                                    >
                                        <option value="all">Todas</option>
                                        <option value="OPEN">Abertas</option>
                                        <option value="REVIEWING">Em Análise</option>
                                        <option value="RESOLVED">Resolvidas</option>
                                        <option value="REJECTED">Rejeitadas</option>
                                    </select>
                                    <div className="absolute right-3 top-3 pointer-events-none">
                                        <Filter size={14} className="text-slate-400" />
                                    </div>
                                </div>
                            </label>
                        </div>
                    </Card>

                    <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50 shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3">
                            <h2 className="text-sm font-bold text-meow-charcoal">Denúncias</h2>
                            <span className="text-xs font-medium text-meow-muted">
                                {reports.length} encontradas
                            </span>
                        </div>

                        <div className="max-h-[600px] overflow-y-auto p-2 scrollbar-thin">
                            {reports.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-meow-muted">
                                    <Flag size={48} className="text-slate-200 mb-3" />
                                    <p>Nenhuma denúncia encontrada.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {reports.map((report) => {
                                        const isSelected = selectedReport?.id === report.id;
                                        return (
                                            <button
                                                key={report.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedReport(report);
                                                    setAdminNote(report.adminNote ?? '');
                                                    setError('');
                                                    setNotice('');
                                                }}
                                                className={`group flex w-full flex-col gap-2 rounded-xl border p-4 text-left transition-all ${isSelected
                                                    ? 'border-meow-red/30 bg-meow-red/5 shadow-sm ring-1 ring-meow-red/20'
                                                    : 'border-slate-100 bg-white hover:border-meow-red/20 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <div className="flex w-full items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${isSelected ? 'bg-meow-deep text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-meow-deep'}`}>
                                                            <Flag size={18} />
                                                        </div>
                                                        <div>
                                                            <p className={`text-sm font-bold line-clamp-1 ${isSelected ? 'text-meow-deep' : 'text-slate-700'}`}>
                                                                {getReportTitle(report)}
                                                            </p>
                                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                                <span>{reasonLabel[report.reason]}</span>
                                                                <span>•</span>
                                                                <span>{isListingReport(report) ? 'Anúncio' : 'Perfil'}</span>
                                                                <span>•</span>
                                                                <span>{report.reporter?.email ?? 'Anônimo'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Badge variant={statusBadgeVariant[report.status]} size="sm">
                                                        {statusLabel[report.status]}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 pl-13">
                                                    <Clock size={10} /> {formatDate(report.createdAt)}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Right Column: Details */}
                <div className="relative">
                    <div className="sticky top-6">
                        {!selectedReport ? (
                            <Card className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-400">
                                <Flag size={48} className="mb-4 text-slate-200" />
                                <p>Selecione uma denúncia para analisar.</p>
                            </Card>
                        ) : (
                            <Card className="overflow-hidden rounded-2xl border border-slate-200 shadow-card">
                                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-meow-deep shadow-sm">
                                            <AlertTriangle size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <h2 className="text-lg font-black text-meow-charcoal">Detalhes da Denúncia</h2>
                                            <p className="text-xs text-meow-muted">ID: {selectedReport.id}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* Summary Grid */}
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="space-y-1">
                                            <span className="text-xs font-semibold text-slate-500 block">Motivo</span>
                                            <span className="font-bold text-slate-800 block">{reasonLabel[selectedReport.reason]}</span>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs font-semibold text-slate-500 block">Status Atual</span>
                                            <Badge variant={statusBadgeVariant[selectedReport.status]}>{statusLabel[selectedReport.status]}</Badge>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs font-semibold text-slate-500 block">Criado em</span>
                                            <span className="text-slate-700 block">{formatDate(selectedReport.createdAt)}</span>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs font-semibold text-slate-500 block">Denunciante</span>
                                            <span className="text-slate-700 block truncate text-xs" title={selectedReport.reporter?.email}>{selectedReport.reporter?.email ?? 'Anônimo'}</span>
                                        </div>
                                    </div>

                                    {'listingId' in selectedReport && selectedReport.listing ? (
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="overflow-hidden">
                                                    <p className="text-xs font-bold text-meow-muted uppercase mb-1">Anúncio denunciado</p>
                                                    <p className="font-bold text-slate-800 truncate">{selectedReport.listing.title}</p>
                                                    <p className="text-xs text-slate-500">Vendedor: {selectedReport.listing.seller?.email}</p>
                                                </div>
                                                <Link
                                                    href={`/anuncios/${selectedReport.listing.id}`}
                                                    target="_blank"
                                                    className="ml-2 inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                                                >
                                                    <ExternalLink size={14} className="mr-1.5" /> Ver
                                                </Link>
                                            </div>
                                        </div>
                                    ) : null}

                                    {'userId' in selectedReport ? (
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="overflow-hidden">
                                                    <p className="text-xs font-bold text-meow-muted uppercase mb-1">Perfil denunciado</p>
                                                    <p className="font-bold text-slate-800 truncate">{selectedReport.user?.fullName ?? selectedReport.user?.email ?? 'Perfil'}</p>
                                                    <p className="text-xs text-slate-500">Email: {selectedReport.user?.email ?? 'Não informado'}</p>
                                                </div>
                                                {selectedReport.user?.id ? (
                                                    <Link
                                                        href={`/perfil/${selectedReport.user.id}`}
                                                        target="_blank"
                                                        className="ml-2 inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                                                    >
                                                        <ExternalLink size={14} className="mr-1.5" /> Ver
                                                    </Link>
                                                ) : null}
                                            </div>
                                        </div>
                                    ) : null}


                                    {selectedReport.message && (
                                        <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                                            <p className="text-xs font-bold text-amber-800 flex items-center gap-2 mb-2">
                                                <MessageSquare size={14} /> Mensagem do Denunciante
                                            </p>
                                            <p className="text-sm text-amber-900 italic">"{selectedReport.message}"</p>
                                        </div>
                                    )}

                                    <div className="space-y-2 border-t border-slate-100 pt-4">
                                        <label className="text-xs font-bold text-meow-muted">Nota interna do Admin</label>
                                        <Textarea
                                            placeholder="Adicione observações sobre a análise..."
                                            value={adminNote}
                                            onChange={(e) => setAdminNote(e.target.value)}
                                            className="bg-white min-h-[80px]"
                                        />
                                        <div className="flex justify-end">
                                            <Button size="sm" variant="ghost" onClick={handleSaveNote} disabled={busyAction === 'note' || !adminNote.trim()}>
                                                {busyAction === 'note' ? 'Salvando...' : 'Salvar Nota'}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-100 pt-4 grid gap-3">
                                        <p className="text-xs font-bold text-meow-muted uppercase text-center">Ações</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button
                                                variant="secondary"
                                                className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                                                onClick={() => handleStatusUpdate('REVIEWING')}
                                                disabled={busyAction === 'REVIEWING' || selectedReport.status === 'REVIEWING'}
                                            >
                                                Em Análise
                                            </Button>
                                            <Button
                                                className="w-full bg-emerald-600 hover:bg-emerald-700"
                                                onClick={() => handleStatusUpdate('RESOLVED')}
                                                disabled={busyAction === 'RESOLVED' || selectedReport.status === 'RESOLVED'}
                                            >
                                                <CheckCircle size={16} className="mr-2" /> Resolver
                                            </Button>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            className="w-full text-red-500 hover:bg-red-50 hover:text-red-700"
                                            onClick={() => handleStatusUpdate('REJECTED')}
                                            disabled={busyAction === 'REJECTED' || selectedReport.status === 'REJECTED'}
                                        >
                                            <XCircle size={16} className="mr-2" /> Rejeitar Denúncia (Falso Positivo)
                                        </Button>
                                    </div>

                                    {'listingId' in selectedReport ? (
                                        <p className="text-[10px] text-center text-slate-400">
                                            Para suspender o anúncio, acesse a <Link href="/admin/vendas" className="text-meow-deep hover:underline">moderação de anúncios</Link>.
                                        </p>
                                    ) : (
                                        <p className="text-[10px] text-center text-slate-400">
                                            Para bloquear um perfil, acesse a gestão de usuários.
                                        </p>
                                    )}
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </AdminShell>
    );
};
