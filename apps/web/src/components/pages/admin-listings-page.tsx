'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Trash,
  Search,
  Filter,
  Package,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  MoreHorizontal,
  Plus,
  Save,
  Truck,
  DollarSign,
  Tag,
  Box,
  Image as ImageIcon,
  FileText,
  Settings,
  ChevronLeft,
} from 'lucide-react';

import { ApiClientError } from '../../lib/api-client';
import {
  adminListingsApi,
  type AdminListing,
  type AdminListingStatus,
  type AdminCreateListingInput,
} from '../../lib/admin-listings-api';
import {
  adminCatalogApi,
  type CatalogCategory,
  type CatalogGroup,
  type CatalogOption,
  type CatalogSection,
} from '../../lib/admin-catalog-api';
import { marketplaceApi } from '../../lib/marketplace-api';
import { useAuth } from '../auth/auth-provider';
import { AdminShell } from '../admin/admin-shell';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';

const statusLabel: Record<AdminListingStatus, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Pendente',
  PUBLISHED: 'Publicado',
  SUSPENDED: 'Suspenso',
};

const statusBadgeVariant: Record<AdminListingStatus, 'neutral' | 'warning' | 'success' | 'danger'> = {
  DRAFT: 'neutral',
  PENDING: 'warning',
  PUBLISHED: 'success',
  SUSPENDED: 'danger',
};

const deliveryLabel: Record<'AUTO' | 'MANUAL', string> = {
  AUTO: 'Automática',
  MANUAL: 'Manual',
};

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

type AdminListingsContentProps = {
  initialStatusFilter?: AdminListingStatus | 'all';
  lockedStatusFilter?: boolean;
  pageTitle?: string;
  pageDescription?: string;
  hideCreateForm?: boolean;
};

export const AdminListingsContent = ({
  initialStatusFilter = 'PENDING',
  lockedStatusFilter = false,
  pageTitle = 'Moderação de Anúncios',
  pageDescription = 'Gerencie anúncios: aprovar, rejeitar e suspender.',
  hideCreateForm = false,
}: AdminListingsContentProps) => {
  const { user, accessToken, loading } = useAuth();
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [selectedListing, setSelectedListing] = useState<AdminListing | null>(null);
  const [statusFilter, setStatusFilter] = useState<AdminListingStatus | 'all'>(initialStatusFilter);
  const [actionReason, setActionReason] = useState('');
  const [reserveQty, setReserveQty] = useState(1);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [groups, setGroups] = useState<CatalogGroup[]>([]);
  const [sections, setSections] = useState<CatalogSection[]>([]);
  const [salesModels, setSalesModels] = useState<CatalogOption[]>([]);
  const [origins, setOrigins] = useState<CatalogOption[]>([]);
  const [recoveryOptions, setRecoveryOptions] = useState<CatalogOption[]>([]);

  // Separate state for Create Mode vs View/Edit Mode
  const [isCreating, setIsCreating] = useState(false);

  const [createForm, setCreateForm] = useState<AdminCreateListingInput>({
    sellerId: '',
    categoryId: '',
    title: '',
    description: '',
    priceCents: 0,
    currency: 'BRL',
    deliveryType: 'AUTO',
    deliverySlaHours: 24,
    refundPolicy: 'Reembolso disponivel enquanto o pedido estiver em aberto.',
  });

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

  const loadCatalogOptions = async () => {
    if (!accessToken) return;
    setBusyAction('catalog');
    try {
      const [cats, groupsData, sectionsData, salesData, originsData, recoveryData] =
        await Promise.all([
          adminCatalogApi.listCategories(accessToken),
          adminCatalogApi.listGroups(accessToken),
          adminCatalogApi.listSections(accessToken),
          adminCatalogApi.listSalesModels(accessToken),
          adminCatalogApi.listOrigins(accessToken),
          adminCatalogApi.listRecoveryOptions(accessToken),
        ]);
      setCategories(cats);
      setGroups(groupsData);
      setSections(sectionsData);
      setSalesModels(salesData);
      setOrigins(originsData);
      setRecoveryOptions(recoveryData);
      setCreateForm((prev) => ({
        ...prev,
        categoryId: prev.categoryId || cats[0]?.id || '',
      }));
    } catch (error) {
      handleError(error, 'Não foi possível carregar cadastros.');
    } finally {
      setBusyAction(null);
    }
  };

  const loadListings = async () => {
    if (!accessToken) return;
    setBusyAction('load');
    setError(null);
    try {
      const data = await adminListingsApi.listListings(
        accessToken,
        statusFilter === 'all' ? undefined : statusFilter,
      );
      setListings(data);
      if (data.length > 0 && !selectedListing && !isCreating) {
        setSelectedListing(data[0]);
      }
    } catch (error) {
      handleError(error, 'Não foi possível carregar anúncios.');
    } finally {
      setBusyAction(null);
    }
  };

  useEffect(() => {
    if (accessToken && user?.role === 'ADMIN') {
      loadListings();
    }
  }, [accessToken, statusFilter, user?.role]);

  useEffect(() => {
    if (accessToken && user?.role === 'ADMIN') {
      loadCatalogOptions();
    }
  }, [accessToken, user?.role]);

  // --- Sub-components (Inventory & Media) ---

  const AdminListingInventory = ({ listingId }: { listingId: string }) => {
    const [addPayload, setAddPayload] = useState('');
    const [importPayload, setImportPayload] = useState('');
    const [removeId, setRemoveId] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const [msg, setMsg] = useState('');

    const handleAdd = async () => {
      if (!addPayload.trim() || !accessToken) return;
      setBusy('add');
      setMsg('');
      try {
        const codes = addPayload.split('\n').filter((l) => l.trim());
        const res = await marketplaceApi.addInventoryItems(accessToken, listingId, codes);
        setMsg(`Adicionado: ${res.created}, Pula: ${res.skipped}`);
        setAddPayload('');
      } catch (err) {
        setMsg('Erro ao adicionar.');
      } finally {
        setBusy(null);
      }
    };

    const handleImport = async () => {
      if (!importPayload.trim() || !accessToken) return;
      setBusy('import');
      setMsg('');
      try {
        const res = await marketplaceApi.importInventoryItems(
          accessToken,
          listingId,
          importPayload,
        );
        setMsg(`Importado: ${res.created}, Pula: ${res.skipped}`);
        setImportPayload('');
      } catch (err) {
        setMsg('Erro ao importar.');
      } finally {
        setBusy(null);
      }
    };

    const handleRemove = async () => {
      if (!removeId.trim() || !accessToken) return;
      if (!confirm('Remover item?')) return;
      setBusy('remove');
      setMsg('');
      try {
        await marketplaceApi.removeInventoryItem(accessToken, listingId, removeId.trim());
        setMsg('Item removido.');
        setRemoveId('');
      } catch (err) {
        setMsg('Erro ao remover (ID não encontrado?).');
      } finally {
        setBusy(null);
      }
    };

    return (
      <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
        <h4 className="flex items-center gap-2 text-sm font-bold text-meow-charcoal">
          <Package size={16} /> Gestão de Estoque
        </h4>
        {msg ? <div className="text-xs font-semibold text-blue-600">{msg}</div> : null}

        <div className="grid gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-meow-muted">Adicionar Itens (um por linha)</label>
            <Textarea
              rows={2}
              placeholder="ITEM-001&#10;ITEM-002"
              value={addPayload}
              onChange={(e) => setAddPayload(e.target.value)}
              className="bg-white text-xs"
            />
            <Button size="sm" onClick={handleAdd} disabled={busy === 'add'} variant="secondary" className="w-full">
              {busy === 'add' ? 'Adicionando...' : 'Adicionar Itens'}
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-meow-muted">Importar (formato livre)</label>
            <Textarea
              rows={2}
              placeholder="Cole o dump aqui..."
              value={importPayload}
              onChange={(e) => setImportPayload(e.target.value)}
              className="bg-white text-xs"
            />
            <Button size="sm" onClick={handleImport} disabled={busy === 'import'} variant="secondary" className="w-full">
              {busy === 'import' ? 'Importando...' : 'Importar Dump'}
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-meow-muted">Remover Item por ID</label>
            <div className="flex gap-2">
              <Input
                placeholder="UUID do item"
                value={removeId}
                onChange={(e) => setRemoveId(e.target.value)}
                className="h-9 bg-white text-xs"
              />
              <Button size="sm" onClick={handleRemove} disabled={busy === 'remove'} variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-200">
                {busy === 'remove' ? '...' : 'Remover'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AdminListingMedia = ({ listingId }: { listingId: string }) => {
    const [media, setMedia] = useState<any[]>([]);
    const [loadingMedia, setLoadingMedia] = useState(false);
    const [uploading, setUploading] = useState(false);

    const loadMedia = async () => {
      if (!accessToken) return;
      setLoadingMedia(true);
      try {
        const data = await marketplaceApi.listMedia(accessToken, listingId);
        setMedia(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingMedia(false);
      }
    };

    useEffect(() => {
      loadMedia();
    }, [listingId]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length || !accessToken) return;
      setUploading(true);
      try {
        const file = e.target.files[0];
        await marketplaceApi.uploadMedia(accessToken, listingId, file, media.length);
        await loadMedia();
      } catch (err) {
        alert('Erro ao enviar imagem.');
      } finally {
        setUploading(false);
        e.target.value = '';
      }
    };

    const handleRemove = async (mediaId: string) => {
      if (!confirm('Remover mídia?') || !accessToken) return;
      try {
        await marketplaceApi.removeMedia(accessToken, listingId, mediaId);
        setMedia((prev) => prev.filter((m) => m.id !== mediaId));
      } catch (err) {
        alert('Erro ao remover mídia.');
      }
    };

    return (
      <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
        <h4 className="flex items-center gap-2 text-sm font-bold text-meow-charcoal">
          <ImageIcon size={16} /> Gestão de Mídia
        </h4>
        <div className="grid grid-cols-4 gap-2">
          {media.map((item) => (
            <div key={item.id} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-white">
              {item.type === 'VIDEO' ? (
                <video src={item.url} className="h-full w-full object-cover" />
              ) : (
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              )}
              <button
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white shadow hover:bg-red-700"
                onClick={() => handleRemove(item.id)}
              >
                ×
              </button>
            </div>
          ))}
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 transition hover:bg-slate-100">
            <span className="text-xs font-bold text-slate-500">
              {uploading ? '...' : '+ Add'}
            </span>
            <input
              type="file"
              className="hidden"
              accept="image/*,video/*"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>
    );
  };

  const filteredGroups = useMemo(() => {
    if (!createForm.categoryId) return groups;
    return groups.filter((group) => group.categoryId === createForm.categoryId);
  }, [groups, createForm.categoryId]);

  const filteredSections = useMemo(() => {
    if (!createForm.categoryGroupId) return sections;
    return sections.filter((section) => section.groupId === createForm.categoryGroupId);
  }, [sections, createForm.categoryGroupId]);

  const applyListingUpdate = (updated: AdminListing) => {
    setListings((prev) => {
      const filtered = prev.filter((item) => item.id !== updated.id);
      if (statusFilter === 'all' || updated.status === statusFilter) {
        return [updated, ...filtered];
      }
      return filtered;
    });
    if (statusFilter !== 'all' && updated.status !== statusFilter) {
      setSelectedListing(null);
    } else {
      setSelectedListing(updated);
    }
  };

  const handleAction = async (action: 'approve' | 'reject' | 'suspend') => {
    if (!accessToken || !selectedListing) return;
    if ((action === 'reject' || action === 'suspend') && !actionReason.trim()) {
      setError('Informe o motivo da decisão.');
      return;
    }
    setBusyAction(action);
    setError(null);
    setNotice(null);
    try {
      const updated =
        action === 'approve'
          ? await adminListingsApi.approveListing(accessToken, selectedListing.id)
          : action === 'reject'
            ? await adminListingsApi.rejectListing(accessToken, selectedListing.id, { reason: actionReason.trim() })
            : await adminListingsApi.suspendListing(accessToken, selectedListing.id, { reason: actionReason.trim() });
      applyListingUpdate(updated);
      setNotice('Anúncio atualizado com sucesso.');
      setActionReason('');
    } catch (error) {
      handleError(error, 'Não foi possível atualizar o anúncio.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateListing = async () => {
    if (!accessToken) return;
    setBusyAction('create');
    setError(null);
    setNotice(null);
    try {
      const payload: AdminCreateListingInput = {
        ...createForm,
        sellerId: createForm.sellerId.trim(),
        title: createForm.title.trim(),
        description: createForm.description?.trim() || undefined,
        categoryGroupId: createForm.categoryGroupId || undefined,
        categorySectionId: createForm.categorySectionId || undefined,
        salesModelId: createForm.salesModelId || undefined,
        originId: createForm.originId || undefined,
        recoveryOptionId: createForm.recoveryOptionId || undefined,
        currency: createForm.currency || undefined,
      };
      await adminListingsApi.createListing(accessToken, payload);
      setNotice('Anúncio criado com sucesso.');
      setCreateForm({
        ...createForm,
        title: '',
        description: '',
        priceCents: 0,
      });
      loadListings();
      setIsCreating(false);
    } catch (error) {
      handleError(error, 'Não foi possível criar o anúncio.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleHomeFlagsUpdate = async (payload: { featured?: boolean; mustHave?: boolean }) => {
    if (!accessToken || !selectedListing) {
      return;
    }
    setBusyAction('home-flags');
    setError(null);
    setNotice(null);
    try {
      const updated = await adminListingsApi.updateHomeFlags(
        accessToken,
        selectedListing.id,
        payload,
      );
      applyListingUpdate(updated);
      setNotice('Vitrine da home atualizada.');
    } catch (error) {
      handleError(error, 'Não foi possível atualizar a vitrine.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleReserveInventory = async () => {
    if (!accessToken || !selectedListing) {
      return;
    }
    setBusyAction('reserve');
    setError(null);
    setNotice(null);
    try {
      await marketplaceApi.reserveInventory(accessToken, selectedListing.id, reserveQty);
      setNotice('Reserva de inventário enviada.');
    } catch (error) {
      handleError(error, 'Não foi possível reservar inventário.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDelete = async (listingToDelete?: AdminListing) => {
    const target = listingToDelete || selectedListing;
    if (!target || !accessToken) return;
    if (!confirm(`Excluir "${target.title}"?`)) return;

    setBusyAction('delete');
    try {
      await adminListingsApi.deleteListing(accessToken, target.id);
      setNotice('Anúncio excluído.');
      if (selectedListing?.id === target.id) setSelectedListing(null);
      loadListings();
    } catch (error) {
      handleError(error, 'Erro ao excluir.');
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
            className="mt-4 inline-flex rounded-full bg-meow-linear px-6 py-2 text-sm font-bold text-white"
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
        { label: 'Admin', href: '/admin/vendas' },
        { label: pageTitle ?? 'Listagens' },
      ]}
    >
      <Card className="rounded-2xl border border-meow-red/20 p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">{pageTitle}</h1>
            <p className="mt-2 text-sm text-meow-muted">{pageDescription}</p>
          </div>
          <Link
            href="/conta"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition hover:text-meow-deep hover:shadow-md"
          >
            <ChevronLeft size={24} />
          </Link>
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

      <div className="grid gap-6 lg:grid-cols-[1fr_450px]">
        {/* Left Col: Filters & List or Create Form */}
        <div className="space-y-4">
          {!isCreating && (
            <Card className="rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-wide text-meow-muted">Filtros</h2>
                {!hideCreateForm && (
                  <Button size="sm" onClick={() => { setIsCreating(true); setSelectedListing(null); }}>
                    <Plus size={16} className="mr-1.5" /> Criar Anúncio
                  </Button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Filter size={12} /> Status
                  </span>
                  <div className="relative">
                    <select
                      disabled={lockedStatusFilter}
                      className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 pr-8 text-sm font-medium text-slate-700 outline-none focus:border-meow-red/50 focus:ring-4 focus:ring-meow-red/10 disabled:opacity-50"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as AdminListingStatus | 'all')}
                    >
                      <option value="all">Todos</option>
                      <option value="DRAFT">Rascunhos</option>
                      <option value="PENDING">Pendentes</option>
                      <option value="PUBLISHED">Publicados</option>
                      <option value="SUSPENDED">Suspensos</option>
                    </select>
                    <Filter size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                  </div>
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Search size={12} /> Buscar
                  </span>
                  <div className="relative">
                    <Input placeholder="Buscar por título..." className="h-10 bg-slate-50" disabled />
                    <Search size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                  </div>
                </label>
              </div>
            </Card>
          )}

          {isCreating ? (
            <Card className="rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-meow-charcoal">Novo Anúncio</h2>
                <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
                  Cancelar
                </Button>
              </div>

              <div className="grid gap-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                      Seller ID (UUID)
                      <Input value={createForm.sellerId} onChange={e => setCreateForm({ ...createForm, sellerId: e.target.value })} placeholder="Ex: 550e8400-e29b..." className="font-mono text-xs" />
                    </label>
                    <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                      Categoria
                      <select className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none"
                        value={createForm.categoryId} onChange={e => setCreateForm({ ...createForm, categoryId: e.target.value, categoryGroupId: undefined, categorySectionId: undefined })}>
                        <option value="">Selecione...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                      Subcategoria
                      <select className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none"
                        value={createForm.categoryGroupId || ''} onChange={e => setCreateForm({ ...createForm, categoryGroupId: e.target.value || undefined })}>
                        <option value="">Selecione...</option>
                        {filteredGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="space-y-4">
                    <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                      Título do Anúncio
                      <Input value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} placeholder="Ex: Conta nível 100..." />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                        Preço (Centavos)
                        <Input type="number" min={0} value={createForm.priceCents} onChange={e => setCreateForm({ ...createForm, priceCents: Number(e.target.value) })} />
                      </label>
                      <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                        Moeda
                        <Input value={createForm.currency} onChange={e => setCreateForm({ ...createForm, currency: e.target.value })} />
                      </label>
                    </div>
                    <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                      Descrição
                      <Textarea rows={3} value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} />
                    </label>
                  </div>
                </div>

                <Button onClick={handleCreateListing} disabled={busyAction === 'create'} className="w-full">
                  {busyAction === 'create' ? 'Criando...' : 'Criar Anúncio'}
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="rounded-2xl border border-slate-200 bg-slate-50/50 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3">
                <h2 className="text-sm font-bold text-meow-charcoal">Lista de Anúncios</h2>
                <span className="text-xs font-medium text-meow-muted">{listings.length} encontrados</span>
              </div>
              <div className="max-h-[700px] overflow-y-auto p-2 scrollbar-thin">
                {listings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-meow-muted">
                    <Package size={48} className="text-slate-200 mb-3" />
                    <p>Nenhum anúncio encontrado.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {listings.map(item => {
                      const isSelected = selectedListing?.id === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => { setSelectedListing(item); setIsCreating(false); }}
                          className={`cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md ${isSelected
                            ? 'border-meow-red/30 bg-meow-red/5 ring-1 ring-meow-red/20'
                            : 'border-slate-100 bg-white hover:border-meow-red/20'
                            }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex gap-3">
                              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border text-lg font-bold ${isSelected ? 'border-meow-red/20 bg-white text-meow-deep' : 'border-slate-100 bg-slate-50 text-slate-400'
                                }`}>
                                {item.title.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h3 className={`text-sm font-bold line-clamp-1 ${isSelected ? 'text-meow-deep' : 'text-slate-700'}`}>
                                  {item.title}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <Badge variant={statusBadgeVariant[item.status]} size="sm">
                                    {statusLabel[item.status]}
                                  </Badge>
                                  <span className="text-xs font-medium text-slate-500">
                                    {formatCurrency(item.priceCents, item.currency)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-semibold text-slate-400 block">
                                {new Date(item.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Right Col: Detail View */}
        <div className="relative">
          <div className="sticky top-6">
            {!selectedListing ? (
              <Card className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-400">
                <Package size={48} className="mb-4 text-slate-200" />
                <p>Selecione um anúncio para ver os detalhes e moderar.</p>
              </Card>
            ) : (
              <Card className="overflow-hidden rounded-2xl border border-slate-200 shadow-card">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-md font-bold text-meow-charcoal line-clamp-2">{selectedListing.title}</h2>
                      <p className="text-xs text-meow-muted mt-1 font-mono">{selectedListing.id}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant={statusBadgeVariant[selectedListing.status]}>{statusLabel[selectedListing.status]}</Badge>
                    </div>
                  </div>
                </div>

                <Tabs defaultValue="details" className="w-full">
                  <div className="border-b border-slate-100 px-6">
                    <TabsList className="justify-start -mb-px bg-transparent p-0 gap-6">
                      <TabsTrigger value="details" className="bg-transparent rounded-none border-b-2 border-transparent px-0 py-3 data-[state=active]:border-meow-red data-[state=active]:bg-transparent data-[state=active]:text-meow-deep hover:bg-transparent">Detalhes</TabsTrigger>
                      <TabsTrigger value="moderation" className="bg-transparent rounded-none border-b-2 border-transparent px-0 py-3 data-[state=active]:border-meow-red data-[state=active]:bg-transparent data-[state=active]:text-meow-deep hover:bg-transparent">Moderação</TabsTrigger>
                      <TabsTrigger value="inventory" className="bg-transparent rounded-none border-b-2 border-transparent px-0 py-3 data-[state=active]:border-meow-red data-[state=active]:bg-transparent data-[state=active]:text-meow-deep hover:bg-transparent">Estoque & Mídia</TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="p-6 max-h-[calc(100vh-250px)] overflow-y-auto scrollbar-thin">
                    <TabsContent value="details" className="mt-0 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><DollarSign size={12} /> Preço</div>
                          <div className="font-bold text-meow-charcoal">{formatCurrency(selectedListing.priceCents, selectedListing.currency)}</div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Truck size={12} /> Entrega</div>
                          <div className="font-bold text-meow-charcoal">{deliveryLabel[selectedListing.deliveryType]} ({selectedListing.deliverySlaHours}h)</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase text-slate-400">Descrição</h3>
                        <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap border border-slate-100">
                          {selectedListing.description || 'Sem descrição.'}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase text-slate-400">Informações Técnicas</h3>
                        <div className="text-xs space-y-2 text-slate-600">
                          <div className="flex justify-between border-b border-slate-100 pb-2">
                            <span>Seller ID</span>
                            <span className="font-mono">{selectedListing.sellerId}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-2">
                            <span>Categoria ID</span>
                            <span className="font-mono">{selectedListing.categoryId}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-2">
                            <span>Criado em</span>
                            <span>{new Date(selectedListing.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100">
                        <h3 className="text-xs font-bold uppercase text-slate-400 mb-3">Vitrine da Home</h3>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={selectedListing.featured ? "secondary" : "outline"}
                            onClick={() => handleHomeFlagsUpdate({ featured: !selectedListing.featured })}
                            className={selectedListing.featured ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : ""}
                          >
                            {selectedListing.featured ? '★ Destaque Ativo' : '☆ Marcar Destaque'}
                          </Button>
                          <Button
                            size="sm"
                            variant={selectedListing.mustHave ? "secondary" : "outline"}
                            onClick={() => handleHomeFlagsUpdate({ mustHave: !selectedListing.mustHave })}
                            className={selectedListing.mustHave ? "bg-purple-100 text-purple-700 hover:bg-purple-200" : ""}
                          >
                            {selectedListing.mustHave ? 'Set Must Have' : 'Unset Must Have'}
                          </Button>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete()}
                        >
                          <Trash size={14} className="mr-2" /> Excluir Anúncio
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="moderation" className="mt-0 space-y-6">
                      <div className="space-y-3">
                        <div className="rounded-xl bg-amber-50 p-4 border border-amber-100 text-sm text-amber-800">
                          <p className="font-bold mb-1 flex items-center gap-2"><AlertTriangle size={16} /> Atenção</p>
                          <p>As ações de moderação notificam o vendedor imediatamente.</p>
                        </div>

                        <label className="block text-xs font-bold text-meow-muted">Motivo / Justificativa (Obrigatório para Rejeitar/Suspender)</label>
                        <Textarea
                          placeholder="Escreva a justificativa aqui..."
                          value={actionReason}
                          onChange={(e) => setActionReason(e.target.value)}
                          className="min-h-[100px]"
                        />

                        <div className="grid gap-3">
                          {selectedListing.status === 'PENDING' && (
                            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => handleAction('approve')} disabled={busyAction === 'approve'}>
                              <CheckCircle size={16} className="mr-2" /> Aprovar Anúncio
                            </Button>
                          )}

                          <Button variant="secondary" className="w-full text-red-600 bg-red-50 hover:bg-red-100 border-red-200" onClick={() => handleAction('reject')} disabled={busyAction === 'reject'}>
                            <XCircle size={16} className="mr-2" /> Rejeitar
                          </Button>

                          <Button variant="secondary" className="w-full text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-200" onClick={() => handleAction('suspend')} disabled={busyAction === 'suspend'}>
                            <BanIcon size={16} className="mr-2" /> Suspender
                          </Button>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="inventory" className="mt-0 space-y-6">
                      <AdminListingInventory listingId={selectedListing.id} />
                      <AdminListingMedia listingId={selectedListing.id} />
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <h4 className="mb-2 font-bold text-meow-charcoal flex items-center gap-2"><Box size={16} /> Teste de Reserva</h4>
                        <div className="flex gap-2">
                          <Input type="number" min={1} value={reserveQty} onChange={e => setReserveQty(Number(e.target.value))} className="w-20" />
                          <Button size="sm" onClick={handleReserveInventory} disabled={busyAction === 'reserve'}>
                            Reservar
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
};

// Helper icon
const BanIcon = ({ size, className }: { size?: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" /></svg>
);
