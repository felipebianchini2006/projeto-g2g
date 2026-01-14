'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUp,
  CheckCircle2,
  Clock,
  Gem,
  Lock,
  RefreshCw,
} from 'lucide-react';

import { ApiClientError } from '../../lib/api-client';
import { walletApi, type WalletSummary } from '../../lib/wallet-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Select } from '../ui/select';

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

type WalletState = {
  status: 'loading' | 'ready';
  summary: WalletSummary | null;
  error?: string;
};

type ChartPoint = {
  label: string;
  value: number;
};

type ChartState = {
  status: 'loading' | 'ready';
  data: ChartPoint[];
  error?: string;
};

const lastDays = 7;

const formatDayLabel = (date: Date) =>
  date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

const buildLastDays = () => {
  const days: { key: string; label: string }[] = [];
  for (let offset = lastDays - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const key = date.toISOString().slice(0, 10);
    days.push({ key, label: formatDayLabel(date) });
  }
  return days;
};

const fallbackChart: ChartPoint[] = buildLastDays().map((day, index) => ({
  label: day.label,
  value: [120, 160, 90, 180, 240, 210, 260][index] ?? 120,
}));

type AreaLineChartProps = {
  data: ChartPoint[];
};

const AreaLineChart = ({ data }: AreaLineChartProps) => {
  const width = 560;
  const height = 200;
  const paddingX = 20;
  const paddingY = 20;
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const stepX = data.length > 1 ? (width - paddingX * 2) / (data.length - 1) : 0;

  const points = data.map((item, index) => {
    const x = paddingX + stepX * index;
    const y =
      height -
      paddingY -
      (Math.max(item.value, 0) / maxValue) * (height - paddingY * 2);
    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const areaPath = `${linePath} L ${width - paddingX} ${height - paddingY} L ${paddingX} ${height - paddingY} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full text-pink-500">
      <defs>
        <linearGradient id="wallet-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#wallet-area)" />
      <path d={linePath} fill="none" stroke="currentColor" strokeWidth="3" />
      {points.map((point) => (
        <circle
          key={`${point.x}-${point.y}`}
          cx={point.x}
          cy={point.y}
          r="5"
          fill="#fff"
          stroke="currentColor"
          strokeWidth="3"
        />
      ))}
    </svg>
  );
};

export const WalletSummaryContent = () => {
  const { user, accessToken, loading } = useAuth();
  const [state, setState] = useState<WalletState>({
    status: 'loading',
    summary: null,
  });
  const [chartState, setChartState] = useState<ChartState>({
    status: 'loading',
    data: fallbackChart,
  });

  const accessAllowed = user?.role === 'USER' || user?.role === 'SELLER' || user?.role === 'ADMIN';

  const loadSummary = async () => {
    if (!accessToken) {
      return;
    }
    setState((prev) => ({ ...prev, status: 'loading', error: undefined }));
    try {
      const summary = await walletApi.getSummary(accessToken);
      setState({ status: 'ready', summary });
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível carregar a carteira.';
      setState({ status: 'ready', summary: null, error: message });
    }
  };

  const loadChartEntries = async () => {
    if (!accessToken) {
      return;
    }
    setChartState((prev) => ({ ...prev, status: 'loading', error: undefined }));
    const days = buildLastDays();
    const from = days[0]?.key;
    const to = days[days.length - 1]?.key;
    try {
      const result = await walletApi.listEntries(accessToken, {
        from,
        to,
        take: 100,
      });
      const totals = new Map<string, number>();
      result.items.forEach((entry) => {
        const key = entry.createdAt.slice(0, 10);
        const signed = entry.type === 'DEBIT' ? -entry.amountCents : entry.amountCents;
        totals.set(key, (totals.get(key) ?? 0) + signed / 100);
      });
      const data = days.map((day) => ({
        label: day.label,
        value: Math.max(0, totals.get(day.key) ?? 0),
      }));
      const hasData = data.some((item) => item.value > 0);
      setChartState({ status: 'ready', data: hasData ? data : fallbackChart });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível carregar o grafico.';
      setChartState({ status: 'ready', data: fallbackChart, error: message });
    }
  };

  const handleRefresh = () => {
    loadSummary();
    loadChartEntries();
  };

  useEffect(() => {
    if (accessToken && accessAllowed) {
      loadSummary();
      loadChartEntries();
    }
  }, [accessToken, accessAllowed]);

  const yAxisLabels = useMemo(() => {
    const max = Math.max(...chartState.data.map((item) => item.value), 0);
    const roundedMax = Math.max(50, Math.ceil(max / 50) * 50);
    const step = roundedMax / 5;
    return Array.from({ length: 6 }, (_, index) => roundedMax - step * index);
  }, [chartState.data]);

  if (loading) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-4 text-sm text-meow-muted">
          Carregando sessão...
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">Entre para acessar sua carteira.</p>
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

  if (!accessAllowed) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">Acesso restrito.</p>
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
    <AccountShell
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Conta', href: '/conta' },
        { label: 'Carteira' },
      ]}
    >
      <Card className="rounded-2xl border border-slate-100 p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-meow-charcoal">Carteira Digital</h1>
              <Badge variant="neutral">BETA</Badge>
            </div>
            <p className="mt-1 text-sm text-meow-muted">
              Gerencie seus ganhos e saques com facilidade.
            </p>
            <Link href="/conta/carteira/extrato" className="mt-2 inline-block text-xs font-semibold text-rose-500">
              Ver extrato
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" type="button" onClick={handleRefresh} className="gap-2">
              <RefreshCw size={14} aria-hidden />
              Atualizar
            </Button>
            <Button size="sm" type="button" className="gap-2">
              <ArrowUp size={14} aria-hidden />
              Sacar
            </Button>
          </div>
        </div>
      </Card>

      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      {state.summary ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              label: 'SALDO DISPONIVEL',
              value: formatCurrency(state.summary.availableCents, state.summary.currency),
              icon: <CheckCircle2 size={18} aria-hidden />,
              className: 'from-emerald-500 to-emerald-600',
            },
            {
              label: 'A RECEBER (FUTURO)',
              value: formatCurrency(state.summary.heldCents, state.summary.currency),
              icon: <Clock size={18} aria-hidden />,
              className: 'from-blue-500 to-blue-600',
            },
            {
              label: 'BLOQUEADO / RETIDO',
              value: formatCurrency(state.summary.reversedCents, state.summary.currency),
              icon: <Lock size={18} aria-hidden />,
              className: 'from-rose-500 to-rose-600',
            },
          ].map((card) => (
            <Card
              key={card.label}
              className={`relative overflow-hidden rounded-[22px] border border-slate-100 bg-gradient-to-br ${card.className} p-5 text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)]`}
            >
              <span className="absolute right-[-10px] top-[-10px] h-16 w-16 rounded-full bg-white/15" />
              <div className="flex items-center justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/30 bg-white/10">
                  {card.icon}
                </div>
              </div>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.4px] text-white/80">
                {card.label}
              </p>
              <p className="mt-2 text-2xl font-black">{card.value}</p>
            </Card>
          ))}
        </div>
      ) : null}

      {state.status === 'loading' && !state.summary ? (
        <div className="rounded-xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
          Carregando carteira...
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Card className="rounded-2xl border border-slate-100 p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-black text-meow-charcoal">Fluxo de caixa</h2>
            <Select className="h-9 w-[160px]" defaultValue="7">
              <option value="7">Ultimos 7 dias</option>
            </Select>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-[auto_1fr]">
            <div className="flex flex-col justify-between text-xs text-meow-muted">
              {yAxisLabels.map((value) => (
                <span key={value}>R$ {value.toFixed(0)}</span>
              ))}
            </div>
            <div className="h-52 w-full rounded-2xl bg-gradient-to-b from-pink-50 to-white p-4">
              <AreaLineChart data={chartState.data} />
            </div>
          </div>
          {chartState.error ? (
            <div className="mt-3 text-xs text-red-500">{chartState.error}</div>
          ) : null}
        </Card>

        <Card className="rounded-2xl border border-slate-100 p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-meow-charcoal">Nivel de vendedor</h2>
          </div>
          <p className="mt-2 text-xs text-meow-muted">
            Aumente suas vendas para reduzir taxas!
          </p>
          <div className="mt-6 flex items-center justify-center">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-pink-50 text-rose-500">
              <Gem size={24} aria-hidden />
              <span className="mt-2 rounded-full bg-white px-3 py-1 text-[10px] font-bold text-rose-500">
                OURO
              </span>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-rose-500">R$ 1.700</span>
              <span className="text-meow-muted">Meta: R$ 5.000</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100">
              <div className="h-2 w-[45%] rounded-full bg-gradient-to-r from-rose-400 to-purple-400" />
            </div>
            <div className="mt-3 rounded-2xl border border-purple-100 bg-purple-50 px-3 py-2 text-xs text-purple-600">
              Proximo nivel: Taxa de saque 0%
            </div>
          </div>
        </Card>
      </div>
    </AccountShell>
  );
};
