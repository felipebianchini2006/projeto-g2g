'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, BadgeDollarSign, Building2, RefreshCw, Wallet } from 'lucide-react';

import { ApiClientError } from '../../lib/api-client';
import { partnerApi, type Partner, type PartnerStats } from '../../lib/partner-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { CurrencyInput } from '../ui/currency-input';
import { Select } from '../ui/select';

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

type PartnersState = {
  status: 'loading' | 'ready';
  items: Partner[];
  error?: string;
};

type StatsState = {
  status: 'idle' | 'loading' | 'ready';
  stats: PartnerStats | null;
  error?: string;
};

export const PartnerDashboardPage = () => {
  const { user, accessToken, loading } = useAuth();
  const [partnersState, setPartnersState] = useState<PartnersState>({
    status: 'loading',
    items: [],
  });
  const [statsState, setStatsState] = useState<StatsState>({
    status: 'idle',
    stats: null,
  });
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshAnimating, setRefreshAnimating] = useState(false);

  const [isPayoutOpen, setIsPayoutOpen] = useState(false);
  const [payoutAmountCents, setPayoutAmountCents] = useState(0);
  const [payoutPixKeyType, setPayoutPixKeyType] = useState<'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP'>(
    'CPF',
  );
  const [payoutPixKey, setPayoutPixKey] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);

  const accessAllowed = Boolean(user);

  const loadPartners = async () => {
    if (!accessToken) return;
    setPartnersState((prev) => ({ ...prev, status: 'loading', error: undefined }));
    try {
      const items = await partnerApi.listMine(accessToken);
      setPartnersState({ status: 'ready', items });
      if (!selectedPartnerId && items.length > 0) {
        setSelectedPartnerId(items[0]?.id ?? null);
      }
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível carregar seus parceiros.';
      setPartnersState({ status: 'ready', items: [], error: message });
    }
  };

  const loadStats = async (partnerId: string) => {
    if (!accessToken) return;
    setStatsState({ status: 'loading', stats: null, error: undefined });
    try {
      const stats = await partnerApi.getStats(accessToken, partnerId);
      setStatsState({ status: 'ready', stats });
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível carregar os dados do parceiro.';
      setStatsState({ status: 'ready', stats: null, error: message });
    }
  };

  const handleRefresh = async () => {
    if (!accessToken) return;
    setRefreshAnimating(true);
    setRefreshing(true);
    setTimeout(() => setRefreshAnimating(false), 900);
    try {
      await loadPartners();
      if (selectedPartnerId) {
        await loadStats(selectedPartnerId);
      }
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (accessToken && accessAllowed) {
      loadPartners();
    }
  }, [accessToken, accessAllowed]);

  useEffect(() => {
    if (selectedPartnerId && accessToken) {
      loadStats(selectedPartnerId);
    }
  }, [selectedPartnerId, accessToken]);

  const selectedPartner = useMemo(
    () => partnersState.items.find((partner) => partner.id === selectedPartnerId) ?? null,
    [partnersState.items, selectedPartnerId],
  );

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
          <p className="text-sm text-meow-muted">Entre para acessar o painel do parceiro.</p>
          <Link
            className="mt-4 inline-flex rounded-full bg-meow-linear px-6 py-2 text-sm font-bold text-white"
            href="/login"
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
        { label: 'Parceiro' },
      ]}
    >
      <Card className="rounded-2xl border border-slate-100 p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-meow-charcoal">Painel do parceiro</h1>
              <Badge variant="neutral">BETA</Badge>
            </div>
            <p className="mt-1 text-sm text-meow-muted">
              Acompanhe seus cliques, comissoes e solicite saque das campanhas ativas.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw size={14} aria-hidden className={refreshAnimating ? 'animate-spin' : ''} />
            Atualizar
          </Button>
        </div>
      </Card>

      {partnersState.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {partnersState.error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="rounded-2xl border border-slate-100 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-meow-charcoal">Seus parceiros</h2>
            <Badge variant="neutral">{partnersState.items.length}</Badge>
          </div>
          <div className="mt-4 grid gap-2">
            {partnersState.status === 'loading' ? (
              <div className="rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-xs text-meow-muted">
                Carregando parceiros...
              </div>
            ) : null}
            {partnersState.items.length === 0 && partnersState.status === 'ready' ? (
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-xs text-meow-muted">
                Nenhum parceiro vinculado ao seu e-mail.
              </div>
            ) : null}
            {partnersState.items.map((partner) => {
              const isSelected = partner.id === selectedPartnerId;
              return (
                <button
                  key={partner.id}
                  type="button"
                  onClick={() => setSelectedPartnerId(partner.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${isSelected
                      ? 'border-meow-red/40 bg-meow-red/10 text-meow-deep'
                      : 'border-slate-100 text-meow-charcoal hover:bg-slate-50'
                    }`}
                >
                  <span className="flex items-center gap-2">
                    <Building2 size={16} aria-hidden />
                    {partner.name}
                  </span>
                  {partner.active ? (
                    <span className="text-[10px] font-bold text-emerald-600">Ativo</span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400">Inativo</span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="rounded-2xl border border-slate-100 p-6 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-meow-charcoal">
                  {selectedPartner?.name ?? 'Selecione um parceiro'}
                </h2>
                <p className="mt-1 text-xs text-meow-muted">
                  {selectedPartner?.slug ? `Slug: ${selectedPartner.slug}` : 'Escolha um parceiro para ver detalhes.'}
                </p>
              </div>
              <Badge variant="neutral">
                Comissao {selectedPartner?.commissionBps ? `${selectedPartner.commissionBps / 100}%` : '--'}
              </Badge>
            </div>

            {statsState.status === 'loading' ? (
              <div className="mt-4 rounded-xl border border-meow-red/20 bg-white px-3 py-2 text-xs text-meow-muted">
                Carregando estatisticas...
              </div>
            ) : null}

            {statsState.error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {statsState.error}
              </div>
            ) : null}

            {statsState.stats ? (
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  {
                    label: 'Saldo disponivel',
                    value: formatCurrency(statsState.stats.balanceCents),
                    icon: <Wallet size={16} aria-hidden />,
                    className: 'from-emerald-500 to-emerald-600',
                  },
                  {
                    label: 'Comissao liquida',
                    value: formatCurrency(statsState.stats.commissionCents),
                    icon: <BadgeDollarSign size={16} aria-hidden />,
                    className: 'from-blue-500 to-blue-600',
                  },
                  {
                    label: 'Cliques',
                    value: statsState.stats.clicks.toLocaleString('pt-BR'),
                    icon: <BadgeCheck size={16} aria-hidden />,
                    className: 'from-rose-500 to-rose-600',
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    className={`relative overflow-hidden rounded-[18px] border border-slate-100 bg-gradient-to-br ${card.className} p-4 text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)]`}
                  >
                    <span className="absolute right-[-10px] top-[-10px] h-16 w-16 rounded-full bg-white/15" />
                    <div className="grid h-9 w-9 place-items-center rounded-2xl border border-white/30 bg-white/10">
                      {card.icon}
                    </div>
                    <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.4px] text-white/80">
                      {card.label}
                    </p>
                    <p className="mt-2 text-lg font-black">{card.value}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>

          {statsState.stats ? (
            <Card className="rounded-2xl border border-slate-100 p-6 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-meow-charcoal">Solicitar saque</h3>
                  <p className="mt-1 text-xs text-meow-muted">
                    Saldo disponivel: {formatCurrency(statsState.stats.balanceCents)}
                  </p>
                </div>
                <Button size="sm" type="button" onClick={() => setIsPayoutOpen(true)}>
                  Solicitar
                </Button>
              </div>
            </Card>
          ) : null}

          {statsState.stats ? (
            <Card className="rounded-2xl border border-slate-100 p-6 shadow-card">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-meow-charcoal">Cupons</h3>
                <Badge variant="neutral">{statsState.stats.coupons.length}</Badge>
              </div>
              <div className="mt-4 grid gap-2">
                {statsState.stats.coupons.length === 0 ? (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-xs text-meow-muted">
                    Nenhum cupom atrelado.
                  </div>
                ) : (
                  statsState.stats.coupons.map((coupon) => (
                    <div
                      key={coupon.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-xs"
                    >
                      <span className="font-semibold text-meow-charcoal">{coupon.code}</span>
                      <span className="text-meow-muted">Usos: {coupon.usesCount}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      {isPayoutOpen && statsState.stats ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h2 className="text-lg font-black text-meow-charcoal">Solicitar saque</h2>
            <p className="mt-2 text-sm text-meow-muted">
              Informe a chave Pix para receber o valor disponivel.
            </p>

            <form
              className="mt-6 grid gap-4"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!accessToken || !selectedPartnerId) return;
                setPayoutError(null);
                setPayoutSuccess(null);

                const value = payoutAmountCents / 100;
                if (!value || Number.isNaN(value)) {
                  setPayoutError('Informe um valor valido.');
                  return;
                }
                const amountCents = Math.round(value * 100);
                if (amountCents > statsState.stats.balanceCents) {
                  setPayoutError('Saldo insuficiente para este saque.');
                  return;
                }
                if (!payoutPixKey.trim()) {
                  setPayoutError('Informe a chave Pix.');
                  return;
                }

                setPayoutLoading(true);
                try {
                  await partnerApi.requestPayout(accessToken, selectedPartnerId, {
                    amountCents,
                    pixKey: payoutPixKey.trim(),
                    pixKeyType: payoutPixKeyType,
                  });
                  setPayoutSuccess('Solicitacao enviada com sucesso.');
                  setPayoutAmountCents(0);
                  setPayoutPixKey('');
                  await loadStats(selectedPartnerId);
                } catch (error) {
                  setPayoutError(
                    error instanceof Error ? error.message : 'Não foi possível solicitar o saque.',
                  );
                } finally {
                  setPayoutLoading(false);
                }
              }}
            >
              <label className="grid gap-2 text-sm text-meow-charcoal">
                Valor *
                <CurrencyInput
                  valueCents={payoutAmountCents}
                  onValueChange={setPayoutAmountCents}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-meow-charcoal outline-none focus:border-meow-red/60 focus:ring-4 focus:ring-meow-red/10"
                  placeholder="R$ 0,00"
                  required
                />
              </label>

              <label className="grid gap-2 text-sm text-meow-charcoal">
                Tipo de chave *
                <Select
                  className="h-11 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-meow-charcoal"
                  value={payoutPixKeyType}
                  onChange={(event) => setPayoutPixKeyType(event.target.value as typeof payoutPixKeyType)}
                >
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                  <option value="EMAIL">Email</option>
                  <option value="PHONE">Telefone</option>
                  <option value="EVP">Chave aleatoria</option>
                </Select>
              </label>

              <label className="grid gap-2 text-sm text-meow-charcoal">
                Chave Pix *
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-meow-charcoal outline-none focus:border-meow-red/60 focus:ring-4 focus:ring-meow-red/10"
                  placeholder="Digite sua chave"
                  value={payoutPixKey}
                  onChange={(event) => setPayoutPixKey(event.target.value)}
                  required
                />
              </label>

              {payoutError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {payoutError}
                </div>
              ) : null}
              {payoutSuccess ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {payoutSuccess}
                </div>
              ) : null}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsPayoutOpen(false);
                    setPayoutError(null);
                    setPayoutSuccess(null);
                  }}
                  type="button"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={payoutLoading}>
                  {payoutLoading ? 'Enviando...' : 'Solicitar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AccountShell>
  );
};
