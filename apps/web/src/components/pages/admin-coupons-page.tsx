'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import {
  Ticket,
  Percent,
  Calendar,
  Users,
  BarChart2,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Save,
  ChevronLeft,
  X,
  CreditCard,
  Hash,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

import { ApiClientError } from '../../lib/api-client';
import { adminCouponsApi, type Coupon } from '../../lib/admin-coupons-api';
import { adminPartnersApi, type Partner } from '../../lib/admin-partners-api';
import { hasAdminPermission } from '../../lib/admin-permissions';
import { useAuth } from '../auth/auth-provider';
import { AdminShell } from '../admin/admin-shell';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

type CouponForm = {
  code: string;
  partnerId: string;
  active: boolean;
  discountType: 'percent' | 'fixed';
  discountPercent: string;
  discountCents: string;
  startsAt: string;
  endsAt: string;
  maxUses: string;
};

const emptyForm: CouponForm = {
  code: '',
  partnerId: '',
  active: true,
  discountType: 'percent',
  discountPercent: '5',
  discountCents: '',
  startsAt: '',
  endsAt: '',
  maxUses: '',
};

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(cents / 100);

export const AdminCouponsContent = () => {
  const { user, accessToken, loading } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingStatsId, setViewingStatsId] = useState<string | null>(null);
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

  const loadData = async () => {
    if (!accessToken) return;
    setBusyAction('load');
    setError(null);
    try {
      const [couponsData, partnersData] = await Promise.all([
        adminCouponsApi.listCoupons(accessToken),
        adminPartnersApi.listPartners(accessToken),
      ]);
      setCoupons(couponsData);
      setPartners(partnersData);
    } catch (err) {
      handleError(err, 'Não foi possível carregar cupons.');
    } finally {
      setBusyAction(null);
    }
  };

  useEffect(() => {
    if (accessToken && hasAdminPermission(user, 'admin.coupons')) {
      loadData();
    }
  }, [accessToken, user?.role, user?.adminPermissions]);

  const runAction = async (label: string, action: () => Promise<void>) => {
    if (!accessToken) return;
    setBusyAction(label);
    setError(null);
    setNotice(null);
    try {
      await action();
      await loadData();
      setNotice('Cupons atualizados.');
    } catch (err) {
      handleError(err, 'Não foi possível salvar.');
    } finally {
      setBusyAction(null);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setViewingStatsId(null);
  };

  const startEditing = (coupon: Coupon) => {
    setEditingId(coupon.id);
    setViewingStatsId(null);
    setForm({
      code: coupon.code,
      partnerId: coupon.partnerId ?? '',
      active: coupon.active,
      discountType: coupon.discountBps ? 'percent' : 'fixed',
      discountPercent: coupon.discountBps ? String(coupon.discountBps / 100) : '',
      discountCents: coupon.discountCents ? String(coupon.discountCents) : '',
      startsAt: coupon.startsAt ? coupon.startsAt.slice(0, 16) : '',
      endsAt: coupon.endsAt ? coupon.endsAt.slice(0, 16) : '',
      maxUses: coupon.maxUses ? String(coupon.maxUses) : '',
    });
  };
  const startViewingStats = (couponId: string) => {
    setViewingStatsId(couponId);
    setEditingId(null);
  };

  const discountPercent = Number(form.discountPercent);
  const discountCents = Number(form.discountCents);
  const maxUses = Number(form.maxUses);
  const selectedCoupon = useMemo(
    () => (viewingStatsId ? coupons.find((coupon) => coupon.id === viewingStatsId) : null),
    [coupons, viewingStatsId],
  );
  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString('pt-BR') : '—';

  const canSave =
    form.code.trim().length > 0 &&
    (form.discountType === 'percent'
      ? !Number.isNaN(discountPercent) && discountPercent > 0
      : !Number.isNaN(discountCents) && discountCents > 0);

  if (loading) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-4 text-sm text-meow-muted">
          Carregando sessão...
        </div>
      </section>
    );
  }

  if (!user || !hasAdminPermission(user, 'admin.coupons')) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">Acesso restrito ao admin.</p>
          <Link
            className="mt-4 inline-flex rounded-full bg-meow-linear px-6 py-2 text-sm font-bold text-white transition hover:opacity-90"
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
        { label: 'Cupons' },
      ]}
    >
      <Card className="rounded-2xl border border-meow-red/20 p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">Cupons</h1>
            <p className="mt-2 text-sm text-meow-muted">
              Cadastre cupons de desconto e conecte com parceiros.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadData}
              disabled={busyAction === 'load'}
            >
              <RefreshCw size={16} className={`mr-2 ${busyAction === 'load' ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Link
              href="/conta"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-400 shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition hover:text-meow-deep hover:shadow-md"
            >
              <ChevronLeft size={20} />
            </Link>
          </div>
        </div>
      </Card>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 animate-in fade-in slide-in-from-top-2">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Left Column: List */}
        <div className="space-y-4">
          <Card className="rounded-2xl border border-slate-200 bg-slate-50/50 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3">
              <h2 className="text-sm font-bold text-meow-charcoal">Cupons Ativos</h2>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={resetForm}>
                <Plus size={14} className="mr-1.5" /> Novo Cupom
              </Button>
            </div>

            <div className="divide-y divide-slate-100">
              {coupons.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-meow-muted">
                  <Ticket size={48} className="text-slate-200 mb-3" />
                  <p>Nenhum cupom cadastrado.</p>
                </div>
              ) : (
                coupons.map(coupon => (
                  <div key={coupon.id} className={`p-4 transition-colors hover:bg-white ${editingId === coupon.id ? 'bg-white shadow-[inset_4px_0_0_0_#D86B95]' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-meow-deep text-lg bg-meow-red/5 px-2 py-0.5 rounded border border-meow-red/10 border-dashed">
                            {coupon.code}
                          </span>
                          {coupon.active ? (
                            <Badge variant="success" size="sm">Ativo</Badge>
                          ) : (
                            <Badge variant="neutral" size="sm">Inativo</Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                          <span className="flex items-center gap-1.5 font-semibold text-meow-charcoal">
                            {coupon.discountBps ? <Percent size={12} /> : <CreditCard size={12} />}
                            {coupon.discountBps
                              ? `${(coupon.discountBps / 100).toFixed(2)}% OFF`
                              : `${formatCurrency(coupon.discountCents ?? 0)} OFF`
                            }
                          </span>

                          {coupon.partner ? (
                            <span className="flex items-center gap-1.5">
                              <Users size={12} /> {coupon.partner.name}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 opacity-50">
                              <Users size={12} /> Sem parceiro/Global
                            </span>
                          )}

                          <span className="flex items-center gap-1.5">
                            <Hash size={12} /> Usos: {coupon.usesCount} {coupon.maxUses ? `/ ${coupon.maxUses}` : ''}
                          </span>
                        </div>

                        {(coupon.startsAt || coupon.endsAt) && (
                          <div className="flex items-center gap-3 text-[10px] text-slate-400">
                            {coupon.startsAt && <span className="flex items-center gap-1"><Clock size={10} /> Início: {new Date(coupon.startsAt).toLocaleDateString()}</span>}
                            {coupon.endsAt && <span className="flex items-center gap-1"><Clock size={10} /> Fim: {new Date(coupon.endsAt).toLocaleDateString()}</span>}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => startEditing(coupon)}>
                          <Edit2 size={14} className="text-slate-400 hover:text-meow-deep" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => startViewingStats(coupon.id)}
                          aria-label="Ver estatisticas"
                        >
                          <BarChart2 size={14} className="text-slate-400 hover:text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => {
                          if (confirm('Tem certeza que deseja excluir este cupom?')) {
                            runAction('delete', async () => {
                              await adminCouponsApi.deleteCoupon(accessToken!, coupon.id);
                            });
                          }
                        }}>
                          <Trash2 size={14} className="text-slate-400 hover:text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Form */}
        <div className="relative">
          <div className="sticky top-6">
            {viewingStatsId && selectedCoupon ? (
              <Card className="rounded-2xl border border-blue-100 bg-blue-50/50 p-0 shadow-card overflow-hidden">
                <div className="bg-blue-100 px-5 py-3 border-b border-blue-200 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                    <BarChart2 size={16} /> Estatisticas do cupom
                  </h2>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 hover:bg-blue-200 text-blue-700"
                    onClick={() => setViewingStatsId(null)}
                  >
                    <XCircle size={14} />
                  </Button>
                </div>
                <div className="p-5 grid gap-4">
                  <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-1">Usos</span>
                    <span className="text-xl font-black text-blue-900">
                      {selectedCoupon.usesCount}
                      {selectedCoupon.maxUses ? ` / ${selectedCoupon.maxUses}` : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-1">Desconto</span>
                      <span className="text-sm font-black text-blue-900">
                        {selectedCoupon.discountBps
                          ? `${(selectedCoupon.discountBps / 100).toFixed(2)}%`
                          : formatCurrency(selectedCoupon.discountCents ?? 0)}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-1">Status</span>
                      <span className="text-sm font-black text-blue-900">
                        {selectedCoupon.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-1">Validade</span>
                    <span className="text-xs font-semibold text-blue-900">
                      Inicio: {formatDate(selectedCoupon.startsAt)}
                    </span>
                    <span className="text-xs font-semibold text-blue-900">
                      Fim: {formatDate(selectedCoupon.endsAt)}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-1">Parceiro</span>
                    <span className="text-sm font-black text-blue-900">
                      {selectedCoupon.partner?.name ?? 'Global'}
                    </span>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="rounded-2xl border border-slate-200 shadow-card">
              <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-md font-bold text-meow-charcoal">
                    {editingId ? 'Editar Cupom' : 'Novo Cupom'}
                  </h2>
                  <p className="text-xs text-meow-muted mt-1">{editingId ? 'Atualize as regras do cupom.' : 'Defina as regras do novo desconto.'}</p>
                </div>
                {editingId && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={resetForm}>
                    Cancelar
                  </Button>
                )}
              </div>

              <div className="p-5 space-y-4">
                {/* Coupon Code */}
                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                  Código do Cupom
                  <Input
                    placeholder="EX: VERAO2026"
                    value={form.code}
                    onChange={(e) => setForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="font-mono uppercase placeholder:font-sans"
                  />
                </label>

                {/* Partner Link */}
                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                  Vincular Parceiro (Opcional)
                  <select
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-meow-red/50"
                    value={form.partnerId}
                    onChange={e => setForm(prev => ({ ...prev, partnerId: e.target.value }))}
                  >
                    <option value="">Nenhum (Cupom Global)</option>
                    {partners.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.slug})</option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                    Tipo de Desconto
                    <select
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none"
                      value={form.discountType}
                      onChange={e => setForm(prev => ({ ...prev, discountType: e.target.value as 'percent' | 'fixed' }))}
                    >
                      <option value="percent">Porcentagem %</option>
                      <option value="fixed">Valor Fixo R$</option>
                    </select>
                  </label>

                  <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                    Valor
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        value={form.discountType === 'percent' ? form.discountPercent : form.discountCents}
                        onChange={e => {
                          const val = e.target.value;
                          if (form.discountType === 'percent') {
                            setForm(prev => ({ ...prev, discountPercent: val }));
                          } else {
                            setForm(prev => ({ ...prev, discountCents: val }));
                          }
                        }}
                        placeholder={form.discountType === 'percent' ? "10" : "500"}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">
                        {form.discountType === 'percent' ? '%' : 'cents'}
                      </span>
                    </div>
                  </label>
                </div>

                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <h3 className="text-[10px] font-bold uppercase text-meow-muted tracking-wider">Limites & Validade</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                      Início (Opcional)
                      <Input
                        type="datetime-local"
                        value={form.startsAt}
                        onChange={e => setForm(prev => ({ ...prev, startsAt: e.target.value }))}
                        className="text-[10px]"
                      />
                    </label>
                    <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                      Fim (Opcional)
                      <Input
                        type="datetime-local"
                        value={form.endsAt}
                        onChange={e => setForm(prev => ({ ...prev, endsAt: e.target.value }))}
                        className="text-[10px]"
                      />
                    </label>
                  </div>

                  <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                    Limite de Usos Global
                    <Input
                      type="number"
                      min={1}
                      placeholder="Infinito se vazio"
                      value={form.maxUses}
                      onChange={e => setForm(prev => ({ ...prev, maxUses: e.target.value }))}
                    />
                  </label>

                  <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                    <span className="text-sm font-medium text-slate-700">Cupom Ativo?</span>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.active}
                        onChange={e => setForm(prev => ({ ...prev, active: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-meow-red/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-meow-linear"></div>
                    </div>
                  </label>
                </div>

                <Button
                  className="w-full"
                  disabled={!canSave || busyAction === 'coupon-save'}
                  onClick={() =>
                    runAction('coupon-save', async () => {
                      const payload = {
                        code: form.code.trim().toUpperCase(),
                        partnerId: form.partnerId || null,
                        active: form.active,
                        discountBps:
                          form.discountType === 'percent' ? Math.round(discountPercent * 100) : null,
                        discountCents: form.discountType === 'fixed' ? discountCents : null,
                        startsAt: form.startsAt || null,
                        endsAt: form.endsAt || null,
                        maxUses: Number.isNaN(maxUses) || maxUses <= 0 ? null : maxUses,
                      };
                      if (editingId) {
                        await adminCouponsApi.updateCoupon(accessToken!, editingId, payload);
                      } else {
                        await adminCouponsApi.createCoupon(accessToken!, payload);
                      }
                      resetForm();
                    })
                  }
                >
                  {busyAction === 'coupon-save' ? 'Salvando...' : <><Save size={16} className="mr-2" /> {editingId ? 'Atualizar Cupom' : 'Criar Cupom'}</>}
                </Button>
              </div>
            </Card>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
};
