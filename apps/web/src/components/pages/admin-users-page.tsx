'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import {
  adminUsersApi,
  type AdminUser,
  type AdminUserRole,
} from '../../lib/admin-users-api';
import { useAuth } from '../auth/auth-provider';
import { AdminNav } from '../admin/admin-nav';
import { NotificationsBell } from '../notifications/notifications-bell';

const roleLabel: Record<AdminUserRole, string> = {
  USER: 'Buyer',
  SELLER: 'Seller',
  ADMIN: 'Admin',
};

export const AdminUsersContent = () => {
  const { user, accessToken, loading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [roleFilter, setRoleFilter] = useState<AdminUserRole | 'all'>('all');
  const [blockedFilter, setBlockedFilter] = useState<'all' | 'blocked' | 'active'>('all');
  const [search, setSearch] = useState('');
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

  const loadUsers = async () => {
    if (!accessToken) {
      return;
    }
    setBusyAction('load');
    setError(null);
    setNotice(null);
    try {
      const response = await adminUsersApi.listUsers(accessToken, {
        role: roleFilter === 'all' ? undefined : roleFilter,
        blocked:
          blockedFilter === 'all'
            ? undefined
            : blockedFilter === 'blocked'
              ? true
              : false,
        search: search.trim() || undefined,
      });
      setUsers(response.items);
      setSelectedUser(response.items[0] ?? null);
      setActionReason('');
    } catch (error) {
      handleError(error, 'Nao foi possivel carregar usuarios.');
    } finally {
      setBusyAction(null);
    }
  };

  useEffect(() => {
    if (accessToken && user?.role === 'ADMIN') {
      loadUsers();
    }
  }, [accessToken, roleFilter, blockedFilter, search, user?.role]);

  const selectedStatus = useMemo(() => {
    if (!selectedUser) {
      return null;
    }
    return selectedUser.blockedAt ? 'Bloqueado' : 'Ativo';
  }, [selectedUser]);

  const applyUserUpdate = (updated: AdminUser) => {
    const matchesBlockedFilter =
      blockedFilter === 'all'
        ? true
        : blockedFilter === 'blocked'
          ? Boolean(updated.blockedAt)
          : !updated.blockedAt;

    setUsers((prev) => {
      if (!matchesBlockedFilter) {
        return prev.filter((item) => item.id !== updated.id);
      }
      return prev.map((item) => (item.id === updated.id ? updated : item));
    });

    if (!matchesBlockedFilter) {
      setSelectedUser(null);
    } else {
      setSelectedUser(updated);
    }
  };

  const handleBlock = async () => {
    if (!accessToken || !selectedUser) {
      return;
    }
    if (!actionReason.trim()) {
      setError('Informe o motivo do bloqueio.');
      return;
    }
    setBusyAction('block');
    setError(null);
    setNotice(null);
    try {
      const updated = await adminUsersApi.blockUser(
        accessToken,
        selectedUser.id,
        actionReason.trim(),
      );
      applyUserUpdate(updated);
      setNotice('Usuario bloqueado.');
      setActionReason('');
    } catch (error) {
      handleError(error, 'Nao foi possivel bloquear o usuario.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleUnblock = async () => {
    if (!accessToken || !selectedUser) {
      return;
    }
    setBusyAction('unblock');
    setError(null);
    setNotice(null);
    try {
      const updated = await adminUsersApi.unblockUser(accessToken, selectedUser.id);
      applyUserUpdate(updated);
      setNotice('Usuario desbloqueado.');
      setActionReason('');
    } catch (error) {
      handleError(error, 'Nao foi possivel desbloquear o usuario.');
    } finally {
      setBusyAction(null);
    }
  };

  if (loading) {
    return (
      <div className="admin-users-shell">
        <div className="state-card">Carregando sessao...</div>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="admin-users-shell">
        <div className="state-card">Acesso restrito ao admin.</div>
        <Link className="ghost-button" href="/conta">
          Voltar para conta
        </Link>
      </div>
    );
  }

  return (
    <section className="admin-users-shell">
      <div className="admin-users-header">
        <div>
          <h1>Usuarios</h1>
          <p className="auth-helper">Bloqueie ou desbloqueie acesso quando necessario.</p>
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

      <div className="admin-users-grid">
        <div className="order-card">
          <div className="panel-header">
            <h2>Lista</h2>
            <button
              className="ghost-button"
              type="button"
              onClick={loadUsers}
              disabled={busyAction === 'load'}
            >
              {busyAction === 'load' ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>

          <div className="support-filters">
            <div className="form-field">
              <span className="summary-label">Role</span>
              <select
                className="form-input"
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(event.target.value as AdminUserRole | 'all')
                }
              >
                <option value="all">Todos</option>
                <option value="USER">Buyers</option>
                <option value="SELLER">Sellers</option>
                <option value="ADMIN">Admins</option>
              </select>
            </div>
            <div className="form-field">
              <span className="summary-label">Status</span>
              <select
                className="form-input"
                value={blockedFilter}
                onChange={(event) =>
                  setBlockedFilter(event.target.value as 'all' | 'blocked' | 'active')
                }
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="blocked">Bloqueados</option>
              </select>
            </div>
            <div className="form-field">
              <span className="summary-label">Busca</span>
              <input
                className="form-input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Email"
              />
            </div>
          </div>

          {busyAction === 'load' ? (
            <div className="state-card">Carregando usuarios...</div>
          ) : null}

          {users.length === 0 && busyAction !== 'load' ? (
            <div className="state-card">Nenhum usuario encontrado.</div>
          ) : null}

          <div className="support-list">
            {users.map((item) => (
              <button
                className="support-row"
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedUser(item);
                  setActionReason('');
                }}
              >
                <div>
                  <strong>{item.email}</strong>
                  <span className="auth-helper">{roleLabel[item.role] ?? item.role}</span>
                </div>
                <div className="ticket-meta">
                  <span
                    className={`status-pill status-${item.blockedAt ? 'blocked' : 'active'}`}
                  >
                    {item.blockedAt ? 'Bloqueado' : 'Ativo'}
                  </span>
                  <small>{new Date(item.createdAt).toLocaleDateString('pt-BR')}</small>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="order-card">
          <div className="panel-header">
            <h2>Detalhes</h2>
          </div>
          {!selectedUser ? (
            <div className="state-card">Selecione um usuario.</div>
          ) : (
            <>
              <div className="ticket-summary">
                <div>
                  <span className="summary-label">Status</span>
                  <strong>{selectedStatus}</strong>
                </div>
                <div>
                  <span className="summary-label">Role</span>
                  <strong>{roleLabel[selectedUser.role] ?? selectedUser.role}</strong>
                </div>
                <div>
                  <span className="summary-label">Criado</span>
                  <strong>
                    {new Date(selectedUser.createdAt).toLocaleDateString('pt-BR')}
                  </strong>
                </div>
                <div>
                  <span className="summary-label">Atualizado</span>
                  <strong>
                    {new Date(selectedUser.updatedAt).toLocaleDateString('pt-BR')}
                  </strong>
                </div>
              </div>

              {selectedUser.blockedReason ? (
                <div className="state-card info">{selectedUser.blockedReason}</div>
              ) : null}

              {selectedUser.payoutBlockedAt ? (
                <div className="state-card info">
                  Payout bloqueado: {selectedUser.payoutBlockedReason ?? 'Sem motivo.'}
                </div>
              ) : null}

              {!selectedUser.blockedAt ? (
                <>
                  <label className="form-field">
                    Motivo do bloqueio
                    <textarea
                      className="form-textarea"
                      rows={3}
                      value={actionReason}
                      onChange={(event) => setActionReason(event.target.value)}
                    />
                  </label>
                  <div className="order-actions">
                    <button
                      className="primary-button"
                      type="button"
                      onClick={handleBlock}
                      disabled={!actionReason.trim() || busyAction === 'block'}
                    >
                      {busyAction === 'block' ? 'Bloqueando...' : 'Bloquear'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="order-actions">
                  <button
                    className="primary-button"
                    type="button"
                    onClick={handleUnblock}
                    disabled={busyAction === 'unblock'}
                  >
                    {busyAction === 'unblock' ? 'Desbloqueando...' : 'Desbloquear'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
};
