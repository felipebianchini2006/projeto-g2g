'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { adminWebhooksApi, type WebhookMetrics } from '../../lib/admin-webhooks-api';
import { useAuth } from '../auth/auth-provider';
import { AdminShell } from '../admin/admin-shell';
import { NotificationsBell } from '../notifications/notifications-bell';

export const AdminWebhooksContent = () => {
  const { user, accessToken, loading } = useAuth();
  const [metrics, setMetrics] = useState<WebhookMetrics | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadMetrics = async () => {
    if (!accessToken) {
      return;
    }
    setBusyAction('metrics');
    setError(null);
    setNotice(null);
    try {
      const data = await adminWebhooksApi.fetchEfiMetrics(accessToken);
      setMetrics(data);
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Nao foi possivel carregar as metricas.';
      setError(message);
    } finally {
      setBusyAction(null);
    }
  };

  useEffect(() => {
    if (accessToken && user?.role === 'ADMIN') {
      loadMetrics();
    }
  }, [accessToken, user?.role]);

  const handleRegister = async () => {
    if (!accessToken) {
      return;
    }
    setBusyAction('register');
    setError(null);
    setNotice(null);
    try {
      await adminWebhooksApi.registerEfiWebhook(accessToken);
      setNotice('Webhook registrado com sucesso.');
      await loadMetrics();
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Nao foi possivel registrar o webhook.';
      setError(message);
    } finally {
      setBusyAction(null);
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
        { label: 'Webhooks' },
      ]}
    >
      <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">Webhooks Pix</h1>
            <p className="mt-2 text-sm text-meow-muted">
              Gerencie callbacks e acompanhe metricas do provedor.
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

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-card">
          <h2 className="text-base font-bold text-meow-charcoal">Endpoint publico</h2>
          <p className="mt-2 text-sm text-meow-muted">
            Configure o provedor para enviar eventos para:
          </p>
          <div className="mt-4 rounded-xl border border-slate-200 bg-meow-50 px-4 py-3 text-xs font-semibold text-meow-charcoal">
            POST /webhooks/efi/pix
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-full bg-meow-300 px-4 py-2 text-xs font-bold text-white"
              onClick={handleRegister}
              disabled={busyAction === 'register'}
            >
              {busyAction === 'register' ? 'Registrando...' : 'Registrar webhook'}
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-meow-charcoal"
              onClick={loadMetrics}
              disabled={busyAction === 'metrics'}
            >
              {busyAction === 'metrics' ? 'Atualizando...' : 'Atualizar metricas'}
            </button>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-card">
          <h2 className="text-base font-bold text-meow-charcoal">Metricas</h2>
          {!metrics ? (
            <div className="mt-4 rounded-xl border border-slate-100 bg-meow-50 px-4 py-3 text-sm text-meow-muted">
              Nenhuma metrica carregada.
            </div>
          ) : (
            <div className="mt-4 grid gap-3 text-sm text-meow-muted">
              <div className="flex items-center justify-between">
                <span>Recebidos</span>
                <strong className="text-meow-charcoal">{metrics.counters.received ?? 0}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Processados</span>
                <strong className="text-meow-charcoal">{metrics.counters.processed ?? 0}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Falhas</span>
                <strong className="text-meow-charcoal">{metrics.counters.failed ?? 0}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Pendentes</span>
                <strong className="text-meow-charcoal">{metrics.pending}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Total</span>
                <strong className="text-meow-charcoal">{metrics.total}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
};
