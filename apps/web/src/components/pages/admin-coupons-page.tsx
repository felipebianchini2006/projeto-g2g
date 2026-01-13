'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { adminCouponsApi, type Coupon } from '../../lib/admin-coupons-api';
import { adminPartnersApi, type Partner } from '../../lib/admin-partners-api';
import { useAuth } from '../auth/auth-provider';
import { AdminShell } from '../admin/admin-shell';
import { NotificationsBell } from '../notifications/notifications-bell';

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

export const AdminCouponsContent = () => {
  const { user, accessToken, loading } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
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
    if (!accessToken) {
      return;
    }
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
    if (accessToken && user?.role === 'ADMIN') {
      loadData();
    }
  }, [accessToken, user?.role]);

  const runAction = async (label: string, action: () => Promise<void>) => {
    if (!accessToken) {
      return;
    }
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
  };

  const discountPercent = Number(form.discountPercent);
  const discountCents = Number(form.discountCents);
  const maxUses = Number(form.maxUses);

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
        { label: 'Cupons' },
      ]}
    >
      <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">Cupons</h1>
            <p className="mt-2 text-sm text-meow-muted">
              Cadastre cupons e conecte com parceiros.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <button
              className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
              type="button"
              onClick={loadData}
              disabled={busyAction === 'load'}
            >
              {busyAction === 'load' ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>
      </div>

      {error ? <div className="state-card error">{error}</div> : null}
      {notice ? <div className="state-card success">{notice}</div> : null}

      <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-card">
        <div className="panel-header">
          <h2>{editingId ? 'Editar cupom' : 'Novo cupom'}</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="grid gap-2">
            <input
              className="form-input"
              placeholder="Codigo do cupom"
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
            />
            <select
              className="form-input"
              value={form.partnerId}
              onChange={(event) => setForm((prev) => ({ ...prev, partnerId: event.target.value }))}
            >
              <option value="">Sem parceiro</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name} ({partner.slug})
                </option>
              ))}
            </select>
            <select
              className="form-input"
              value={form.discountType}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  discountType: event.target.value === 'fixed' ? 'fixed' : 'percent',
                }))
              }
            >
              <option value="percent">Percentual (%)</option>
              <option value="fixed">Valor fixo (centavos)</option>
            </select>
            {form.discountType === 'percent' ? (
              <input
                className="form-input"
                type="number"
                min={0}
                max={100}
                placeholder="Desconto em %"
                value={form.discountPercent}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, discountPercent: event.target.value }))
                }
              />
            ) : (
              <input
                className="form-input"
                type="number"
                min={0}
                placeholder="Desconto em centavos"
                value={form.discountCents}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, discountCents: event.target.value }))
                }
              />
            )}
            <div className="grid gap-2 md:grid-cols-2">
              <input
                className="form-input"
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, startsAt: event.target.value }))
                }
              />
              <input
                className="form-input"
                type="datetime-local"
                value={form.endsAt}
                onChange={(event) => setForm((prev) => ({ ...prev, endsAt: event.target.value }))}
              />
            </div>
            <input
              className="form-input"
              type="number"
              min={1}
              placeholder="Limite de usos (opcional)"
              value={form.maxUses}
              onChange={(event) => setForm((prev) => ({ ...prev, maxUses: event.target.value }))}
            />
            <select
              className="form-input"
              value={form.active ? 'active' : 'inactive'}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, active: event.target.value === 'active' }))
              }
            >
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <button
              className="primary-button"
              type="button"
              disabled={!canSave}
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
                    await adminCouponsApi.updateCoupon(accessToken, editingId, payload);
                  } else {
                    await adminCouponsApi.createCoupon(accessToken, payload);
                  }
                  resetForm();
                })
              }
            >
              {editingId ? 'Atualizar' : 'Cadastrar'}
            </button>
            {editingId ? (
              <button className="ghost-button" type="button" onClick={resetForm}>
                Cancelar
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {coupons.length === 0 ? (
          <div className="state-card">Nenhum cupom cadastrado.</div>
        ) : (
          coupons.map((coupon) => (
            <div key={coupon.id} className="support-row">
              <div>
                <strong>{coupon.code}</strong>
                <span className="auth-helper">
                  {coupon.discountBps
                    ? `Desconto: ${(coupon.discountBps / 100).toFixed(2)}%`
                    : `Desconto fixo: ${coupon.discountCents ?? 0}c`}
                </span>
                <span className="auth-helper">
                  Parceiro: {coupon.partner?.name ?? 'Sem parceiro'}
                </span>
                <span className="auth-helper">
                  Usos: {coupon.usesCount}
                  {coupon.maxUses ? ` / ${coupon.maxUses}` : ''}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setEditingId(coupon.id);
                    setForm({
                      code: coupon.code,
                      partnerId: coupon.partnerId ?? '',
                      active: coupon.active,
                      discountType: coupon.discountBps ? 'percent' : 'fixed',
                      discountPercent: coupon.discountBps
                        ? String(coupon.discountBps / 100)
                        : '',
                      discountCents: coupon.discountCents ? String(coupon.discountCents) : '',
                      startsAt: coupon.startsAt ? coupon.startsAt.slice(0, 16) : '',
                      endsAt: coupon.endsAt ? coupon.endsAt.slice(0, 16) : '',
                      maxUses: coupon.maxUses ? String(coupon.maxUses) : '',
                    });
                  }}
                >
                  Editar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </AdminShell>
  );
};
