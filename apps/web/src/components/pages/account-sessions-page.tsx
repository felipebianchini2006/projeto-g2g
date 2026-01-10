'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { accountSecurityApi, type SessionInfo } from '../../lib/account-security-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';

type SessionsState = {
  status: 'loading' | 'ready';
  sessions: SessionInfo[];
  error?: string;
  actionError?: string;
  actionSuccess?: string;
};

export const AccountSessionsContent = () => {
  const { user, accessToken, loading } = useAuth();
  const [state, setState] = useState<SessionsState>({
    status: 'loading',
    sessions: [],
  });
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [logoutAllBusy, setLogoutAllBusy] = useState(false);

  const loadSessions = async () => {
    if (!accessToken) {
      return;
    }
    setState((prev) => ({ ...prev, status: 'loading', error: undefined }));
    try {
      const sessions = await accountSecurityApi.listSessions(accessToken);
      setState((prev) => ({ ...prev, status: 'ready', sessions }));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Nao foi possivel carregar as sessoes.';
      setState((prev) => ({ ...prev, status: 'ready', sessions: [], error: message }));
    }
  };

  useEffect(() => {
    if (accessToken) {
      loadSessions();
    }
  }, [accessToken]);

  const handleRevoke = async (sessionId: string) => {
    if (!accessToken || actionBusy) {
      return;
    }
    setActionBusy(sessionId);
    try {
      await accountSecurityApi.revokeSession(accessToken, sessionId);
      setState((prev) => ({
        ...prev,
        actionSuccess: 'Sessao encerrada.',
        actionError: undefined,
      }));
      await loadSessions();
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Nao foi possivel encerrar a sessao.';
      setState((prev) => ({ ...prev, actionError: message, actionSuccess: undefined }));
    } finally {
      setActionBusy(null);
    }
  };

  const handleLogoutAll = async () => {
    if (!accessToken || logoutAllBusy) {
      return;
    }
    setLogoutAllBusy(true);
    try {
      const result = await accountSecurityApi.logoutAll(accessToken);
      setState((prev) => ({
        ...prev,
        actionSuccess: `Sessoes encerradas: ${result.revokedSessions}.`,
        actionError: undefined,
      }));
      await loadSessions();
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Nao foi possivel encerrar as sessoes.';
      setState((prev) => ({ ...prev, actionError: message, actionSuccess: undefined }));
    } finally {
      setLogoutAllBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-4 text-sm text-meow-muted">
          Carregando sessao...
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">Entre para acessar suas sessoes.</p>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-full bg-meow-linear px-6 py-2 text-sm font-bold text-white"
          >
            Fazer login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <AccountShell
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Conta', href: '/conta' },
        { label: 'Sessoes' },
      ]}
    >
      <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">Sessoes ativas</h1>
            <p className="mt-2 text-sm text-meow-muted">
              Veja onde sua conta esta conectada e encerre acessos antigos.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
            onClick={handleLogoutAll}
            disabled={logoutAllBusy || state.sessions.length === 0}
          >
            {logoutAllBusy ? 'Encerrando...' : 'Sair de todas'}
          </button>
        </div>

        {state.error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        ) : null}
        {state.actionError ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.actionError}
          </div>
        ) : null}
        {state.actionSuccess ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {state.actionSuccess}
          </div>
        ) : null}

        {state.status === 'loading' ? (
          <div className="mt-4 rounded-xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
            Carregando sessoes...
          </div>
        ) : null}

        {state.status === 'ready' && state.sessions.length === 0 ? (
          <div className="mt-4 rounded-xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
            Nenhuma sessao encontrada.
          </div>
        ) : null}

        <div className="mt-4 grid gap-4">
          {state.sessions.map((session) => {
            const isRevoked = Boolean(session.revokedAt);
            const statusLabel = isRevoked ? 'Encerrada' : session.isCurrent ? 'Atual' : 'Ativa';
            const statusTone = isRevoked
              ? 'bg-red-50 text-red-700'
              : session.isCurrent
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-meow-cream text-meow-charcoal';

            return (
              <div
                key={session.id}
                className="rounded-2xl border border-meow-red/20 bg-meow-cream/40 p-4 text-sm text-meow-muted"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-meow-charcoal">
                      Sessao #{session.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="mt-1 text-xs text-meow-muted">
                      IP: {session.ip ?? '-'} | {session.userAgent ?? 'Agente nao informado'}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusTone}`}
                  >
                    {statusLabel}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-meow-muted sm:grid-cols-2">
                  <div>
                    <span className="font-semibold text-meow-charcoal">Criada em:</span>{' '}
                    {new Date(session.createdAt).toLocaleString('pt-BR')}
                  </div>
                  <div>
                    <span className="font-semibold text-meow-charcoal">Ultima atividade:</span>{' '}
                    {session.lastSeenAt
                      ? new Date(session.lastSeenAt).toLocaleString('pt-BR')
                      : 'Nao informado'}
                  </div>
                  <div>
                    <span className="font-semibold text-meow-charcoal">Expira em:</span>{' '}
                    {new Date(session.expiresAt).toLocaleString('pt-BR')}
                  </div>
                  <div>
                    <span className="font-semibold text-meow-charcoal">Revogada em:</span>{' '}
                    {session.revokedAt
                      ? new Date(session.revokedAt).toLocaleString('pt-BR')
                      : 'Ativa'}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
                    disabled={session.isCurrent || isRevoked || actionBusy === session.id}
                    onClick={() => handleRevoke(session.id)}
                  >
                    {actionBusy === session.id ? 'Encerrando...' : 'Encerrar'}
                  </button>
                  {session.isCurrent ? (
                    <span className="text-xs text-meow-muted">
                      Sessao atual (use Sair para desconectar).
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AccountShell>
  );
};
