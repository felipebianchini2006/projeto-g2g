'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { adminWalletApi, type AdminWalletSummary } from '../../lib/admin-wallet-api';
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

export const AdminWalletContent = () => {
  const { user, loading, accessToken } = useAuth();
  const [summary, setSummary] = useState<AdminWalletSummary>(defaultSummary);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || user?.role !== 'ADMIN') {
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
            : 'Nao foi possivel carregar a carteira.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [accessToken, user?.role]);

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
        { label: 'Carteira' },
      ]}
    >
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">Carteira do admin</h1>
            <p className="mt-2 text-sm text-meow-muted">
              Visao geral dos saldos pendentes, disponiveis e retidos no site.
            </p>
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
          {
            label: 'Saldo pendente',
            description: 'Valores em garantia aguardando liberacao.',
            value: formatCurrency(summary.pendingCents),
          },
          {
            label: 'Para vendedores',
            description: 'Saldo disponivel nas carteiras dos vendedores.',
            value: formatCurrency(summary.sellersAvailableCents),
          },
          {
            label: 'Dono do site',
            description: 'Taxas de plataforma acumuladas.',
            value: formatCurrency(summary.platformFeeCents),
          },
          {
            label: 'Saldos retidos',
            description: 'Valores estornados ou retidos.',
            value: formatCurrency(summary.reversedCents),
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card"
          >
            <h2 className="text-base font-bold text-meow-charcoal">{item.label}</h2>
            <p className="mt-2 text-xs text-meow-muted">{item.description}</p>
            <div className="mt-4 text-lg font-black text-meow-charcoal">
              {isLoading ? 'Carregando...' : item.value}
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
};
