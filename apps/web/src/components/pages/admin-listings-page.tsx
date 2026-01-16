'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Trash } from 'lucide-react';

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
import { NotificationsBell } from '../notifications/notifications-bell';

const statusLabel: Record<AdminListingStatus, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Pendente',
  PUBLISHED: 'Publicado',
  SUSPENDED: 'Suspenso',
};

const deliveryLabel: Record<'AUTO' | 'MANUAL', string> = {
  AUTO: 'Auto',
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
    if (!accessToken) {
      return;
    }
    setBusyAction('catalog');
    setError(null);
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
    if (!accessToken) {
      return;
    }
    setBusyAction('load');
    setError(null);
    setNotice(null);
    try {
      const data = await adminListingsApi.listListings(
        accessToken,
        statusFilter === 'all' ? undefined : statusFilter,
      );
      setListings(data);
      setSelectedListing(data[0] ?? null);
      setActionReason('');
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

  const AdminListingInventory = ({
    listingId,
    accessToken,
  }: {
    listingId: string;
    accessToken: string;
  }) => {
    const [addPayload, setAddPayload] = useState('');
    const [importPayload, setImportPayload] = useState('');
    const [removeId, setRemoveId] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const [msg, setMsg] = useState('');

    const handleAdd = async () => {
      if (!addPayload.trim()) return;
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
      if (!importPayload.trim()) return;
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
      if (!removeId.trim()) return;
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
      <div className="mt-4 border-t border-slate-100 pt-4">
        <h4 className="mb-2 font-bold text-meow-charcoal">Gestão de Estoque</h4>
        {msg && <div className="mb-2 text-xs text-blue-600">{msg}</div>}

        <div className="grid gap-4">
          <div>
            <label className="text-xs font-bold text-meow-muted">Adicionar Itens (um por linha)</label>
            <textarea
              className="form-textarea mt-1"
              rows={3}
              placeholder="ITEM-001&#10;ITEM-002"
              value={addPayload}
              onChange={(e) => setAddPayload(e.target.value)}
            />
            <button
              className="mt-1 rounded bg-meow-red px-3 py-1 text-xs font-bold text-white hover:bg-meow-deep disabled:opacity-50"
              onClick={handleAdd}
              disabled={busy === 'add'}
            >
              {busy === 'add' ? 'Adicionando...' : 'Adicionar'}
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-meow-muted">Importar (formato livre)</label>
            <textarea
              className="form-textarea mt-1"
              rows={3}
              placeholder="Cole o dump aqui..."
              value={importPayload}
              onChange={(e) => setImportPayload(e.target.value)}
            />
            <button
              className="mt-1 rounded bg-blue-500 px-3 py-1 text-xs font-bold text-white hover:bg-meow-deep disabled:opacity-50"
              onClick={handleImport}
              disabled={busy === 'import'}
            >
              {busy === 'import' ? 'Importando...' : 'Importar'}
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-meow-muted">Remover Item por ID</label>
            <div className="flex gap-2">
              <input
                className="form-input flex-1"
                placeholder="UUID do item"
                value={removeId}
                onChange={(e) => setRemoveId(e.target.value)}
              />
              <button
                className="rounded bg-red-500 px-3 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                onClick={handleRemove}
                disabled={busy === 'remove'}
              >
                {busy === 'remove' ? '...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AdminListingMedia = ({
    listingId,
    accessToken,
  }: {
    listingId: string;
    accessToken: string;
  }) => {
    const [media, setMedia] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const loadMedia = async () => {
      setLoading(true);
      try {
        const data = await marketplaceApi.listMedia(accessToken, listingId);
        setMedia(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      loadMedia();
    }, [listingId]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) return;
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
      if (!confirm('Remover mídia?')) return;
      try {
        await marketplaceApi.removeMedia(accessToken, listingId, mediaId);
        setMedia((prev) => prev.filter((m) => m.id !== mediaId));
      } catch (err) {
        alert('Erro ao remover mídia.');
      }
    };

    return (
      <div className="mt-8 border-t border-slate-100 pt-4">
        <h4 className="mb-2 font-bold text-meow-charcoal">Gestão de Mídia</h4>
        <div className="grid grid-cols-4 gap-2">
          {media.map((item) => (
            <div key={item.id} className="relative aspect-square overflow-hidden rounded bg-slate-100">
              {item.type === 'VIDEO' ? (
                <video src={item.url} className="h-full w-full object-cover" />
              ) : (
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              )}
              <button
                className="absolute right-1 top-1 rounded bg-red-600 p-1 text-white shadow hover:bg-red-700"
                onClick={() => handleRemove(item.id)}
              >
                ×
              </button>
            </div>
          ))}
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100">
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

  const detailSummary = useMemo(() => {
    if (!selectedListing) {
      return null;
    }
    return {
      status: statusLabel[selectedListing.status] ?? selectedListing.status,
      price: formatCurrency(selectedListing.priceCents, selectedListing.currency),
      delivery: deliveryLabel[selectedListing.deliveryType],
    };
  }, [selectedListing]);

  const filteredGroups = useMemo(() => {
    if (!createForm.categoryId) {
      return groups;
    }
    return groups.filter((group) => group.categoryId === createForm.categoryId);
  }, [groups, createForm.categoryId]);

  const filteredSections = useMemo(() => {
    if (!createForm.categoryGroupId) {
      return sections;
    }
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

  const handleAction = async (action: 'approve' | 'reject' | 'suspend') => {
    if (!accessToken || !selectedListing) {
      return;
    }
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
            ? await adminListingsApi.rejectListing(accessToken, selectedListing.id, {
              reason: actionReason.trim(),
            })
            : await adminListingsApi.suspendListing(accessToken, selectedListing.id, {
              reason: actionReason.trim(),
            });
      applyListingUpdate(updated);
      setNotice('Anúncio atualizado com sucesso.');
      setActionReason('');
    } catch (error) {
      handleError(error, 'Não foi possível atualizar o anúncio.');
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

  const handleCreateListing = async () => {
    if (!accessToken) {
      return;
    }
    if (!createForm.sellerId.trim()) {
      setError('Informe o sellerId.');
      return;
    }
    if (!createForm.categoryId) {
      setError('Selecione a categoria.');
      return;
    }
    if (!createForm.title.trim()) {
      setError('Informe o título.');
      return;
    }
    if (createForm.priceCents <= 0) {
      setError('Informe o preço.');
      return;
    }
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
        sellerId: '',
        categoryId: createForm.categoryId,
        title: '',
        description: '',
        priceCents: 0,
        currency: 'BRL',
        deliveryType: 'AUTO',
        deliverySlaHours: 24,
        refundPolicy: 'Reembolso disponivel enquanto o pedido estiver em aberto.',
      });
      loadListings();
    } catch (error) {
      handleError(error, 'Não foi possível criar o anúncio.');
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

  const handleDelete = async (listingToDelete?: AdminListing) => {
    const target = listingToDelete || selectedListing;
    if (!target || !accessToken) return;

    if (
      !confirm(
        `Tem certeza que deseja EXCLUIR o anúncio "${target.title}"? Esta ação NÃO pode ser desfeita.`,
      )
    )
      return;

    setBusyAction('delete');
    try {
      await adminListingsApi.deleteListing(accessToken, target.id);
      setNotice('Anúncio excluído com sucesso.');
      if (selectedListing?.id === target.id) {
        setSelectedListing(null);
      }
      loadListings();
    } catch (error) {
      handleError(error, 'Erro ao excluir anúncio. Verifique se existem pedidos associados.');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <AdminShell
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Admin', href: '/admin/atendimento' },
        { label: 'Moderação' },
      ]}
    >
      <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-meow-charcoal">{pageTitle}</h1>
            <p className="mt-2 text-sm text-meow-muted">
              {pageDescription}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <Link
              className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
              href="/conta"
            >
              Voltar para conta
            </Link>
          </div>
        </div>
      </div>

      {error ? <div className="state-card error">{error}</div> : null}
      {notice ? <div className="state-card success">{notice}</div> : null}

      {!hideCreateForm ? (<div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
        <div className="panel-header">
          <h2>Criar anúncio (admin)</h2>
        </div>
        {categories.length === 0 ? (
          <div className="state-card info">
            Cadastre categorias antes de criar anúncios.
          </div>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-3">
            <label className="form-field">
              Seller ID
              <input
                className="form-input"
                value={createForm.sellerId}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, sellerId: event.target.value }))
                }
                placeholder="UUID do seller"
              />
            </label>
            <label className="form-field">
              Categoria
              <select
                className="form-input"
                value={createForm.categoryId}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    categoryId: event.target.value,
                    categoryGroupId: undefined,
                    categorySectionId: undefined,
                  }))
                }
              >
                <option value="">Selecione...</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              Subcategoria / Jogo
              <select
                className="form-input"
                value={createForm.categoryGroupId ?? ''}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    categoryGroupId: event.target.value || undefined,
                    categorySectionId: undefined,
                  }))
                }
              >
                <option value="">Selecione...</option>
                {filteredGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              Secao
              <select
                className="form-input"
                value={createForm.categorySectionId ?? ''}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    categorySectionId: event.target.value || undefined,
                  }))
                }
              >
                <option value="">Selecione...</option>
                {filteredSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              Título
              <input
                className="form-input"
                value={createForm.title}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, title: event.target.value }))
                }
              />
            </label>
            <label className="form-field">
              Descrição
              <textarea
                className="form-textarea"
                rows={3}
                value={createForm.description ?? ''}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </label>
          </div>
          <div className="grid gap-3">
            <label className="form-field">
              Preço (centavos)
              <input
                className="form-input"
                type="number"
                min={1}
                value={createForm.priceCents}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    priceCents: Number(event.target.value || 0),
                  }))
                }
              />
            </label>
            <label className="form-field">
              Moeda
              <input
                className="form-input"
                value={createForm.currency ?? ''}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, currency: event.target.value }))
                }
              />
            </label>
            <label className="form-field">
              Tipo de entrega
              <select
                className="form-input"
                value={createForm.deliveryType}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    deliveryType: event.target.value as 'AUTO' | 'MANUAL',
                  }))
                }
              >
                <option value="AUTO">AUTO</option>
                <option value="MANUAL">MANUAL</option>
              </select>
            </label>
            <label className="form-field">
              SLA (horas)
              <input
                className="form-input"
                type="number"
                min={1}
                max={720}
                value={createForm.deliverySlaHours}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    deliverySlaHours: Number(event.target.value || 0),
                  }))
                }
              />
            </label>
            <label className="form-field">
              Tipo de venda
              <select
                className="form-input"
                value={createForm.salesModelId ?? ''}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    salesModelId: event.target.value || undefined,
                  }))
                }
              >
                <option value="">Selecione...</option>
                {salesModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              Procedência
              <select
                className="form-input"
                value={createForm.originId ?? ''}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    originId: event.target.value || undefined,
                  }))
                }
              >
                <option value="">Selecione...</option>
                {origins.map((origin) => (
                  <option key={origin.id} value={origin.id}>
                    {origin.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              Dados de recuperação
              <select
                className="form-input"
                value={createForm.recoveryOptionId ?? ''}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    recoveryOptionId: event.target.value || undefined,
                  }))
                }
              >
                <option value="">Selecione...</option>
                {recoveryOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              Politica de reembolso
              <textarea
                className="form-textarea"
                rows={2}
                value={createForm.refundPolicy}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, refundPolicy: event.target.value }))
                }
              />
            </label>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            className="admin-primary-button"
            type="button"
            onClick={handleCreateListing}
            disabled={busyAction === 'create'}
          >
            {busyAction === 'create' ? 'Criando...' : 'Criar anúncio'}
          </button>
        </div>
      </div>) : null}

      <div className="admin-listings-grid">
        <div className="order-card">
          <div className="panel-header">
            <h2>Anúncios</h2>
            <div className="form-field">
              <span className="summary-label">Status</span>
              <select
                className="form-input"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as AdminListingStatus | 'all')
                }
                disabled={lockedStatusFilter}
              >
                <option value="all">Todos</option>
                <option value="PENDING">Pendentes</option>
                <option value="PUBLISHED">Publicados</option>
                <option value="DRAFT">Rascunhos</option>
                <option value="SUSPENDED">Suspensos</option>
              </select>
            </div>
          </div>

          {busyAction === 'load' ? (
            <div className="state-card">Carregando anúncios...</div>
          ) : null}

          {listings.length === 0 && busyAction !== 'load' ? (
            <div className="state-card">Nenhum anúncio encontrado.</div>
          ) : null}

          <div className="support-list">
            {listings.map((listing) => (
              <div
                className={`support-row flex cursor-pointer items-center justify-between gap-2 p-3 ${selectedListing?.id === listing.id ? 'bg-meow-red/5' : ''}`}
                key={listing.id}
                onClick={() => {
                  setSelectedListing(listing);
                  setActionReason('');
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <strong>{listing.title}</strong>
                    <span className={`status-pill status-${listing.status.toLowerCase()} scale-75`}>
                      {statusLabel[listing.status] ?? listing.status}
                    </span>
                  </div>
                  <div className="text-xs text-meow-muted">
                    {listing.seller?.email ?? listing.sellerId} •{' '}
                    {formatCurrency(listing.priceCents, listing.currency)}
                  </div>
                </div>

                <button
                  className="rounded p-2 text-meow-muted hover:bg-red-50 hover:text-red-600"
                  title="Excluir Anuncio"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(listing);
                  }}
                  disabled={busyAction === 'delete'}
                >
                  <Trash size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="order-card">
          <div className="panel-header">
            <h2>Detalhes</h2>
          </div>
          {!selectedListing ? (
            <div className="state-card">Selecione um anúncio para moderar.</div>
          ) : (
            <>
              <div className="ticket-summary">
                <div>
                  <span className="summary-label">Status</span>
                  <strong>{detailSummary?.status}</strong>
                </div>
                <div>
                  <span className="summary-label">Preço</span>
                  <strong>{detailSummary?.price}</strong>
                </div>
                <div>
                  <span className="summary-label">Entrega</span>
                  <strong>{detailSummary?.delivery}</strong>
                </div>
                <div>
                  <span className="summary-label">Seller</span>
                  <strong>{selectedListing.seller?.email ?? selectedListing.sellerId}</strong>
                </div>
                <div>
                  <span className="summary-label">Categoria</span>
                  <strong>{selectedListing.category?.name ?? selectedListing.categoryId}</strong>
                </div>
                <div>
                  <span className="summary-label">Criado</span>
                  <strong>
                    {new Date(selectedListing.createdAt).toLocaleDateString('pt-BR')}
                  </strong>
                </div>
              </div>

              <div className="state-card">
                <h3 className="text-sm font-bold text-meow-charcoal">Vitrine da home</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() =>
                      handleHomeFlagsUpdate({ featured: !selectedListing.featuredAt })
                    }
                    disabled={busyAction === 'home-flags'}
                  >
                    {selectedListing.featuredAt ? 'Remover de Destaques' : 'Marcar como Destaque'}
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() =>
                      handleHomeFlagsUpdate({ mustHave: !selectedListing.mustHaveAt })
                    }
                    disabled={busyAction === 'home-flags'}
                  >
                    {selectedListing.mustHaveAt
                      ? 'Remover de Imperdiveis'
                      : 'Marcar como Imperdivel'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-meow-muted">
                  Use essas opções para controlar as listas da home.
                </p>
              </div>

              {selectedListing.description ? (
                <div className="state-card info">{selectedListing.description}</div>
              ) : null}

              <label className="form-field">
                Motivo (reprovação/suspensão)
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={actionReason}
                  onChange={(event) => setActionReason(event.target.value)}
                  placeholder="Explique o motivo da acao."
                />
              </label>

              <div className="order-actions">
                <button
                  className="admin-primary-button"
                  type="button"
                  onClick={() => handleAction('approve')}
                  disabled={busyAction === 'approve'}
                >
                  {busyAction === 'approve' ? 'Aprovando...' : 'Aprovar'}
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => handleAction('reject')}
                  disabled={!actionReason.trim() || busyAction === 'reject'}
                >
                  {busyAction === 'reject' ? 'Reprovando...' : 'Reprovar'}
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => handleAction('suspend')}
                  disabled={!actionReason.trim() || busyAction === 'suspend'}
                >
                  {busyAction === 'suspend' ? 'Suspendendo...' : 'Suspender'}
                </button>
                <button
                  className="ghost-button text-red-600 hover:bg-red-50 hover:text-red-700"
                  type="button"
                  onClick={() => handleDelete()}
                  disabled={busyAction === 'delete'}
                >
                  {busyAction === 'delete' ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>

              <div className="seller-section">
                <h3>Inventário (admin)</h3>
                <label className="form-field">
                  Reservar quantidade
                  <input
                    className="form-input"
                    type="number"
                    min={1}
                    value={reserveQty}
                    onChange={(event) => setReserveQty(Number(event.target.value || 1))}
                  />
                </label>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={handleReserveInventory}
                  disabled={busyAction === 'reserve'}
                >
                  {busyAction === 'reserve' ? 'Reservando...' : 'Reservar inventário'}
                </button>

                <AdminListingInventory
                  listingId={selectedListing.id}
                  accessToken={accessToken!}
                />

                <AdminListingMedia
                  listingId={selectedListing.id}
                  accessToken={accessToken!}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </AdminShell>
  );
};
