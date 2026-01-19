'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import {
  marketplaceApi,
  type DeliveryType,
  type Listing,
  type ListingUpdateInput,
} from '../../lib/marketplace-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Textarea } from '../ui/textarea';

type ListingState = {
  status: 'loading' | 'ready';
  listing: Listing | null;
  error?: string;
};

const statusLabel: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Em analise',
  PUBLISHED: 'Publicado',
  SUSPENDED: 'Suspenso',
};

const statusTone: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'neutral'> = {
  DRAFT: 'neutral',
  PENDING: 'warning',
  PUBLISHED: 'success',
  SUSPENDED: 'danger',
};

export const AccountListingEditorContent = ({ listingId }: { listingId: string }) => {
  const { user, accessToken, loading } = useAuth();
  const [state, setState] = useState<ListingState>({
    status: 'loading',
    listing: null,
  });
  const [editForm, setEditForm] = useState<ListingUpdateInput | null>(null);
  const [inventoryCodes, setInventoryCodes] = useState('');
  const [inventoryImport, setInventoryImport] = useState('');
  const [inventoryRemoveId, setInventoryRemoveId] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const accessAllowed = user?.role === 'SELLER' || user?.role === 'ADMIN';

  useEffect(() => {
    if (!accessToken || !accessAllowed || !listingId) {
      return;
    }
    let active = true;
    const load = async () => {
      try {
        const listing = await marketplaceApi.getSellerListing(accessToken, listingId);
        if (!active) {
          return;
        }
        setState({ status: 'ready', listing });
        setEditForm({
          title: listing.title,
          description: listing.description ?? '',
          priceCents: listing.priceCents,
          currency: listing.currency,
          deliveryType: listing.deliveryType,
          deliverySlaHours: listing.deliverySlaHours ?? 24,
          refundPolicy: listing.refundPolicy ?? '',
        });
      } catch (error) {
        if (!active) {
          return;
        }
        const message =
          error instanceof ApiClientError
            ? error.message
            : 'Nao foi possivel carregar o anuncio.';
        setState({ status: 'ready', listing: null, error: message });
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [accessAllowed, accessToken, listingId]);

  const refreshListing = async () => {
    if (!accessToken) {
      return;
    }
    const listing = await marketplaceApi.getSellerListing(accessToken, listingId);
    setState((prev) => ({ ...prev, listing }));
  };

  const handleUpdateListing = async () => {
    if (!accessToken || !state.listing || !editForm) {
      return;
    }
    setActionBusy('update');
    setNotice(null);
    try {
      await marketplaceApi.updateListing(accessToken, state.listing.id, {
        ...editForm,
        description: editForm.description?.trim() || undefined,
      });
      await refreshListing();
      setNotice('Anuncio atualizado.');
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Nao foi possivel atualizar o anuncio.';
      setNotice(message);
    } finally {
      setActionBusy(null);
    }
  };

  const handleSubmitListing = async () => {
    if (!accessToken || !state.listing) {
      return;
    }
    setActionBusy('submit');
    setNotice(null);
    try {
      await marketplaceApi.submitListing(accessToken, state.listing.id);
      await refreshListing();
      setNotice('Anuncio enviado para analise.');
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Nao foi possivel enviar o anuncio.';
      setNotice(message);
    } finally {
      setActionBusy(null);
    }
  };

  const handleArchiveListing = async () => {
    if (!accessToken || !state.listing) {
      return;
    }
    setActionBusy('archive');
    setNotice(null);
    try {
      await marketplaceApi.archiveListing(accessToken, state.listing.id);
      await refreshListing();
      setNotice('Anuncio pausado.');
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Nao foi possivel pausar o anuncio.';
      setNotice(message);
    } finally {
      setActionBusy(null);
    }
  };

  const handleUploadMedia = async () => {
    if (!accessToken || !state.listing || mediaFiles.length === 0) {
      return;
    }
    setActionBusy('media');
    setNotice(null);
    try {
      for (const file of mediaFiles) {
        // Upload sequentially to preserve ordering
        // eslint-disable-next-line no-await-in-loop
        await marketplaceApi.uploadMedia(
          accessToken,
          state.listing.id,
          file,
          state.listing.media?.length ?? 0,
        );
      }
      setMediaFiles([]);
      await refreshListing();
      setNotice('Midias enviadas.');
    } catch (error) {
      const message =
        error instanceof ApiClientError ? error.message : 'Falha ao enviar midia.';
      setNotice(message);
    } finally {
      setActionBusy(null);
    }
  };

  const handleRemoveMedia = async (mediaId: string) => {
    if (!accessToken || !state.listing) {
      return;
    }
    setActionBusy('remove-media');
    setNotice(null);
    try {
      await marketplaceApi.removeMedia(accessToken, state.listing.id, mediaId);
      await refreshListing();
      setNotice('Midia removida.');
    } catch (error) {
      const message =
        error instanceof ApiClientError ? error.message : 'Falha ao remover midia.';
      setNotice(message);
    } finally {
      setActionBusy(null);
    }
  };

  const handleAddInventory = async () => {
    if (!accessToken || !state.listing || !inventoryCodes.trim()) {
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
        state.listing.id,
        codes,
      );
      setInventoryCodes('');
      setNotice(`Itens adicionados: ${result.created ?? 0}.`);
    } catch (error) {
      const message =
        error instanceof ApiClientError ? error.message : 'Falha ao adicionar inventario.';
      setNotice(message);
    } finally {
      setActionBusy(null);
    }
  };

  const handleImportInventory = async () => {
    if (!accessToken || !state.listing || !inventoryImport.trim()) {
      return;
    }
    setActionBusy('inventory-import');
    setNotice(null);
    try {
      const result = await marketplaceApi.importInventoryItems(
        accessToken,
        state.listing.id,
        inventoryImport,
      );
      setInventoryImport('');
      setNotice(`Importados: ${result.created ?? 0}. Ignorados: ${result.skipped ?? 0}.`);
    } catch (error) {
      const message =
        error instanceof ApiClientError ? error.message : 'Falha ao importar inventario.';
      setNotice(message);
    } finally {
      setActionBusy(null);
    }
  };

  const handleRemoveInventory = async () => {
    if (!accessToken || !state.listing || !inventoryRemoveId.trim()) {
      return;
    }
    setActionBusy('inventory-remove');
    setNotice(null);
    try {
      const result = await marketplaceApi.removeInventoryItem(
        accessToken,
        state.listing.id,
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
          Carregando sessao...
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">Entre para acessar seus anuncios.</p>
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
            Seu perfil nao possui acesso ao painel de anuncios.
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

  if (state.status === 'loading') {
    return (
      <AccountShell
        breadcrumbs={[
          { label: 'Inicio', href: '/' },
          { label: 'Conta', href: '/conta' },
          { label: 'Meus anuncios', href: '/conta/anuncios' },
          { label: 'Editar anuncio' },
        ]}
      >
        <div className="rounded-2xl border border-slate-100 bg-meow-50 px-4 py-3 text-sm text-meow-muted">
          Carregando anuncio...
        </div>
      </AccountShell>
    );
  }

  if (state.status === 'ready' && !state.listing) {
    return (
      <AccountShell
        breadcrumbs={[
          { label: 'Inicio', href: '/' },
          { label: 'Conta', href: '/conta' },
          { label: 'Meus anuncios', href: '/conta/anuncios' },
          { label: 'Editar anuncio' },
        ]}
      >
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error ?? 'Anuncio nao encontrado.'}
        </div>
      </AccountShell>
    );
  }

  return (
    <AccountShell
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Conta', href: '/conta' },
        { label: 'Meus anuncios', href: '/conta/anuncios' },
        { label: 'Editar anuncio' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-meow-charcoal">Editar anuncio</h1>
            <p className="text-sm text-meow-muted">
              ID: {state.listing?.id.slice(0, 8)} | Status:{' '}
              {statusLabel[state.listing?.status ?? 'DRAFT']}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusTone[state.listing?.status ?? 'DRAFT']}>
              {statusLabel[state.listing?.status ?? 'DRAFT']}
            </Badge>
            <Link
              href="/conta/anuncios"
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-meow-charcoal"
            >
              Voltar
            </Link>
          </div>
        </div>

        {notice ? (
          <div className="rounded-xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm text-meow-muted">
            {notice}
          </div>
        ) : null}

        <Card className="rounded-2xl border border-slate-100 p-6 shadow-card">
          <h3 className="text-lg font-bold text-meow-charcoal">Informações do anúncio</h3>
          <p className="mt-1 text-xs text-meow-muted">
            Preencha os dados do seu anúncio.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-meow-charcoal">Título do anúncio</span>
              <Input
                value={editForm?.title ?? ''}
                onChange={(event) =>
                  setEditForm((prev) => (prev ? { ...prev, title: event.target.value } : prev))
                }
                placeholder="Ex: Conta Valorant Imortal"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-meow-charcoal">Preço (R$)</span>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={((editForm?.priceCents ?? 0) / 100).toFixed(2)}
                onChange={(event) =>
                  setEditForm((prev) =>
                    prev ? { ...prev, priceCents: Math.round(Number(event.target.value) * 100) } : prev,
                  )
                }
                placeholder="0.00"
              />
            </label>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-meow-charcoal">Tipo de entrega</span>
              <Select
                value={editForm?.deliveryType ?? 'AUTO'}
                onChange={(event) =>
                  setEditForm((prev) =>
                    prev ? { ...prev, deliveryType: event.target.value as DeliveryType } : prev,
                  )
                }
              >
                <option value="AUTO">Entrega automática</option>
                <option value="MANUAL">Entrega manual</option>
              </Select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-meow-charcoal">Prazo de entrega (horas)</span>
              <Input
                type="number"
                min={1}
                max={720}
                value={editForm?.deliverySlaHours ?? 24}
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

          <label className="mt-5 grid gap-2">
            <span className="text-xs font-semibold text-meow-charcoal">Descrição</span>
            <Textarea
              rows={5}
              value={editForm?.description ?? ''}
              onChange={(event) =>
                setEditForm((prev) =>
                  prev ? { ...prev, description: event.target.value } : prev,
                )
              }
              placeholder="Descreva os detalhes do seu produto, o que está incluso, diferenciais, etc."
            />
          </label>

          <label className="mt-5 grid gap-2">
            <span className="text-xs font-semibold text-meow-charcoal">Política de reembolso</span>
            <Textarea
              rows={3}
              value={editForm?.refundPolicy ?? ''}
              onChange={(event) =>
                setEditForm((prev) =>
                  prev ? { ...prev, refundPolicy: event.target.value } : prev,
                )
              }
              placeholder="Descreva as condições de reembolso para este anúncio."
            />
          </label>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" onClick={handleUpdateListing} disabled={actionBusy === 'update'}>
              {actionBusy === 'update' ? 'Salvando...' : 'Salvar alterações'}
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={handleSubmitListing}
              disabled={actionBusy === 'submit'}
            >
              Enviar para análise
            </Button>
            <Button
              variant="danger"
              type="button"
              onClick={handleArchiveListing}
              disabled={actionBusy === 'archive'}
            >
              Pausar anúncio
            </Button>
          </div>
        </Card>

        <Card className="rounded-2xl border border-slate-100 p-6 shadow-card">
          <h3 className="text-base font-bold text-meow-charcoal">Midia do anuncio</h3>
          <p className="mt-1 text-xs text-meow-muted">
            Arraste ou selecione arquivos para enviar.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {(state.listing?.media ?? []).map((media) => (
              <div
                key={media.id}
                className="group relative overflow-hidden rounded-2xl border border-slate-100"
              >
                <img src={media.url} alt={media.type} className="h-32 w-full object-cover" />
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
            Clique para adicionar midias
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
              {actionBusy === 'media' ? 'Enviando...' : 'Enviar midias'}
            </Button>
          </div>
        </Card>

        <Card className="rounded-2xl border border-slate-100 p-6 shadow-card">
          <h3 className="text-base font-bold text-meow-charcoal">Inventario</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4px] text-meow-muted">
                Adicionar itens manualmente
              </p>
              <Textarea
                rows={6}
                value={inventoryCodes}
                onChange={(event) => setInventoryCodes(event.target.value)}
                placeholder="Cole os codigos, um por linha."
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
    </AccountShell>
  );
};
