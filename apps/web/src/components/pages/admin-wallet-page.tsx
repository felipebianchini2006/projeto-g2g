'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import {
  adminWalletApi,
  type AdminPayoutPayload,
  type AdminWalletSummary,
} from '../../lib/admin-wallet-api';
import { hasAdminPermission } from '../../lib/admin-permissions';
import { useAuth } from '../auth/auth-provider';
import { AdminShell } from '../admin/admin-shell';
import { Button } from '../ui/button';
import { Select } from '../ui/select';

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
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPixKeyType, setWithdrawPixKeyType] =
    useState<AdminPayoutPayload['pixKeyType']>('CPF');
  const [withdrawPixKey, setWithdrawPixKey] = useState('');
  const [withdrawBeneficiaryType, setWithdrawBeneficiaryType] =
    useState<AdminPayoutPayload['beneficiaryType']>('PF');
  const [withdrawBeneficiaryName, setWithdrawBeneficiaryName] = useState('');
  const [withdrawSpeed, setWithdrawSpeed] =
    useState<AdminPayoutPayload['payoutSpeed']>('NORMAL');
  const [withdrawInfoType, setWithdrawInfoType] = useState<'PIX' | 'ACCOUNT'>('PIX');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

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
            : 'Nao foi possivel carregar a carteira.';
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

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-meow-charcoal">Saque do site</h2>
            <p className="mt-2 text-sm text-meow-muted">
              Informe os dados da chave Pix para transferir os lucros da plataforma.
            </p>
          </div>
          <div className="text-sm font-semibold text-meow-charcoal">
            Disponivel: {formatCurrency(summary.platformFeeCents)}
          </div>
        </div>

        <form
          className="mt-6 grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!accessToken) return;
            setWithdrawError(null);
            setWithdrawSuccess(null);
            const value = Number(withdrawAmount.replace(',', '.'));
            if (!value || Number.isNaN(value)) {
              setWithdrawError('Informe um valor valido.');
              return;
            }
            const amountCents = Math.round(value * 100);
            if (amountCents > summary.platformFeeCents) {
              setWithdrawError('Saldo insuficiente para esse saque.');
              return;
            }
            if (!withdrawPixKey.trim() || !withdrawBeneficiaryName.trim()) {
              setWithdrawError('Preencha a chave Pix e o nome do favorecido.');
              return;
            }
            setWithdrawLoading(true);
            try {
              await adminWalletApi.createPayout(accessToken, {
                amountCents,
                pixKey: withdrawPixKey.trim(),
                pixKeyType: withdrawPixKeyType,
                beneficiaryName: withdrawBeneficiaryName.trim(),
                beneficiaryType: withdrawBeneficiaryType,
                payoutSpeed: withdrawSpeed,
              });
              const data = await adminWalletApi.getSummary(accessToken);
              setSummary(data);
              setWithdrawSuccess('Saque solicitado com sucesso.');
              setWithdrawAmount('');
              setWithdrawPixKey('');
              setWithdrawBeneficiaryName('');
            } catch (error) {
              setWithdrawError(
                error instanceof Error
                  ? error.message
                  : 'Nao foi possivel solicitar o saque.',
              );
            } finally {
              setWithdrawLoading(false);
            }
          }}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-meow-charcoal">
              Valor da retirada *
              <input
                type="text"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-meow-charcoal outline-none focus:border-meow-red/60 focus:ring-4 focus:ring-meow-red/10"
                placeholder="R$ 0,00"
                value={withdrawAmount}
                onChange={(event) => setWithdrawAmount(event.target.value)}
                required
              />
            </label>
            <label className="grid gap-2 text-sm text-meow-charcoal">
              Tipo *
              <Select className="h-11 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-meow-charcoal">
                <option value="PIX">Pix</option>
              </Select>
            </label>
          </div>

          <label className="grid gap-2 text-sm text-meow-charcoal">
            Conta Pix *
            <Select className="h-11 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-meow-charcoal">
              <option value="new">Registrar uma nova chave ou dados da conta</option>
            </Select>
          </label>

          <div className="grid gap-2 text-sm text-meow-charcoal">
            Vou informar: *
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${withdrawInfoType === 'PIX'
                  ? 'border-meow-red/40 bg-meow-red/10 text-meow-deep'
                  : 'border-slate-200 text-slate-500'
                  }`}
                onClick={() => setWithdrawInfoType('PIX')}
              >
                A chave PIX
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-400"
                disabled
              >
                Os dados da conta
              </button>
            </div>
          </div>

          <div className="grid gap-2 text-sm text-meow-charcoal">
            Tipo de Beneficiario: *
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${withdrawBeneficiaryType === 'PF'
                  ? 'border-meow-red/40 bg-meow-red/10 text-meow-deep'
                  : 'border-slate-200 text-slate-500'
                  }`}
                onClick={() => setWithdrawBeneficiaryType('PF')}
              >
                Pessoa Fisica
              </button>
              <button
                type="button"
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${withdrawBeneficiaryType === 'PJ'
                  ? 'border-meow-red/40 bg-meow-red/10 text-meow-deep'
                  : 'border-slate-200 text-slate-500'
                  }`}
                onClick={() => setWithdrawBeneficiaryType('PJ')}
              >
                Pessoa Juridica
              </button>
            </div>
          </div>

          <label className="grid gap-2 text-sm text-meow-charcoal">
            Tipo de chave *
            <Select
              className="h-11 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-meow-charcoal"
              value={withdrawPixKeyType}
              onChange={(event) =>
                setWithdrawPixKeyType(
                  event.target.value as AdminPayoutPayload['pixKeyType'],
                )
              }
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
              placeholder="CPF da sua chave Pix"
              value={withdrawPixKey}
              onChange={(event) => setWithdrawPixKey(event.target.value)}
              required
            />
          </label>

          <label className="grid gap-2 text-sm text-meow-charcoal">
            Nome do favorecido *
            <input
              type="text"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-meow-charcoal outline-none focus:border-meow-red/60 focus:ring-4 focus:ring-meow-red/10"
              placeholder="Nome completo do favorecido"
              value={withdrawBeneficiaryName}
              onChange={(event) => setWithdrawBeneficiaryName(event.target.value)}
              required
            />
          </label>

          <div className="grid gap-2 text-sm text-meow-charcoal">
            Tipo de saque *
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${withdrawSpeed === 'NORMAL'
                  ? 'border-meow-red/40 bg-meow-red/10 text-meow-deep'
                  : 'border-slate-200 text-slate-500'
                  }`}
                onClick={() => setWithdrawSpeed('NORMAL')}
              >
                Retirada normal
              </button>
              <button
                type="button"
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${withdrawSpeed === 'INSTANT'
                  ? 'border-meow-red/40 bg-meow-red/10 text-meow-deep'
                  : 'border-slate-200 text-slate-500'
                  }`}
                onClick={() => setWithdrawSpeed('INSTANT')}
              >
                Retirada imediata
              </button>
            </div>
          </div>

          {withdrawError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {withdrawError}
            </div>
          ) : null}
          {withdrawSuccess ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {withdrawSuccess}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={withdrawLoading}>
              {withdrawLoading ? 'Enviando...' : 'Solicitar saque'}
            </Button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
};
