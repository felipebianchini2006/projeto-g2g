'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle, Clock, Eye, FileCheck, XCircle } from 'lucide-react';

import { ApiClientError } from '../../lib/api-client';
import { adminRgApi } from '../../lib/admin-rg-api';
import type { RgVerification, RgStatus } from '../../lib/rg-api';
import { useAuth } from '../auth/auth-provider';
import { AdminShell } from '../admin/admin-shell';

const statusLabel: Record<Exclude<RgStatus, 'NOT_SUBMITTED'>, string> = {
    PENDING: 'Pendente',
    APPROVED: 'Aprovado',
    REJECTED: 'Reprovado',
};

const statusIcon: Record<Exclude<RgStatus, 'NOT_SUBMITTED'>, React.ReactNode> = {
    PENDING: <Clock size={14} className="text-yellow-500" />,
    APPROVED: <CheckCircle size={14} className="text-green-500" />,
    REJECTED: <XCircle size={14} className="text-red-500" />,
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
        } catch (err) {
            handleError(err, 'Erro ao carregar verificações.');
        } finally {
            setBusyAction(null);
        }
    };

    useEffect(() => {
        if (accessToken && user?.role === 'ADMIN') {
            loadVerifications();
        }
    }, [accessToken, user?.role, statusFilter]);

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
                { label: 'Verificação de RG' },
            ]}
        >
            <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-black text-meow-charcoal">Verificação de RG</h1>
                        <p className="mt-2 text-sm text-meow-muted">
                            Analise e aprove/reprove documentos de identidade.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
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
                        <h2>Solicitações</h2>
                        <div className="form-field">
                            <span className="summary-label">Status</span>
                            <select
                                className="form-input"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as RgStatus | 'all')}
                            >
                                <option value="all">Todas</option>
                                <option value="PENDING">Pendentes</option>
                                <option value="APPROVED">Aprovadas</option>
                                <option value="REJECTED">Reprovadas</option>
                            </select>
                        </div>
                    </div>

                    {busyAction === 'load' ? (
                        <div className="state-card">Carregando verificações...</div>
                    ) : null}

                    {verifications.length === 0 && busyAction !== 'load' ? (
                        <div className="state-card">Nenhuma verificação encontrada.</div>
                    ) : null}

                    <div className="support-list">
                        {verifications.map((verification) => (
                            <button
                                className={`support-row ${selectedVerification?.id === verification.id ? 'bg-meow-red/5' : ''}`}
                                key={verification.id}
                                type="button"
                                onClick={() => {
                                    setSelectedVerification(verification);
                                    setRejectReason('');
                                    setError('');
                                    setNotice('');
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <FileCheck size={14} className="text-meow-muted" />
                                    <div>
                                        <strong className="text-sm">
                                            {verification.user?.fullName || verification.user?.email || 'Usuário'}
                                        </strong>
                                        <span className="auth-helper block text-xs">
                                            RG: {verification.rgNumber}
                                        </span>
                                    </div>
                                </div>
                                <div className="ticket-meta">
                                    <span className="flex items-center gap-1 text-xs">
                                        {statusIcon[verification.status as keyof typeof statusIcon]}
                                        {statusLabel[verification.status as keyof typeof statusLabel]}
                                    </span>
                                    <small>{formatDate(verification.submittedAt)}</small>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="order-card">
                    <div className="panel-header">
                        <h2>Detalhes</h2>
                    </div>

                    {!selectedVerification ? (
                        <div className="state-card">Selecione uma verificação para ver detalhes.</div>
                    ) : (
                        <>
                            <div className="order-summary">
                                <div className="summary-row">
                                    <span className="summary-label">ID</span>
                                    <span className="summary-value font-mono text-xs">{selectedVerification.id}</span>
                                </div>
                                <div className="summary-row">
                                    <span className="summary-label">Usuário</span>
                                    <span className="summary-value">
                                        {selectedVerification.user?.fullName || selectedVerification.user?.email}
                                    </span>
                                </div>
                                <div className="summary-row">
                                    <span className="summary-label">RG</span>
                                    <span className="summary-value font-mono">{selectedVerification.rgNumber}</span>
                                </div>
                                <div className="summary-row">
                                    <span className="summary-label">Status</span>
                                    <span className="summary-value flex items-center gap-1">
                                        {statusIcon[selectedVerification.status as keyof typeof statusIcon]}
                                        {statusLabel[selectedVerification.status as keyof typeof statusLabel]}
                                    </span>
                                </div>
                                <div className="summary-row">
                                    <span className="summary-label">Enviado em</span>
                                    <span className="summary-value">{formatDate(selectedVerification.submittedAt)}</span>
                                </div>
                                {selectedVerification.reviewedAt ? (
                                    <div className="summary-row">
                                        <span className="summary-label">Analisado em</span>
                                        <span className="summary-value">{formatDate(selectedVerification.reviewedAt)}</span>
                                    </div>
                                ) : null}
                                {selectedVerification.reviewedByAdmin ? (
                                    <div className="summary-row">
                                        <span className="summary-label">Analisado por</span>
                                        <span className="summary-value">{selectedVerification.reviewedByAdmin.email}</span>
                                    </div>
                                ) : null}
                                {selectedVerification.adminReason ? (
                                    <div className="summary-row">
                                        <span className="summary-label">Motivo</span>
                                        <span className="summary-value text-red-600">{selectedVerification.adminReason}</span>
                                    </div>
                                ) : null}
                            </div>

                            <div className="mt-4">
                                <p className="text-sm font-bold text-meow-charcoal mb-2">Foto do RG:</p>
                                <div className="relative">
                                    <img
                                        src={`${apiBaseUrl}${selectedVerification.rgPhotoUrl}`}
                                        alt="Documento RG"
                                        className="max-h-[200px] rounded-xl border border-slate-100 object-contain"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setImagePreview(`${apiBaseUrl}${selectedVerification.rgPhotoUrl}`)}
                                        className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-meow-deep shadow hover:bg-white"
                                    >
                                        <Eye size={12} />
                                        Ampliar
                                    </button>
                                </div>
                            </div>

                            {selectedVerification.status === 'PENDING' ? (
                                <>
                                    <label className="form-field mt-4">
                                        Motivo da reprovação (opcional)
                                        <textarea
                                            className="form-textarea"
                                            rows={2}
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                            placeholder="Informe o motivo caso reprove..."
                                        />
                                    </label>

                                    <div className="order-actions mt-4">
                                        <button
                                            className="admin-primary-button"
                                            type="button"
                                            onClick={handleApprove}
                                            disabled={busyAction === 'approve'}
                                        >
                                            {busyAction === 'approve' ? 'Aprovando...' : 'Aprovar RG'}
                                        </button>
                                        <button
                                            className="ghost-button text-red-600 hover:bg-red-50"
                                            type="button"
                                            onClick={handleReject}
                                            disabled={busyAction === 'reject'}
                                        >
                                            {busyAction === 'reject' ? 'Reprovando...' : 'Reprovar'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-meow-muted">
                                    Esta verificação já foi processada.
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Image Preview Modal */}
            {imagePreview ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                    onClick={() => setImagePreview(null)}
                >
                    <img
                        src={imagePreview}
                        alt="RG Ampliado"
                        className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
                    />
                </div>
            ) : null}
        </AdminShell>
    );
};
