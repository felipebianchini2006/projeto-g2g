'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import { adminPartnersApi, type Partner, type PartnerStats } from '../../lib/admin-partners-api';
import { useAuth } from '../auth/auth-provider';
import { AdminShell } from '../admin/admin-shell';

type PartnerForm = {
  name: string;
  slug: string;
  commissionPct: string;
  active: boolean;
};

const emptyForm: PartnerForm = {
  name: '',
  slug: '',
  commissionPct: '65',
  active: true,
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(value / 100);

export const AdminPartnersContent = () => {
  const { user, accessToken, loading } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [stats, setStats] = useState<Record<string, PartnerStats>>({});
  const [baseUrl, setBaseUrl] = useState('');
  const [form, setForm] = useState<PartnerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setBaseUrl(typeof window === 'undefined' ? '' : window.location.origin);
  }, []);

  const handleError = (error: unknown, fallback: string) => {
    if (error instanceof ApiClientError) {
      setError(error.message);
      return;
    }
    setError(error instanceof Error ? error.message : fallback);
  };

  const loadPartners = async () => {
    if (!accessToken) {
      return;
    }
    setBusyAction('load');
    setError(null);
    try {
      const data = await adminPartnersApi.listPartners(accessToken);
      setPartners(data);
    } catch (err) {
      handleError(err, 'Não foi possível carregar parceiros.');
    } finally {
      setBusyAction(null);
    }
  };

  useEffect(() => {
    if (accessToken && user?.role === 'ADMIN') {
      loadPartners();
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
      await loadPartners();
      setNotice('Dados atualizados.');
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

  const commissionBps = useMemo(() => {
    const value = Number(form.commissionPct);
    if (Number.isNaN(value)) {
      return null;
    }
    return Math.round(value * 100);
  }, [form.commissionPct]);

  const handleLoadStats = async (partnerId: string) => {
    if (!accessToken) {
      return;
    }
    setBusyAction(`stats-${partnerId}`);
    setError(null);
    try {
      const data = await adminPartnersApi.getStats(accessToken, partnerId);
      setStats((prev) => ({ ...prev, [partnerId]: data }));
    } catch (err) {
      handleError(err, 'Não foi possível carregar estatisticas.');
    } finally {
      setBusyAction(null);
    }
  };

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
        { label: 'Parceiros' },
      ]}
    >
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">Parceiros</h1>
            <p className="mt-2 text-sm text-meow-muted">
              Gerencie parceiros, comissoes e links de referencia.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
              type="button"
              onClick={loadPartners}
              disabled={busyAction === 'load'}
            >
              {busyAction === 'load' ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>
      </div>

      {error ? <div className="state-card error">{error}</div> : null}
      {notice ? <div className="state-card success">{notice}</div> : null}

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
        <div className="panel-header">
          <h2>{editingId ? 'Editar parceiro' : 'Novo parceiro'}</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="grid gap-2">
            <input
              className="form-input"
              placeholder="Nome"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <input
              className="form-input"
              placeholder="Slug (ex: gamer-001)"
              value={form.slug}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, slug: event.target.value.toLowerCase() }))
              }
            />
            <input
              className="form-input"
              placeholder="Comissão (%)"
              type="number"
              min={0}
              max={100}
              value={form.commissionPct}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, commissionPct: event.target.value }))
              }
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
              className="admin-primary-button"
              type="button"
              disabled={!form.name.trim() || !form.slug.trim() || commissionBps === null}
              onClick={() =>
                runAction('partner-save', async () => {
                  const payload = {
                    name: form.name.trim(),
                    slug: form.slug.trim(),
                    commissionBps: commissionBps ?? 0,
                    active: form.active,
                  };
                  if (editingId) {
                    await adminPartnersApi.updatePartner(accessToken, editingId, payload);
                  } else {
                    await adminPartnersApi.createPartner(accessToken, payload);
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
        {partners.length === 0 ? (
          <div className="state-card">Nenhum parceiro cadastrado.</div>
        ) : (
          partners.map((partner) => {
            const statsInfo = stats[partner.id];
            const referralLink = `${baseUrl || ''}/r/${partner.slug}`;

            return (
              <div key={partner.id} className="grid gap-2">
                <div className="support-row">
                  <div>
                    <strong>{partner.name}</strong>
                    <span className="auth-helper">Slug: {partner.slug}</span>
                    <span className="auth-helper">
                      Comissão: {(partner.commissionBps / 100).toFixed(2)}%
                    </span>
                    <span className="auth-helper">
                      Link: <span className="font-mono text-xs">{referralLink}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => {
                        setEditingId(partner.id);
                        setForm({
                          name: partner.name,
                          slug: partner.slug,
                          commissionPct: String(partner.commissionBps / 100),
                          active: partner.active,
                        });
                      }}
                    >
                      Editar
                    </button>
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => handleLoadStats(partner.id)}
                      disabled={busyAction === `stats-${partner.id}`}
                    >
                      {busyAction === `stats-${partner.id}` ? 'Carregando...' : 'Ver metricas'}
                    </button>
                    <button
                      className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline"
                      type="button"
                      onClick={() => {
                        if (confirm('Tem certeza que deseja excluir/desativar este parceiro?')) {
                          runAction('delete', async () => {
                            await adminPartnersApi.deletePartner(accessToken, partner.id);
                          });
                        }
                      }}
                      disabled={busyAction === 'delete'}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
                {statsInfo ? (
                  <div className="rounded-xl border border-meow-red/20 bg-meow-50 px-3 py-2 text-xs text-meow-muted">
                    <div>Cliques: {statsInfo.clicks}</div>
                    <div>Pedidos atribuídos: {statsInfo.orders}</div>
                    <div>Comissão acumulada: {formatCurrency(statsInfo.commissionCents)}</div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </AdminShell>
  );
};
