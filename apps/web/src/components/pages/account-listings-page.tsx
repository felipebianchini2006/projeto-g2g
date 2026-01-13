'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import {
  marketplaceApi,
  type DeliveryType,
  type Listing,
  type ListingStatus,
  type ListingUpdateInput,
} from '../../lib/marketplace-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';

type ListingsState = {
  status: 'loading' | 'ready';
  listings: Listing[];
  error?: string;
};

const statusLabel: Record<ListingStatus, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Em análise',
  PUBLISHED: 'Publicado',
  SUSPENDED: 'Suspenso',
};

const statusTone: Record<ListingStatus, 'success' | 'warning' | 'info' | 'danger' | 'neutral'> = {
  DRAFT: 'neutral',
  PENDING: 'warning',
  PUBLISHED: 'success',
  SUSPENDED: 'danger',
};

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

export const AccountListingsContent = () => {
  const { user, accessToken, loading } = useAuth();
  const [state, setState] = useState<ListingsState>({
    status: 'loading',
    listings: [],
  });
  const [statusFilter, setStatusFilter] = useState<ListingStatus | 'ALL' | 'SOLD'>(
    'ALL',
  );
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ListingUpdateInput | null>(null);
  const [inventoryCodes, setInventoryCodes] = useState('');
  const [inventoryImport, setInventoryImport] = useState('');
  const [inventoryRemoveId, setInventoryRemoveId] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const accessAllowed = user?.role === 'SELLER' || user?.role === 'ADMIN';

  useEffect(() => {
    if (!accessToken || !accessAllowed) {
      return;
    }
    let active = true;
    const load = async () => {
      try {
        const listings = await marketplaceApi.listSellerListings(accessToken);
        if (!active) {
          return;
        }
        setState({ status: 'ready', listings });
      } catch (error) {
        if (!active) {
          return;
        }
        const message =
          error instanceof ApiClientError
            ? error.message
            : 'Não foi possível carregar seus anúncios.';
        setState({ status: 'ready', listings: [], error: message });
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [accessToken, accessAllowed]);

  const filteredListings = useMemo(() => {
    if (statusFilter === 'ALL') {
      return state.listings;
    }
    if (statusFilter === 'SOLD') {
      return [];
    }
    return state.listings.filter((listing) => listing.status === statusFilter);
  }, [state.listings, statusFilter]);

  const selectedListing = useMemo(
    () => state.listings.find((listing) => listing.id === selectedListingId) ?? null,
    [state.listings, selectedListingId],
  );

  const setListingInState = (updated: Listing | null, remove = false) => {
    if (!updated) {
      return;
    }
    setState((prev) => ({
      ...prev,
      listings: remove
        ? prev.listings.filter((item) => item.id !== updated.id)
        : prev.listings.map((item) => (item.id === updated.id ? updated : item)),
    }));
  };

  const startEditing = async (listing: Listing) => {
    setNotice(null);
    setSelectedListingId(listing.id);
    setEditForm({
      title: listing.title,
      description: listing.description ?? '',
      priceCents: listing.priceCents,
      currency: listing.currency,
      deliveryType: listing.deliveryType,
      deliverySlaHours: listing.deliverySlaHours ?? 24,
      refundPolicy: listing.refundPolicy ?? '',
    });
    if (accessToken) {
      try {
        const fresh = await marketplaceApi.getSellerListing(accessToken, listing.id);
        setState((prev) => ({
          ...prev,
          listings: prev.listings.map((item) => (item.id === fresh.id ? fresh : item)),
        }));
      } catch {
        // keep local listing
      }
    }
  };

  const handleUpdateListing = async () => {
    if (!accessToken || !selectedListing || !editForm) {
      return;
    }
    setActionBusy('update');
    setNotice(null);
    try {
      const updated = await marketplaceApi.updateListing(
        accessToken,
        selectedListing.id,
        {
          ...editForm,
          description: editForm.description?.trim() || undefined,
        },
      );
      setListingInState(updated);
      setNotice('Anúncio atualizado.');
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Não foi possível atualizar o anúncio.';
      setNotice(message);
    } finally {
      setActionBusy(null);
    }
  };

  const handleSubmitListing = async (listingId: string) => {
    if (!accessToken) {
      return;
    }
    setActionBusy('submit');
    setNotice(null);
    try {
      const updated = await marketplaceApi.submitListing(accessToken, listingId);
      setListingInState(updated);
      setNotice('Anúncio enviado para análise.');
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Não foi possível enviar o anúncio.';
      setNotice(message);
    } finally {
      setActionBusy(null);
    }
  };

  const handleArchiveListing = async (listingId: string) => {
    if (!accessToken) {
      return;
    }
    setActionBusy('archive');
    setNotice(null);
    try {
      await marketplaceApi.archiveListing(accessToken, listingId);
      setState((prev) => ({
        ...prev,
        listings: prev.listings.filter((item) => item.id !== listingId),
      }));
      if (selectedListingId === listingId) {
        setSelectedListingId(null);
        setEditForm(null);
      }
      setNotice('Anúncio arquivado.');
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Não foi possível arquivar o anúncio.';
      setNotice(message);
    } finally {
      setActionBusy(null);
    }
  };

  const handleUploadMedia = async () => {
    if (!accessToken || !selectedListing || mediaFiles.length === 0) {
      return;
    }
    setActionBusy('media');
    setNotice(null);
    try {
      const uploaded = [];
      for (const file of mediaFiles) {
        // Upload sequentially to preserve ordering
        // eslint-disable-next-line no-await-in-loop
        const media = await marketplaceApi.uploadMedia(
          accessToken,
          selectedListing.id,
          file,
          selectedListing.media?.length ?? 0,
        );
        uploaded.push(media);
      }
      setMediaFiles([]);
      const refreshed = await marketplaceApi.getSellerListing(accessToken, selectedListing.id);
      setListingInState(refreshed);
      setNotice(`${uploaded.length} mídia(s) enviada(s).`);
    } catch (error) {
      const message =
        error instanceof ApiClientError ? error.message : 'Falha ao enviar mídia.';
      setNotice(message);
    } finally {
      setActionBusy(null);
    }
  };

  const handleRemoveMedia = async (mediaId: string) => {
    if (!accessToken || !selectedListing) {
      return;
    }
    setActionBusy('remove-media');
    setNotice(null);
    try {
      await marketplaceApi.removeMedia(accessToken, selectedListing.id, mediaId);
      const refreshed = await marketplaceApi.getSellerListing(accessToken, selectedListing.id);
      setListingInState(refreshed);
      setNotice('Mídia removida.');
    } catch (error) {
      const message =
        error instanceof ApiClientError ? error.message : 'Falha ao remover mídia.';
      setNotice(message);
    } finally {
      setActionBusy(null);
    }
  };

  const handleAddInventory = async () => {
    if (!accessToken || !selectedListing || !inventoryCodes.trim()) {
      return;
    }
    setActionBusy('inventory-add');
    setNotice(null);
    try {
      const codes = inventoryCodes
        .split(/[\n,;]+/)
        .map((value) => value.trim())
        .filter(Boolean);
      const result = await marketplaceApi.addInventoryItems(
        accessToken,
        selectedListing.id,
        codes,
      );
      setInventoryCodes('');
      setNotice(`Itens adicionados: ${result.created ?? 0}.`);
    } catch (error) {
      const message =
        error instanceof ApiClientError ? error.message : 'Falha ao adicionar inventário.';
      setNotice(message);
    } finally {
      setActionBusy(null);
    }
  };

  const handleImportInventory = async () => {
    if (!accessToken || !selectedListing || !inventoryImport.trim()) {
      return;
    }
    setActionBusy('inventory-import');
    setNotice(null);
    try {
      const result = await marketplaceApi.importInventoryItems(
        accessToken,
        selectedListing.id,
        inventoryImport,
      );
      setInventoryImport('');
      setNotice(`Importados: ${result.created ?? 0}. Ignorados: ${result.skipped ?? 0}.`);
    } catch (error) {
      const message =
        error instanceof ApiClientError ? error.message : 'Falha ao importar inventário.';
      setNotice(message);
    } finally {
      setActionBusy(null);
    }
  };

  const handleRemoveInventory = async () => {
    if (!accessToken || !selectedListing || !inventoryRemoveId.trim()) {
      return;
    }
    setActionBusy('inventory-remove');
    setNotice(null);
    try {
      const result = await marketplaceApi.removeInventoryItem(
        accessToken,
        selectedListing.id,
        inventoryRemoveId.trim(),
      );
      setInventoryRemoveId('');
      setNotice(`Itens removidos: ${result.removed ?? 0}.`);
    } catch (error) {
      const message =
        error instanceof ApiClientError ? error.message : 'Falha ao remover item.';
      setNotice(message);
    } finally {
      setActionBusy(null);
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

  if (!user) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">Entre para acessar seus anúncios.</p>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-full bg-meow-linear px-6 py-2 text-sm font-bold text-white"
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
          <p className="text-sm text-meow-muted">
            Seu perfil não possui acesso ao painel de anúncios.
          </p>
          <Link
            href="/conta"
            className="mt-4 inline-flex rounded-full border border-meow-red/30 px-6 py-2 text-sm font-bold text-meow-deep"
          >
            Voltar para conta
          </Link>
        </div>
      </section>
    );
  }

  const tabs: { label: string; value: ListingStatus | 'ALL' | 'SOLD' }[] = [
    { label: 'Todos', value: 'ALL' },
    { label: 'Ativos', value: 'PUBLISHED' },
    { label: 'Pausados', value: 'SUSPENDED' },
    { label: 'Em análise', value: 'PENDING' },
    { label: 'Vendidos', value: 'SOLD' },
  ];

  return (
    <AccountShell
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Conta', href: '/conta' },
        { label: 'Meus anúncios' },
      ]}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-meow-charcoal">Meus anúncios</h1>
          <p className="text-sm text-meow-muted">
            Gerencie anúncios ativos, pendentes ou pausados.
          </p>
        </div>
        <Link
          href="/anunciar"
          className="rounded-full bg-meow-300 px-5 py-2 text-sm font-black text-white shadow-cute"
        >
          + Novo anúncio
        </Link>
      </div>

      <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as ListingStatus | 'ALL' | 'SOLD')}>
        <TabsList className="mt-4">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm text-meow-muted">
          {notice}
        </div>
      ) : null}

      {state.status === 'loading' ? (
        <div className="rounded-xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
          Carregando anúncios...
        </div>
      ) : null}

      {statusFilter === 'SOLD' ? (
        <div className="rounded-xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
          Em breve: anúncios vendidos.
        </div>
      ) : null}

      {state.status === 'ready' && filteredListings.length === 0 && statusFilter !== 'SOLD' ? (
        <div className="rounded-xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
          Nenhum anúncio encontrado com esses filtros.
        </div>
      ) : null}

      <div className="mt-6 grid gap-4">
        {filteredListings.map((listing) => (
          <Card
            key={listing.id}
            className="rounded-[26px] border border-slate-100 p-5 shadow-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-lg font-black text-meow-charcoal">
                  <img
                    src={listing.media?.[0]?.url ?? '/assets/meoow/highlight-02.webp'}
                    alt={listing.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-meow-charcoal">{listing.title}</p>
                  <p className="text-xs text-meow-muted">
                    Visualizacoes: em breve | Vendas: em breve
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <Badge variant={statusTone[listing.status]}>
                  {statusLabel[listing.status] ?? listing.status}
                </Badge>
                <div className="text-sm font-black text-meow-charcoal">
                  {formatCurrency(listing.priceCents, listing.currency)}
                  <span className="ml-2 text-xs font-semibold text-meow-muted">
                    Estoque: --
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/anuncios/${listing.id}`}
                    className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-meow-charcoal"
                  >
                    Ver
                  </Link>
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => startEditing(listing)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => handleSubmitListing(listing.id)}
                    disabled={actionBusy === 'submit' || listing.status === 'PUBLISHED'}
                  >
                    Publicar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    type="button"
                    onClick={() => handleArchiveListing(listing.id)}
                    disabled={actionBusy === 'archive'}
                  >
                    Arquivar
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selectedListing && editForm ? (
        <div className="mt-8 grid gap-6">
          <Card className="rounded-[28px] border border-slate-100 p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-meow-charcoal">Editar anúncio</h2>
                <p className="text-sm text-meow-muted">
                  ID: {selectedListing.id.slice(0, 8)} | Status:{' '}
                  {statusLabel[selectedListing.status]}
                </p>
              </div>
              <Badge variant={statusTone[selectedListing.status]}>
                {statusLabel[selectedListing.status]}
              </Badge>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-xs font-semibold text-meow-muted">
                Título
                <Input
                  value={editForm.title ?? ''}
                  onChange={(event) =>
                    setEditForm((prev) => (prev ? { ...prev, title: event.target.value } : prev))
                  }
                />
              </label>
              <label className="grid gap-2 text-xs font-semibold text-meow-muted">
                Preço (centavos)
                <Input
                  type="number"
                  min={0}
                  value={editForm.priceCents ?? 0}
                  onChange={(event) =>
                    setEditForm((prev) =>
                      prev
                        ? { ...prev, priceCents: Number(event.target.value) }
                        : prev,
                    )
                  }
                />
              </label>
              <label className="grid gap-2 text-xs font-semibold text-meow-muted">
                Entrega
                <Select
                  value={editForm.deliveryType ?? 'AUTO'}
                  onChange={(event) =>
                    setEditForm((prev) =>
                      prev
                        ? { ...prev, deliveryType: event.target.value as DeliveryType }
                        : prev,
                    )
                  }
                >
                  <option value="AUTO">Entrega automática</option>
                  <option value="MANUAL">Entrega manual</option>
                </Select>
              </label>
              <label className="grid gap-2 text-xs font-semibold text-meow-muted">
                SLA (horas)
                <Input
                  type="number"
                  min={1}
                  value={editForm.deliverySlaHours ?? 24}
                  onChange={(event) =>
                    setEditForm((prev) =>
                      prev
                        ? { ...prev, deliverySlaHours: Number(event.target.value) }
                        : prev,
                    )
                  }
                />
              </label>
            </div>

            <label className="mt-4 grid gap-2 text-xs font-semibold text-meow-muted">
              Descrição
              <Textarea
                rows={4}
                value={editForm.description ?? ''}
                onChange={(event) =>
                  setEditForm((prev) =>
                    prev ? { ...prev, description: event.target.value } : prev,
                  )
                }
              />
            </label>

            <label className="mt-4 grid gap-2 text-xs font-semibold text-meow-muted">
              Politica de reembolso
              <Textarea
                rows={3}
                value={editForm.refundPolicy ?? ''}
                onChange={(event) =>
                  setEditForm((prev) =>
                    prev ? { ...prev, refundPolicy: event.target.value } : prev,
                  )
                }
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="button" onClick={handleUpdateListing} disabled={actionBusy === 'update'}>
                {actionBusy === 'update' ? 'Salvando...' : 'Salvar alteracoes'}
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={() => handleSubmitListing(selectedListing.id)}
                disabled={actionBusy === 'submit'}
              >
                Enviar para análise
              </Button>
            </div>
          </Card>

          <Card className="rounded-[28px] border border-slate-100 p-6 shadow-card">
            <h3 className="text-base font-bold text-meow-charcoal">Mídia do anúncio</h3>
            <p className="mt-1 text-xs text-meow-muted">
              Arraste ou selecione arquivos para enviar.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {(selectedListing.media ?? []).map((media) => (
                <div
                  key={media.id}
                  className="group relative overflow-hidden rounded-2xl border border-slate-100"
                >
                  <img
                    src={media.url}
                    alt={media.type}
                    className="h-32 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(media.id)}
                    className="absolute right-2 top-2 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold text-red-500 shadow-card"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm font-semibold text-meow-muted">
              Clique para adicionar mídias
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(event) =>
                  setMediaFiles(event.target.files ? Array.from(event.target.files) : [])
                }
              />
            </label>
            {mediaFiles.length > 0 ? (
              <p className="mt-2 text-xs text-meow-muted">
                {mediaFiles.length} arquivo(s) selecionado(s).
              </p>
            ) : null}
            <div className="mt-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleUploadMedia}
                disabled={actionBusy === 'media' || mediaFiles.length === 0}
              >
                {actionBusy === 'media' ? 'Enviando...' : 'Enviar mídias'}
              </Button>
            </div>
          </Card>

          <Card className="rounded-[28px] border border-slate-100 p-6 shadow-card">
            <h3 className="text-base font-bold text-meow-charcoal">Inventário</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4px] text-meow-muted">
                  Adicionar itens manualmente
                </p>
                <Textarea
                  rows={6}
                  value={inventoryCodes}
                  onChange={(event) => setInventoryCodes(event.target.value)}
                  placeholder="Cole os códigos, um por linha."
                />
                <Button
                  className="mt-2"
                  type="button"
                  onClick={handleAddInventory}
                  disabled={actionBusy === 'inventory-add'}
                >
                  Adicionar itens
                </Button>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4px] text-meow-muted">
                  Importar em lote
                </p>
                <Textarea
                  rows={6}
                  value={inventoryImport}
                  onChange={(event) => setInventoryImport(event.target.value)}
                  placeholder="Cole o arquivo de importacao."
                />
                <Button
                  className="mt-2"
                  type="button"
                  onClick={handleImportInventory}
                  disabled={actionBusy === 'inventory-import'}
                >
                  Importar
                </Button>
              </div>
            </div>
            <div className="mt-4 max-w-md">
              <p className="text-xs font-semibold uppercase tracking-[0.4px] text-meow-muted">
                Remover item
              </p>
              <Input
                value={inventoryRemoveId}
                onChange={(event) => setInventoryRemoveId(event.target.value)}
                placeholder="ID do item"
              />
              <Button
                className="mt-2"
                variant="danger"
                type="button"
                onClick={handleRemoveInventory}
                disabled={actionBusy === 'inventory-remove'}
              >
                Remover item
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </AccountShell>
  );
};
