'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Percent,
  Link as LinkIcon,
  BarChart2,
  Edit2,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  Copy,
  ExternalLink,
  Save,
  XCircle,
} from 'lucide-react';

import { ApiClientError } from '../../lib/api-client';
import { adminPartnersApi, type Partner, type PartnerStats } from '../../lib/admin-partners-api';
import { hasAdminPermission } from '../../lib/admin-permissions';
import { useAuth } from '../auth/auth-provider';
import { AdminShell } from '../admin/admin-shell';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

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
  const [viewingStatsId, setViewingStatsId] = useState<string | null>(null);
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
    if (!accessToken) return;
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
    if (accessToken && hasAdminPermission(user, 'admin.partners')) {
      loadPartners();
    }
  }, [accessToken, user?.role, user?.adminPermissions]);

  const runAction = async (label: string, action: () => Promise<void>) => {
    if (!accessToken) return;
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
    setViewingStatsId(null);
  };

  const startEditing = (partner: Partner) => {
    setEditingId(partner.id);
    setViewingStatsId(null);
    setForm({
      name: partner.name,
      slug: partner.slug,
      commissionPct: String(partner.commissionBps / 100),
      active: partner.active,
    });
  };

  const commissionBps = useMemo(() => {
    const value = Number(form.commissionPct);
    if (Number.isNaN(value)) {
      return null;
    }
    return Math.round(value * 100);
  }, [form.commissionPct]);

  const handleLoadStats = async (partnerId: string) => {
    if (!accessToken) return;
    setViewingStatsId(partnerId);
    setEditingId(null);
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

  if (!user || !hasAdminPermission(user, 'admin.partners')) {
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
        { label: 'Parceiros' },
      ]}
    >
      <Card className="rounded-2xl border border-meow-red/20 p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">Parceiros</h1>
            <p className="mt-2 text-sm text-meow-muted">
              Gerencie parceiros, comissoes e links de referencia.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadPartners}
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
              <h2 className="text-sm font-bold text-meow-charcoal">Parceiros Cadastrados</h2>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={resetForm}>
                <Plus size={14} className="mr-1.5" /> Novo Parceiro
              </Button>
            </div>

            <div className="divide-y divide-slate-100">
              {partners.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-meow-muted">
                  <Users size={48} className="text-slate-200 mb-3" />
                  <p>Nenhum parceiro encontrado.</p>
                </div>
              ) : (
                partners.map(partner => (
                  <div key={partner.id} className={`p-4 transition-colors hover:bg-white ${editingId === partner.id || viewingStatsId === partner.id ? 'bg-white shadow-[inset_4px_0_0_0_#D86B95]' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-meow-deep text-sm">{partner.name}</span>
                          <Badge variant={partner.active ? 'success' : 'neutral'} size="sm">
                            {partner.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        <div className="flex flex-col gap-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1.5"><LinkIcon size={12} /> /{partner.slug}</span>
                          <span className="flex items-center gap-1.5"><Percent size={12} /> Comissão: {(partner.commissionBps / 100).toFixed(2)}%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => startEditing(partner)}>
                          <Edit2 size={14} className="text-slate-400 hover:text-meow-deep" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleLoadStats(partner.id)}
                          aria-label="Ver estatisticas"
                        >
                          <BarChart2 size={14} className="text-slate-400 hover:text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => {
                          if (confirm('Tem certeza que deseja excluir este parceiro?')) {
                            runAction('delete', async () => {
                              await adminPartnersApi.deletePartner(accessToken!, partner.id);
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

        {/* Right Column: Dynamic Panel */}
        <div className="relative">
          <div className="sticky top-6">
            {viewingStatsId && stats[viewingStatsId] ? (
              <Card className="rounded-2xl border border-blue-100 bg-blue-50/50 p-0 shadow-card overflow-hidden">
                <div className="bg-blue-100 px-5 py-3 border-b border-blue-200 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-blue-900 flex items-center gap-2"><BarChart2 size={16} /> Métricas</h2>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-blue-200 text-blue-700" onClick={() => setViewingStatsId(null)}><XCircle size={14} /></Button>
                </div>
                <div className="p-5 grid gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-1">Cliques</span>
                      <span className="text-xl font-black text-blue-900">{stats[viewingStatsId]!.clicks}</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-1">Pedidos</span>
                      <span className="text-xl font-black text-blue-900">{stats[viewingStatsId]!.orders}</span>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-1">Comissão Acumulada</span>
                    <span className="text-2xl font-black text-blue-900">{formatCurrency(stats[viewingStatsId]!.commissionCents)}</span>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="rounded-2xl border border-slate-200 shadow-card">
                <div className="bg-slate-50 px-5 py-4 border-b border-slate-100">
                  <h2 className="text-md font-bold text-meow-charcoal">
                    {editingId ? 'Editar Parceiro' : 'Novo Parceiro'}
                  </h2>
                  <p className="text-xs text-meow-muted mt-1">Preencha os dados do parceiro.</p>
                </div>

                <div className="p-5 space-y-4">
                  <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                    Nome do Parceiro
                    <Input
                      placeholder="Ex: Jogador 1"
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </label>

                  <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                    Slug (URL do Parceiro)
                    <div className="relative">
                      <Input
                        placeholder="ex: jogador-1"
                        value={form.slug}
                        onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }))}
                        className="pl-7"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 opacity-50">/</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Link final: {baseUrl}/r/{form.slug || '...'}</span>
                  </label>

                  <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                    Comissão (%)
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={form.commissionPct}
                        onChange={(e) => setForm((prev) => ({ ...prev, commissionPct: e.target.value }))}
                      />
                      <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </label>

                  <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                    Status
                    <select
                      className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none"
                      value={form.active ? 'active' : 'inactive'}
                      onChange={(e) => setForm(prev => ({ ...prev, active: e.target.value === 'active' }))}
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                    </select>
                  </label>

                  <div className="pt-2 flex gap-2">
                    <Button
                      className="flex-1"
                      disabled={!form.name.trim() || !form.slug.trim() || commissionBps === null || busyAction === 'partner-save'}
                      onClick={() =>
                        runAction('partner-save', async () => {
                          const payload = {
                            name: form.name.trim(),
                            slug: form.slug.trim(),
                            commissionBps: commissionBps ?? 0,
                            active: form.active,
                          };
                          if (editingId) {
                            await adminPartnersApi.updatePartner(accessToken!, editingId, payload);
                          } else {
                            await adminPartnersApi.createPartner(accessToken!, payload);
                          }
                          resetForm();
                        })
                      }
                    >
                      {busyAction === 'partner-save' ? 'Salvando...' : <><Save size={16} className="mr-2" /> Salvar</>}
                    </Button>
                    {editingId && (
                      <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
};

// Helper Icon for XCircle since I referenced it but it might not be imported if I missed it in import
const XCircleIcon = ({ size, className }: { size?: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
);
