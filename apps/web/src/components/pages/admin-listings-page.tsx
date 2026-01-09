'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import {
  adminListingsApi,
  type AdminListing,
  type AdminListingStatus,
} from '../../lib/admin-listings-api';
import { useAuth } from '../auth/auth-provider';
import { AdminNav } from '../admin/admin-nav';
import { NotificationsBell } from '../notifications/notifications-bell';

const statusLabel: Record<AdminListingStatus, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Pendente',
  PUBLISHED: 'Publicado',
  SUSPENDED: 'Suspenso',
};

const deliveryLabel: Record<'AUTO' | 'MANUAL', string> = {
  AUTO: 'Auto',
  MANUAL: 'Manual',
};

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

export const AdminListingsContent = () => {
  const { user, accessToken, loading } = useAuth();
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [selectedListing, setSelectedListing] = useState<AdminListing | null>(null);
  const [statusFilter, setStatusFilter] = useState<AdminListingStatus | 'all'>('PENDING');
  const [actionReason, setActionReason] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleError = (error: unknown, fallback: string) => {
    if (error instanceof ApiClientError) {
      setError(error.message);
      return;
    }
    setError(error instanceof Error ? error.message : fallback);
  };

  const loadListings = async () => {
    if (!accessToken) {
      return;
    }
    setBusyAction('load');
    setError(null);
    setNotice(null);
    try {
      const data = await adminListingsApi.listListings(
        accessToken,
        statusFilter === 'all' ? undefined : statusFilter,
      );
      setListings(data);
      setSelectedListing(data[0] ?? null);
      setActionReason('');
    } catch (error) {
      handleError(error, 'Nao foi possivel carregar anuncios.');
    } finally {
      setBusyAction(null);
    }
  };

  useEffect(() => {
    if (accessToken && user?.role === 'ADMIN') {
      loadListings();
    }
  }, [accessToken, statusFilter, user?.role]);

  const detailSummary = useMemo(() => {
    if (!selectedListing) {
      return null;
    }
    return {
      status: statusLabel[selectedListing.status] ?? selectedListing.status,
      price: formatCurrency(selectedListing.priceCents, selectedListing.currency),
      delivery: deliveryLabel[selectedListing.deliveryType],
    };
  }, [selectedListing]);

  const applyListingUpdate = (updated: AdminListing) => {
    setListings((prev) => {
      const filtered = prev.filter((item) => item.id !== updated.id);
      if (statusFilter === 'all' || updated.status === statusFilter) {
        return [updated, ...filtered];
      }
      return filtered;
    });
    if (statusFilter !== 'all' && updated.status !== statusFilter) {
      setSelectedListing(null);
    } else {
      setSelectedListing(updated);
    }
  };

  const handleAction = async (action: 'approve' | 'reject' | 'suspend') => {
    if (!accessToken || !selectedListing) {
      return;
    }
    if ((action === 'reject' || action === 'suspend') && !actionReason.trim()) {
      setError('Informe o motivo da decisao.');
      return;
    }
    setBusyAction(action);
    setError(null);
    setNotice(null);
    try {
      const updated =
        action === 'approve'
          ? await adminListingsApi.approveListing(accessToken, selectedListing.id)
          : action === 'reject'
            ? await adminListingsApi.rejectListing(accessToken, selectedListing.id, {
                reason: actionReason.trim(),
              })
            : await adminListingsApi.suspendListing(accessToken, selectedListing.id, {
                reason: actionReason.trim(),
              });
      applyListingUpdate(updated);
      setNotice('Anuncio atualizado com sucesso.');
      setActionReason('');
    } catch (error) {
      handleError(error, 'Nao foi possivel atualizar o anuncio.');
    } finally {
      setBusyAction(null);
    }
  };

  if (loading) {
    return (
      <div className="admin-listings-shell">
        <div className="state-card">Carregando sessao...</div>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="admin-listings-shell">
        <div className="state-card">Acesso restrito ao admin.</div>
        <Link className="ghost-button" href="/conta">
          Voltar para conta
        </Link>
      </div>
    );
  }

  return (
    <section className="admin-listings-shell">
      <div className="admin-listings-header">
        <div>
          <h1>Moderacao de anuncios</h1>
          <p className="auth-helper">Avalie anuncios pendentes e aplique ajustes.</p>
        </div>
        <div className="page-actions">
          <NotificationsBell />
          <Link className="ghost-button" href="/conta">
            Voltar para conta
          </Link>
        </div>
      </div>

      <AdminNav />

      {error ? <div className="state-card error">{error}</div> : null}
      {notice ? <div className="state-card success">{notice}</div> : null}

      <div className="admin-listings-grid">
        <div className="order-card">
          <div className="panel-header">
            <h2>Anuncios</h2>
            <div className="form-field">
              <span className="summary-label">Status</span>
              <select
                className="form-input"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as AdminListingStatus | 'all')
                }
              >
                <option value="all">Todos</option>
                <option value="PENDING">Pendentes</option>
                <option value="PUBLISHED">Publicados</option>
                <option value="DRAFT">Rascunhos</option>
                <option value="SUSPENDED">Suspensos</option>
              </select>
            </div>
          </div>

          {busyAction === 'load' ? (
            <div className="state-card">Carregando anuncios...</div>
          ) : null}

          {listings.length === 0 && busyAction !== 'load' ? (
            <div className="state-card">Nenhum anuncio encontrado.</div>
          ) : null}

          <div className="support-list">
            {listings.map((listing) => (
              <button
                className="support-row"
                key={listing.id}
                type="button"
                onClick={() => {
                  setSelectedListing(listing);
                  setActionReason('');
                }}
              >
                <div>
                  <strong>{listing.title}</strong>
                  <span className="auth-helper">
                    {listing.seller?.email ?? listing.sellerId}
                  </span>
                </div>
                <div className="ticket-meta">
                  <span className={`status-pill status-${listing.status.toLowerCase()}`}>
                    {statusLabel[listing.status] ?? listing.status}
                  </span>
                  <small>{formatCurrency(listing.priceCents, listing.currency)}</small>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="order-card">
          <div className="panel-header">
            <h2>Detalhes</h2>
          </div>
          {!selectedListing ? (
            <div className="state-card">Selecione um anuncio para moderar.</div>
          ) : (
            <>
              <div className="ticket-summary">
                <div>
                  <span className="summary-label">Status</span>
                  <strong>{detailSummary?.status}</strong>
                </div>
                <div>
                  <span className="summary-label">Preco</span>
                  <strong>{detailSummary?.price}</strong>
                </div>
                <div>
                  <span className="summary-label">Entrega</span>
                  <strong>{detailSummary?.delivery}</strong>
                </div>
                <div>
                  <span className="summary-label">Seller</span>
                  <strong>{selectedListing.seller?.email ?? selectedListing.sellerId}</strong>
                </div>
                <div>
                  <span className="summary-label">Categoria</span>
                  <strong>{selectedListing.category?.name ?? selectedListing.categoryId}</strong>
                </div>
                <div>
                  <span className="summary-label">Criado</span>
                  <strong>
                    {new Date(selectedListing.createdAt).toLocaleDateString('pt-BR')}
                  </strong>
                </div>
              </div>

              {selectedListing.description ? (
                <div className="state-card info">{selectedListing.description}</div>
              ) : null}

              <label className="form-field">
                Motivo (reprovacao/suspensao)
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={actionReason}
                  onChange={(event) => setActionReason(event.target.value)}
                  placeholder="Explique o motivo da acao."
                />
              </label>

              <div className="order-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => handleAction('approve')}
                  disabled={busyAction === 'approve'}
                >
                  {busyAction === 'approve' ? 'Aprovando...' : 'Aprovar'}
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => handleAction('reject')}
                  disabled={!actionReason.trim() || busyAction === 'reject'}
                >
                  {busyAction === 'reject' ? 'Reprovando...' : 'Reprovar'}
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => handleAction('suspend')}
                  disabled={!actionReason.trim() || busyAction === 'suspend'}
                >
                  {busyAction === 'suspend' ? 'Suspendendo...' : 'Suspender'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
