'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { adminWalletApi, type AdminWalletSummary } from '../../lib/admin-wallet-api';
import { hasAdminPermission } from '../../lib/admin-permissions';
import { useAuth } from '../auth/auth-provider';
import { AdminShell } from '../admin/admin-shell';

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

const defaultSummary: AdminWalletSummary = {
  pendingCents: 0,
  sellersAvailableCents: 0,
  platformFeeCents: 0,
  reversedCents: 0,
};

export const AdminProfitsContent = () => {
  const { user, loading, accessToken } = useAuth();
  const [summary, setSummary] = useState<AdminWalletSummary>(defaultSummary);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !hasAdminPermission(user, 'admin.wallet')) {
      setIsLoading(false);
      return;
    }

    const load = async () => {
      try {
        const data = await adminWalletApi.getSummary(accessToken);
        setSummary(data);
      } catch (error) {
        const message =
          error instanceof ApiClientError
            ? error.message
            : 'Nao foi possivel carregar os lucros.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [accessToken, user?.role, user?.adminPermissions]);

  if (loading) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-4 text-sm text-meow-muted">
          Carregando sessao...
        </div>
      </section>
    );
  }

  if (!user || !hasAdminPermission(user, 'admin.wallet')) {
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
        { label: 'Lucros' },
      ]}
    >
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
        <div>
          <h1 className="text-xl font-black text-meow-charcoal">Lucros da plataforma</h1>
          <p className="mt-2 text-sm text-meow-muted">
            Separacao entre o que pertence aos vendedores e o lucro do admin.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
          <h2 className="text-base font-bold text-meow-charcoal">Lucro do admin</h2>
          <p className="mt-2 text-xs text-meow-muted">Valor disponivel para saque.</p>
          <div className="mt-4 text-2xl font-black text-meow-charcoal">
            {isLoading ? 'Carregando...' : formatCurrency(summary.platformFeeCents)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
          <h2 className="text-base font-bold text-meow-charcoal">Lucro dos vendedores</h2>
          <p className="mt-2 text-xs text-meow-muted">Saldo disponivel nas carteiras.</p>
          <div className="mt-4 text-2xl font-black text-meow-charcoal">
            {isLoading ? 'Carregando...' : formatCurrency(summary.sellersAvailableCents)}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-meow-charcoal">Resumo</h2>
            <p className="mt-2 text-sm text-meow-muted">
              Valores em processamento e reversoes do sistema.
            </p>
          </div>
          <Link
            href="/admin/carteira"
            className="rounded-full border border-meow-red/20 bg-white px-4 py-2 text-xs font-bold text-meow-deep hover:bg-meow-50"
          >
            Abrir carteira
          </Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold text-slate-500">Saldo pendente</p>
            <p className="mt-2 text-lg font-black text-meow-charcoal">
              {isLoading ? 'Carregando...' : formatCurrency(summary.pendingCents)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold text-slate-500">Saldos retidos</p>
            <p className="mt-2 text-lg font-black text-meow-charcoal">
              {isLoading ? 'Carregando...' : formatCurrency(summary.reversedCents)}
            </p>
          </div>
        </div>
      </div>
    </AdminShell>
  );
};
