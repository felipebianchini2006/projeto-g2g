'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { apiFetch, ApiClientError } from '../../lib/api-client';
import { useAuth } from '../auth/auth-provider';
import { AdminShell } from '../admin/admin-shell';
import { NotificationsBell } from '../notifications/notifications-bell';

type HealthResponse = {
  status: string;
};

export const AdminSystemContent = () => {
  const { user, loading } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [ready, setReady] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [healthData, readyData] = await Promise.all([
          apiFetch<HealthResponse>('/health', { skipGlobalError: true }),
          apiFetch<HealthResponse>('/ready', { skipGlobalError: true }),
        ]);
        setHealth(healthData);
        setReady(readyData);
      } catch (error) {
        const message =
          error instanceof ApiClientError
            ? error.message
            : 'Não foi possível carregar o status.';
        setError(message);
      }
    };
    load();
  }, []);

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
        { label: 'Sistema' },
      ]}
    >
      <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">Status do sistema</h1>
            <p className="mt-2 text-sm text-meow-muted">
              Monitoramento rápido dos endpoints internos.
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

      <div className="grid gap-6 md:grid-cols-2">
        {[
          { label: 'Health', path: '/health', status: health?.status },
          { label: 'Ready', path: '/ready', status: ready?.status },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-card"
          >
            <h2 className="text-base font-bold text-meow-charcoal">{item.label}</h2>
            <p className="mt-2 text-xs text-meow-muted">{item.path}</p>
            <div className="mt-4 text-lg font-black text-meow-charcoal">
              {item.status ?? 'Carregando...'}
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
};
