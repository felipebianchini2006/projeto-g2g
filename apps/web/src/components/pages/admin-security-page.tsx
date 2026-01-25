'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import {
  adminSecurityApi,
  type AdminSecurityPayout,
} from '../../lib/admin-security-api';
import { useAuth } from '../auth/auth-provider';
import { AdminShell } from '../admin/admin-shell';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

const parseAmountToCents = (value: string) => {
  const normalized = value.replace(/[^0-9,.-]/g, '');
  const cleaned = normalized.includes(',')
    ? normalized.replace(/\./g, '').replace(',', '.')
    : normalized;
  const amount = Number(cleaned);
  if (!Number.isFinite(amount)) {
    return 0;
  }
  return Math.round(amount * 100);
};

const detectDevice = (userAgent?: string | null) => {
  if (!userAgent) {
    return 'Desconhecido';
  }
  if (/android|iphone|ipad|mobile/i.test(userAgent)) {
    return 'Mobile';
  }
  return 'Desktop';
};

const blockDurations = [
  { label: '2 meses', days: 60 },
  { label: '3 meses', days: 90 },
  { label: '7 anos', days: 365 * 7 },
];

export const AdminSecurityContent = () => {
  const { user, loading, accessToken } = useAuth();
  const [payouts, setPayouts] = useState<AdminSecurityPayout[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceReason, setBalanceReason] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState(blockDurations[0].days);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    if (!accessToken || user?.role !== 'ADMIN') {
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await adminSecurityApi.listPayouts(accessToken, { take: 50 });
        setPayouts(data.items);
        setSelectedId((prev) => prev ?? data.items[0]?.id ?? null);
      } catch (error) {
        const message =
          error instanceof ApiClientError
            ? error.message
            : 'Nao foi possivel carregar os registros.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [accessToken, user?.role]);

  const selectedPayout = useMemo(
    () => payouts.find((item) => item.id === selectedId) ?? null,
    [payouts, selectedId],
  );

  const selectedUser = selectedPayout?.user ?? null;
  const cpfUsedLabel = selectedPayout?.cpfUsedBefore ? 'Sim' : 'Nao';
  const deviceLabel = detectDevice(selectedPayout?.requestUserAgent);

  const refreshPayouts = async () => {
    if (!accessToken) {
      return;
    }
    try {
      const data = await adminSecurityApi.listPayouts(accessToken, { take: 50 });
      setPayouts(data.items);
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Nao foi possivel carregar os registros.';
      setError(message);
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
        { label: 'Seguranca' },
      ]}
    >
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">Seguranca</h1>
            <p className="mt-2 text-sm text-meow-muted">
              Auditoria de saques, sinais de risco e acoes administrativas.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setActionMessage(null);
              refreshPayouts();
            }}
          >
            Atualizar
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {actionMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {actionMessage}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-meow-charcoal">Solicitacoes de saque</h2>
            <span className="text-xs text-meow-muted">{payouts.length} registros</span>
          </div>

          <div className="mt-4 space-y-3">
            {isLoading ? (
              <p className="text-sm text-meow-muted">Carregando...</p>
            ) : payouts.length === 0 ? (
              <p className="text-sm text-meow-muted">Nenhum saque encontrado.</p>
            ) : (
              payouts.map((payout) => (
                <button
                  key={payout.id}
                  type="button"
                  onClick={() => setSelectedId(payout.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    payout.id === selectedId
                      ? 'border-meow-red/40 bg-meow-red/10'
                      : 'border-slate-100 hover:border-meow-red/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-meow-charcoal">
                        {payout.user?.fullName ?? payout.user?.email ?? 'Usuario'}
                      </p>
                      <p className="text-xs text-meow-muted">CPF: {payout.user?.cpf ?? 'Nao informado'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-meow-charcoal">
                        {formatCurrency(payout.amountCents, payout.currency)}
                      </p>
                      <p className="text-[11px] text-meow-muted">
                        {new Date(payout.createdAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-meow-muted">
                    <span className="rounded-full border border-slate-200 px-2 py-0.5">
                      Status: {payout.status}
                    </span>
                    <span className="rounded-full border border-slate-200 px-2 py-0.5">
                      CPF ja usado: {payout.cpfUsedBefore ? 'Sim' : 'Nao'}
                    </span>
                    <span className="rounded-full border border-slate-200 px-2 py-0.5">
                      Saques: {payout.payoutCount}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
          <h2 className="text-base font-bold text-meow-charcoal">Detalhes e acoes</h2>

          {!selectedPayout ? (
            <p className="mt-4 text-sm text-meow-muted">Selecione um saque para ver detalhes.</p>
          ) : (
            <div className="mt-4 space-y-6">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-bold text-meow-charcoal">{selectedUser?.fullName ?? 'Usuario'}</p>
                <p className="text-xs text-meow-muted">{selectedUser?.email}</p>
                <div className="mt-3 grid gap-2 text-xs text-meow-muted">
                  <div>CPF: {selectedUser?.cpf ?? 'Nao informado'}</div>
                  <div>CPF ja usado antes: {cpfUsedLabel}</div>
                  <div>Payouts anteriores: {selectedPayout.payoutCount}</div>
                  <div>
                    Bloqueio de saque:{' '}
                    {selectedUser?.payoutBlockedAt ? 'Ativo' : 'Nao'}
                  </div>
                  <div>
                    Banimento:{' '}
                    {selectedUser?.blockedAt && (!selectedUser.blockedUntil || new Date(selectedUser.blockedUntil) > new Date())
                      ? `Ativo ate ${selectedUser.blockedUntil ? new Date(selectedUser.blockedUntil).toLocaleDateString('pt-BR') : 'indefinido'}`
                      : 'Nao'}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <p className="text-sm font-bold text-meow-charcoal">Dados do saque</p>
                <div className="mt-2 grid gap-2 text-xs text-meow-muted">
                  <div>Valor: {formatCurrency(selectedPayout.amountCents, selectedPayout.currency)}</div>
                  <div>Status: {selectedPayout.status}</div>
                  <div>Pix: {selectedPayout.pixKey}</div>
                  <div>Favorecido: {selectedPayout.beneficiaryName}</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <p className="text-sm font-bold text-meow-charcoal">Origem da solicitacao</p>
                <div className="mt-2 grid gap-2 text-xs text-meow-muted">
                  <div>IP: {selectedPayout.requestIp ?? 'Nao registrado'}</div>
                  <div>Dispositivo: {deviceLabel}</div>
                  <div className="break-words">User-Agent: {selectedPayout.requestUserAgent ?? 'Nao registrado'}</div>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-xl border border-slate-100 bg-white p-4">
                  <p className="text-sm font-bold text-meow-charcoal">Editar saldo</p>
                  <div className="mt-3 grid gap-3">
                    <Input
                      placeholder="Ex: 100,00 ou -50,00"
                      value={balanceAmount}
                      onChange={(event) => setBalanceAmount(event.target.value)}
                    />
                    <Input
                      placeholder="Motivo do ajuste"
                      value={balanceReason}
                      onChange={(event) => setBalanceReason(event.target.value)}
                    />
                    <Button
                      size="sm"
                      disabled={actionBusy || !balanceAmount.trim() || balanceReason.trim().length < 3}
                      onClick={async () => {
                        if (!accessToken || !selectedUser) return;
                        setActionBusy(true);
                        setError(null);
                        setActionMessage(null);
                        try {
                          const amountCents = parseAmountToCents(balanceAmount);
                          if (!amountCents) {
                            setError('Informe um valor diferente de zero.');
                            return;
                          }
                          await adminSecurityApi.adjustBalance(accessToken, selectedUser.id, {
                            amountCents,
                            reason: balanceReason.trim(),
                          });
                          setBalanceAmount('');
                          setBalanceReason('');
                          setActionMessage('Saldo ajustado com sucesso.');
                        } catch (error) {
                          setError(error instanceof Error ? error.message : 'Falha ao ajustar saldo.');
                        } finally {
                          setActionBusy(false);
                        }
                      }}
                    >
                      Aplicar ajuste
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-white p-4">
                  <p className="text-sm font-bold text-meow-charcoal">Reter saque</p>
                  <div className="mt-3 grid gap-3">
                    <Input
                      placeholder="Motivo da retencao"
                      value={blockReason}
                      onChange={(event) => setBlockReason(event.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={actionBusy || blockReason.trim().length < 3}
                        onClick={async () => {
                          if (!accessToken || !selectedUser) return;
                          setActionBusy(true);
                          setError(null);
                          setActionMessage(null);
                          try {
                            await adminSecurityApi.blockPayouts(
                              accessToken,
                              selectedUser.id,
                              blockReason.trim(),
                            );
                            setBlockReason('');
                            setActionMessage('Saque retido para o vendedor.');
                            await refreshPayouts();
                          } catch (error) {
                            setError(error instanceof Error ? error.message : 'Falha ao reter saque.');
                          } finally {
                            setActionBusy(false);
                          }
                        }}
                      >
                        Reter saques
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={actionBusy}
                        onClick={async () => {
                          if (!accessToken || !selectedUser) return;
                          setActionBusy(true);
                          setError(null);
                          setActionMessage(null);
                          try {
                            await adminSecurityApi.unblockPayouts(accessToken, selectedUser.id);
                            setActionMessage('Retencao removida.');
                            await refreshPayouts();
                          } catch (error) {
                            setError(error instanceof Error ? error.message : 'Falha ao liberar saque.');
                          } finally {
                            setActionBusy(false);
                          }
                        }}
                      >
                        Liberar saques
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-white p-4">
                  <p className="text-sm font-bold text-meow-charcoal">Banimento temporario</p>
                  <div className="mt-3 grid gap-3">
                    <Select
                      value={String(banDuration)}
                      onChange={(event) => setBanDuration(Number(event.target.value))}
                      className="h-11 rounded-xl border-slate-200 bg-white"
                    >
                      {blockDurations.map((duration) => (
                        <option key={duration.days} value={duration.days}>
                          {duration.label}
                        </option>
                      ))}
                    </Select>
                    <Input
                      placeholder="Motivo do banimento"
                      value={banReason}
                      onChange={(event) => setBanReason(event.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={actionBusy || banReason.trim().length < 3}
                        onClick={async () => {
                          if (!accessToken || !selectedUser) return;
                          setActionBusy(true);
                          setError(null);
                          setActionMessage(null);
                          try {
                            await adminSecurityApi.blockUser(accessToken, selectedUser.id, {
                              durationDays: banDuration,
                              reason: banReason.trim(),
                            });
                            setBanReason('');
                            setActionMessage('Banimento aplicado.');
                            await refreshPayouts();
                          } catch (error) {
                            setError(error instanceof Error ? error.message : 'Falha ao banir vendedor.');
                          } finally {
                            setActionBusy(false);
                          }
                        }}
                      >
                        Banir vendedor
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={actionBusy}
                        onClick={async () => {
                          if (!accessToken || !selectedUser) return;
                          setActionBusy(true);
                          setError(null);
                          setActionMessage(null);
                          try {
                            await adminSecurityApi.unblockUser(accessToken, selectedUser.id);
                            setActionMessage('Banimento removido.');
                            await refreshPayouts();
                          } catch (error) {
                            setError(error instanceof Error ? error.message : 'Falha ao remover banimento.');
                          } finally {
                            setActionBusy(false);
                          }
                        }}
                      >
                        Remover banimento
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
};
