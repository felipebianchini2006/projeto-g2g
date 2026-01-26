'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
    CheckCircle,
    Clock,
    Eye,
    FileCheck,
    XCircle,
    ChevronLeft,
    User,
    Calendar,
    ShieldAlert,
    Search,
    ZoomIn,
} from 'lucide-react';

import { ApiClientError } from '../../lib/api-client';
import { adminRgApi } from '../../lib/admin-rg-api';
import type { RgVerification, RgStatus } from '../../lib/rg-api';
import { hasAdminPermission } from '../../lib/admin-permissions';
import { useAuth } from '../auth/auth-provider';
import { AdminShell } from '../admin/admin-shell';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

const statusLabel: Record<Exclude<RgStatus, 'NOT_SUBMITTED'>, string> = {
    PENDING: 'Pendente',
    APPROVED: 'Aprovado',
    REJECTED: 'Reprovado',
};

const statusBadgeVariant: Record<
    Exclude<RgStatus, 'NOT_SUBMITTED'>,
    'warning' | 'success' | 'danger'
> = {
    PENDING: 'warning',
    APPROVED: 'success',
    REJECTED: 'danger',
};

const formatDate = (dateStr: string) =>
    new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(dateStr));

export const AdminRgContent = () => {
    const { user, accessToken, loading } = useAuth();
    const [verifications, setVerifications] = useState<RgVerification[]>([]);
    const [selectedVerification, setSelectedVerification] = useState<RgVerification | null>(null);
    const [statusFilter, setStatusFilter] = useState<RgStatus | 'all'>('PENDING');
    const [rejectReason, setRejectReason] = useState('');
    const [busyAction, setBusyAction] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const handleError = (err: unknown, fallback: string) => {
        if (err instanceof ApiClientError) {
            setError(err.message);
        } else {
            setError(fallback);
        }
    };

    const loadVerifications = async () => {
        if (!accessToken) return;
        setBusyAction('load');
        try {
            const data = await adminRgApi.list(
                accessToken,
                statusFilter === 'all' ? undefined : (statusFilter as RgStatus),
            );
            setVerifications(data);
            if (data.length > 0 && !selectedVerification) {
                setSelectedVerification(data[0]);
            }
        } catch (err) {
            handleError(err, 'Erro ao carregar verificações.');
        } finally {
            setBusyAction(null);
        }
    };

    useEffect(() => {
        if (accessToken && hasAdminPermission(user, 'admin.rg')) {
            loadVerifications();
        }
    }, [accessToken, user?.role, user?.adminPermissions, statusFilter]);

    const handleApprove = async () => {
        if (!selectedVerification || !accessToken) return;
        setBusyAction('approve');
        setError('');
        setNotice('');
        try {
            const updated = await adminRgApi.approve(accessToken, selectedVerification.id);
            setNotice('RG aprovado com sucesso!');
            setSelectedVerification(updated);
            loadVerifications();
        } catch (err) {
            handleError(err, 'Erro ao aprovar RG.');
        } finally {
            setBusyAction(null);
        }
    };

    const handleReject = async () => {
        if (!selectedVerification || !accessToken) return;
        setBusyAction('reject');
        setError('');
        setNotice('');
        try {
            const updated = await adminRgApi.reject(accessToken, selectedVerification.id, {
                reason: rejectReason.trim() || undefined,
            });
            setNotice('RG reprovado.');
            setSelectedVerification(updated);
            setRejectReason('');
            loadVerifications();
        } catch (err) {
            handleError(err, 'Erro ao reprovar RG.');
        } finally {
            setBusyAction(null);
        }
    };

    const apiBaseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

    if (loading) {
        return (
            <section className="bg-white px-6 py-12">
                <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-4 text-sm text-meow-muted">
                    Carregando sessão...
                </div>
            </section>
        );
    }

    if (!user || !hasAdminPermission(user, 'admin.rg')) {
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
                { label: 'Inicio', href: '/' },
                { label: 'Admin', href: '/admin/atendimento' },
                { label: 'Verificação de RG' },
            ]}
        >
            <Card className="rounded-2xl border border-meow-red/20 p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-black text-meow-charcoal">Verificação de RG</h1>
                        <p className="mt-2 text-sm text-meow-muted">
                            Analise e aprove/reprove documentos de identidade.
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

            <div className="grid gap-6 lg:grid-cols-[1fr_450px]">
                {/* Left Column: List */}
                <div className="space-y-4">
                    <Card className="rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <h2 className="text-sm font-bold uppercase tracking-wide text-meow-muted mb-4">
                            Filtros
                        </h2>
                        <div className="flex items-center gap-4">
                            <label className="grid gap-1.5 text-xs font-semibold text-slate-500 flex-1">
                                <span className="flex items-center gap-1.5">
                                    <Search size={12} /> Status da Solicitação
                                </span>
                                <div className="relative">
                                    <select
                                        className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 pr-8 text-sm font-medium text-slate-700 outline-none focus:border-meow-red/50 focus:ring-4 focus:ring-meow-red/10"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value as RgStatus | 'all')}
                                    >
                                        <option value="all">Todas</option>
                                        <option value="PENDING">Pendentes</option>
                                        <option value="APPROVED">Aprovadas</option>
                                        <option value="REJECTED">Reprovadas</option>
                                    </select>
                                    <div className="absolute right-3 top-3 pointer-events-none">
                                        <Clock size={14} className="text-slate-400" />
                                    </div>
                                </div>
                            </label>
                        </div>
                    </Card>

                    <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50 shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3">
                            <h2 className="text-sm font-bold text-meow-charcoal">Solicitações</h2>
                            <span className="text-xs font-medium text-meow-muted">
                                {verifications.length} encontrados
                            </span>
                        </div>

                        <div className="max-h-[600px] overflow-y-auto p-2 scrollbar-thin">
                            {verifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-meow-muted">
                                    <FileCheck size={48} className="text-slate-200 mb-3" />
                                    <p>Nenhuma solicitação encontrada.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {verifications.map((item) => {
                                        const isSelected = selectedVerification?.id === item.id;
                                        const status = item.status as Exclude<RgStatus, 'NOT_SUBMITTED'>;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedVerification(item);
                                                    setRejectReason('');
                                                    setError('');
                                                    setNotice('');
                                                }}
                                                className={`group flex w-full flex-col gap-3 rounded-xl border p-4 text-left transition-all ${isSelected
                                                        ? 'border-meow-red/30 bg-meow-red/5 shadow-sm ring-1 ring-meow-red/20'
                                                        : 'border-slate-100 bg-white hover:border-meow-red/20 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <div className="flex w-full items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${isSelected
                                                                    ? 'bg-meow-deep text-white'
                                                                    : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-meow-deep group-hover:shadow-sm'
                                                                }`}
                                                        >
                                                            <User size={18} />
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <p
                                                                className={`text-sm font-bold ${isSelected ? 'text-meow-deep' : 'text-slate-700'}`}
                                                            >
                                                                {item.user?.fullName || item.user?.email || 'Usuário'}
                                                            </p>
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <span className="font-mono text-slate-500">
                                                                    RG: {item.rgNumber}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Badge variant={statusBadgeVariant[status]} size="sm">
                                                        {statusLabel[status]}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 pl-13">
                                                    <Clock size={10} />{' '}
                                                    {new Date(item.submittedAt).toLocaleDateString()}
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
                        {!selectedVerification ? (
                            <Card className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-400">
                                <FileCheck size={48} className="mb-4 text-slate-200" />
                                <p>Selecione uma solicitação para analisar.</p>
                            </Card>
                        ) : (
                            <Card className="overflow-hidden rounded-2xl border border-slate-200 shadow-card">
                                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-meow-deep shadow-sm">
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-black text-meow-charcoal">
                                                Analise de Documento
                                            </h2>
                                            <p className="text-xs text-meow-muted">ID: {selectedVerification.id}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* Status Banner */}
                                    <div
                                        className={`rounded-xl border p-4 flex items-start gap-3 ${selectedVerification.status === 'APPROVED'
                                                ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                                                : selectedVerification.status === 'REJECTED'
                                                    ? 'bg-red-50 border-red-100 text-red-800'
                                                    : 'bg-amber-50 border-amber-100 text-amber-800'
                                            }`}
                                    >
                                        {selectedVerification.status === 'APPROVED' ? (
                                            <CheckCircle size={20} className="mt-0.5 shrink-0" />
                                        ) : selectedVerification.status === 'REJECTED' ? (
                                            <XCircle size={20} className="mt-0.5 shrink-0" />
                                        ) : (
                                            <Clock size={20} className="mt-0.5 shrink-0" />
                                        )}
                                        <div>
                                            <span className="font-bold text-sm block">
                                                Status: {statusLabel[selectedVerification.status as Exclude<RgStatus, 'NOT_SUBMITTED'>]}
                                            </span>
                                            {selectedVerification.adminReason && (
                                                <p className="text-xs mt-1 opacity-90">"{selectedVerification.adminReason}"</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Document Preview */}
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wide text-meow-muted mb-3 flex items-center gap-2">
                                            <ZoomIn size={14} /> Documento Enviado
                                        </h3>
                                        <div className="relative group overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                                            <div className="aspect-video w-full flex items-center justify-center bg-slate-200/50">
                                                <img
                                                    src={`${apiBaseUrl}${selectedVerification.rgPhotoUrl}`}
                                                    alt="Documento RG"
                                                    className="max-h-[300px] w-full object-contain transition-transform duration-500 group-hover:scale-105"
                                                />
                                            </div>
                                            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="shadow-lg font-bold"
                                                    onClick={() => setImagePreview(`${apiBaseUrl}${selectedVerification.rgPhotoUrl}`)}
                                                >
                                                    <Eye size={16} className="mr-2" /> Ampliar Imagem
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Details Grid */}
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="space-y-1">
                                            <span className="text-xs font-semibold text-slate-500 block">Nome do Usuário</span>
                                            <span className="font-medium text-slate-800 block truncate">{selectedVerification.user?.fullName || 'N/A'}</span>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs font-semibold text-slate-500 block">Número do RG</span>
                                            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 text-xs">{selectedVerification.rgNumber}</span>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs font-semibold text-slate-500 block">Enviado em</span>
                                            <span className="text-slate-700 block">{formatDate(selectedVerification.submittedAt)}</span>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs font-semibold text-slate-500 block">Email</span>
                                            <span className="text-slate-700 block truncate text-xs">{selectedVerification.user?.email}</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    {selectedVerification.status === 'PENDING' && (
                                        <div className="border-t border-slate-100 pt-6 space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-meow-muted">Motivo (Obrigatório para reprovar)</label>
                                                <Textarea
                                                    placeholder="Ex: Foto ilegível, documento vencido..."
                                                    value={rejectReason}
                                                    onChange={e => setRejectReason(e.target.value)}
                                                    className="bg-slate-50"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Button
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-lg shadow-emerald-900/10"
                                                    onClick={handleApprove}
                                                    disabled={busyAction === 'approve'}
                                                >
                                                    <CheckCircle size={16} className="mr-2" /> Aprovar
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
                                                    onClick={handleReject}
                                                    disabled={busyAction === 'reject'}
                                                >
                                                    <XCircle size={16} className="mr-2" /> Reprovar
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            {imagePreview && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setImagePreview(null)}
                >
                    <div className="relative max-w-4xl w-full">
                        <button
                            className="absolute -top-12 right-0 text-white/50 hover:text-white transition-colors"
                            onClick={() => setImagePreview(null)}
                        >
                            <XCircle size={32} />
                        </button>
                        <img
                            src={imagePreview}
                            alt="Ampliado"
                            className="mx-auto max-h-[85vh] rounded-lg shadow-2xl object-contain"
                        />
                    </div>
                </div>
            )}
        </AdminShell>
    );
};
