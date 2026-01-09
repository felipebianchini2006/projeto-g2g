'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import {
  marketplaceApi,
  type Listing,
  type ListingInput,
} from '../../lib/marketplace-api';
import { useAuth } from '../auth/auth-provider';

const emptyListing: ListingInput = {
  categoryId: '',
  title: '',
  description: '',
  priceCents: 0,
  currency: 'BRL',
  deliveryType: 'AUTO',
  deliverySlaHours: 24,
  refundPolicy: 'Reembolso disponivel enquanto o pedido estiver em aberto.',
};

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

const statusLabel: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Pendente',
  PUBLISHED: 'Publicado',
  SUSPENDED: 'Suspenso',
};

const deliveryLabel: Record<string, string> = {
  AUTO: 'Entrega auto',
  MANUAL: 'Entrega manual',
};

export const DashboardContent = () => {
  const { user, accessToken, logout, loading } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formState, setFormState] = useState<ListingInput>(emptyListing);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [inventoryCodes, setInventoryCodes] = useState('');
  const [inventoryPayload, setInventoryPayload] = useState('');
  const [inventoryRemoveId, setInventoryRemoveId] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPosition, setMediaPosition] = useState('0');

  const isSeller = user?.role === 'SELLER';

  const listingSummary = useMemo(() => {
    if (!selectedListing) {
      return null;
    }
    const totalMedia = selectedListing.media?.length ?? 0;
    return {
      mediaCount: totalMedia,
      delivery: deliveryLabel[selectedListing.deliveryType] ?? selectedListing.deliveryType,
      status: statusLabel[selectedListing.status] ?? selectedListing.status,
    };
  }, [selectedListing]);

  const canSubmit = selectedListing?.status === 'DRAFT';
  const canArchive = selectedListing?.status !== 'SUSPENDED';

  const handleError = (error: unknown, fallback = 'Nao foi possivel concluir a operacao.') => {
    if (error instanceof ApiClientError) {
      setError(error.message);
      return;
    }
    setError(error instanceof Error ? error.message : fallback);
  };

  const loadListings = async () => {
    if (!accessToken) {
      return;
    }
    setBusyAction('load');
    setError(null);
    try {
      const data = await marketplaceApi.listSellerListings(accessToken);
      setListings(data);
    } catch (error) {
      handleError(error, 'Nao foi possivel carregar anuncios.');
    } finally {
      setBusyAction(null);
    }
  };

  const loadListingDetail = async (listingId: string) => {
    if (!accessToken) {
      return;
    }
    setBusyAction('detail');
    setError(null);
    try {
      const data = await marketplaceApi.getSellerListing(accessToken, listingId);
      setSelectedListing(data);
    } catch (error) {
      handleError(error, 'Nao foi possivel carregar detalhes do anuncio.');
    } finally {
      setBusyAction(null);
    }
  };

  useEffect(() => {
    if (accessToken && isSeller) {
      loadListings();
    }
  }, [accessToken, isSeller]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedListing(null);
      return;
    }
    loadListingDetail(selectedId);
  }, [selectedId]);

  const resetForm = () => {
    setFormMode('create');
    setFormState(emptyListing);
    setSelectedId(null);
    setSelectedListing(null);
    setNotice(null);
    setError(null);
  };

  const handleSelectListing = (listing: Listing) => {
    setFormMode('edit');
    setFormState({
      categoryId: listing.categoryId,
      title: listing.title,
      description: listing.description ?? '',
      priceCents: listing.priceCents,
      currency: listing.currency,
      deliveryType: listing.deliveryType,
      deliverySlaHours: listing.deliverySlaHours,
      refundPolicy: listing.refundPolicy,
    });
    setSelectedId(listing.id);
    setNotice(null);
    setError(null);
  };

  const handleCreateOrUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) {
      setError('Sessao expirada. Entre novamente.');
      return;
    }
    setBusyAction(formMode);
    setError(null);
    setNotice(null);
    try {
      const payload: ListingInput = {
        ...formState,
        description: formState.description?.trim() || undefined,
      };
      const result =
        formMode === 'edit' && selectedId
          ? await marketplaceApi.updateListing(accessToken, selectedId, payload)
          : await marketplaceApi.createListing(accessToken, payload);
      setListings((prev) => {
        const index = prev.findIndex((item) => item.id === result.id);
        if (index === -1) {
          return [result, ...prev];
        }
        const updated = [...prev];
        updated[index] = result;
        return updated;
      });
      setSelectedId(result.id);
      setSelectedListing(result);
      setFormMode('edit');
      setNotice(formMode === 'edit' ? 'Anuncio atualizado.' : 'Anuncio criado.');
    } catch (error) {
      handleError(error, 'Nao foi possivel salvar o anuncio.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSubmitListing = async () => {
    if (!accessToken || !selectedId) {
      return;
    }
    setBusyAction('submit');
    setError(null);
    setNotice(null);
    try {
      const updated = await marketplaceApi.submitListing(accessToken, selectedId);
      setListings((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedListing(updated);
      setNotice('Anuncio enviado para aprovacao.');
    } catch (error) {
      handleError(error, 'Nao foi possivel enviar para aprovacao.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleArchiveListing = async () => {
    if (!accessToken || !selectedId) {
      return;
    }
    setBusyAction('archive');
    setError(null);
    setNotice(null);
    try {
      const updated = await marketplaceApi.archiveListing(accessToken, selectedId);
      setListings((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedListing(updated);
      setNotice('Anuncio suspenso.');
    } catch (error) {
      handleError(error, 'Nao foi possivel suspender o anuncio.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleAddInventory = async () => {
    if (!accessToken || !selectedId) {
      return;
    }
    const codes = inventoryCodes
      .split(/[\n,;]+/)
      .map((code) => code.trim())
      .filter(Boolean);
    if (codes.length === 0) {
      setError('Informe pelo menos um codigo.');
      return;
    }
    setBusyAction('inventory-add');
    setError(null);
    setNotice(null);
    try {
      const result = await marketplaceApi.addInventoryItems(accessToken, selectedId, codes);
      setNotice(`Inventario atualizado: ${result.created ?? 0} novos.`);
      setInventoryCodes('');
    } catch (error) {
      handleError(error, 'Nao foi possivel adicionar inventario.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleImportInventory = async () => {
    if (!accessToken || !selectedId) {
      return;
    }
    if (!inventoryPayload.trim()) {
      setError('Informe o payload para importar.');
      return;
    }
    setBusyAction('inventory-import');
    setError(null);
    setNotice(null);
    try {
      const result = await marketplaceApi.importInventoryItems(accessToken, selectedId, inventoryPayload);
      setNotice(`Importacao concluida: ${result.created ?? 0} novos.`);
      setInventoryPayload('');
    } catch (error) {
      handleError(error, 'Nao foi possivel importar inventario.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleRemoveInventory = async () => {
    if (!accessToken || !selectedId) {
      return;
    }
    if (!inventoryRemoveId.trim()) {
      setError('Informe o itemId para remover.');
      return;
    }
    setBusyAction('inventory-remove');
    setError(null);
    setNotice(null);
    try {
      await marketplaceApi.removeInventoryItem(accessToken, selectedId, inventoryRemoveId.trim());
      setNotice('Item removido do inventario.');
      setInventoryRemoveId('');
    } catch (error) {
      handleError(error, 'Nao foi possivel remover o item.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleUploadMedia = async () => {
    if (!accessToken || !selectedId || !mediaFile) {
      setError('Selecione um arquivo.');
      return;
    }
    setBusyAction('media-upload');
    setError(null);
    setNotice(null);
    try {
      await marketplaceApi.uploadMedia(accessToken, selectedId, mediaFile, Number(mediaPosition));
      await loadListingDetail(selectedId);
      setNotice('Midia enviada com sucesso.');
      setMediaFile(null);
    } catch (error) {
      handleError(error, 'Nao foi possivel enviar a midia.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleRemoveMedia = async (mediaId: string) => {
    if (!accessToken || !selectedId) {
      return;
    }
    setBusyAction('media-remove');
    setError(null);
    setNotice(null);
    try {
      await marketplaceApi.removeMedia(accessToken, selectedId, mediaId);
      await loadListingDetail(selectedId);
      setNotice('Midia removida.');
    } catch (error) {
      handleError(error, 'Nao foi possivel remover a midia.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleLogout = async () => {
    setBusyAction('logout');
    await logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="dashboard-shell">
        <div className="dashboard-card">
          <h1>Dashboard</h1>
          <p className="auth-helper">Carregando sessao...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="dashboard-shell">
        <div className="dashboard-card">
          <h1>Dashboard</h1>
          <p className="auth-helper">Entre para acessar seu painel.</p>
          <Link className="primary-button" href="/login">
            Fazer login
          </Link>
        </div>
      </div>
    );
  }

  if (!isSeller) {
    return (
      <div className="dashboard-shell">
        <div className="dashboard-card">
          <h1>Dashboard</h1>
          <p className="auth-helper">Seu usuario nao possui acesso ao painel do seller.</p>
          <Link className="ghost-button" href="/">
            Voltar para home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="seller-dashboard">
      <div className="seller-header">
        <div>
          <h1>Painel do seller</h1>
          <p className="auth-helper">Gerencie anuncios, inventario e midias.</p>
        </div>
        <div className="dashboard-actions">
          <Link className="ghost-button" href="/conta/carteira">
            Carteira
          </Link>
          <button className="ghost-button" type="button" onClick={resetForm}>
            Novo anuncio
          </button>
          <button className="primary-button" type="button" onClick={handleLogout} disabled={busyAction === 'logout'}>
            {busyAction === 'logout' ? 'Saindo...' : 'Sair'}
          </button>
        </div>
      </div>

      {error ? <div className="state-card error">Erro: {error}</div> : null}
      {notice ? <div className="state-card success">{notice}</div> : null}

      <div className="seller-grid">
        <section className="seller-panel">
          <div className="panel-header">
            <h2>Seus anuncios</h2>
            <button className="ghost-button" type="button" onClick={loadListings} disabled={busyAction === 'load'}>
              {busyAction === 'load' ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>

          {busyAction === 'load' ? (
            <div className="state-card">Carregando anuncios...</div>
          ) : null}

          {listings.length === 0 && busyAction !== 'load' ? (
            <div className="state-card">Nenhum anuncio criado ainda.</div>
          ) : null}

          <div className="listing-stack">
            {listings.map((listing) => (
              <button
                className={`listing-row${listing.id === selectedId ? ' active' : ''}`}
                key={listing.id}
                type="button"
                onClick={() => handleSelectListing(listing)}
              >
                <div>
                  <h3>{listing.title}</h3>
                  <p className="listing-meta">
                    {formatCurrency(listing.priceCents, listing.currency)} ·{' '}
                    {deliveryLabel[listing.deliveryType] ?? listing.deliveryType}
                  </p>
                </div>
                <span className={`status-pill status-${listing.status.toLowerCase()}`}>
                  {statusLabel[listing.status] ?? listing.status}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="seller-panel">
          <div className="panel-header">
            <h2>{formMode === 'edit' ? 'Editar anuncio' : 'Novo anuncio'}</h2>
            {selectedListing ? (
              <div className="seller-listing-summary">
                <span>{listingSummary?.status}</span>
                <span>{listingSummary?.delivery}</span>
                <span>{listingSummary?.mediaCount ?? 0} midias</span>
              </div>
            ) : null}
          </div>

          <form className="seller-form" onSubmit={handleCreateOrUpdate}>
            <label className="form-field">
              Categoria (ID)
              <input
                className="form-input"
                value={formState.categoryId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, categoryId: event.target.value }))
                }
                placeholder="UUID da categoria"
                required
              />
            </label>
            <label className="form-field">
              Titulo
              <input
                className="form-input"
                value={formState.title}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="Nome do anuncio"
                required
              />
            </label>
            <label className="form-field">
              Descricao
              <textarea
                className="form-textarea"
                value={formState.description}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, description: event.target.value }))
                }
                rows={3}
              />
            </label>
            <div className="form-grid">
              <label className="form-field">
                Preco (centavos)
                <input
                  className="form-input"
                  type="number"
                  min={1}
                  value={formState.priceCents}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      priceCents: Number(event.target.value || 0),
                    }))
                  }
                  required
                />
              </label>
              <label className="form-field">
                Moeda
                <input
                  className="form-input"
                  value={formState.currency}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, currency: event.target.value }))
                  }
                />
              </label>
            </div>
            <div className="form-grid">
              <label className="form-field">
                Tipo de entrega
                <select
                  className="form-input"
                  value={formState.deliveryType}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      deliveryType: event.target.value as ListingInput['deliveryType'],
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
                  value={formState.deliverySlaHours}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      deliverySlaHours: Number(event.target.value || 0),
                    }))
                  }
                />
              </label>
            </div>
            <label className="form-field">
              Politica de reembolso
              <textarea
                className="form-textarea"
                value={formState.refundPolicy}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, refundPolicy: event.target.value }))
                }
                rows={3}
              />
            </label>
            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={busyAction === formMode}>
                {busyAction === formMode
                  ? 'Salvando...'
                  : formMode === 'edit'
                    ? 'Salvar alteracoes'
                    : 'Criar anuncio'}
              </button>
              {formMode === 'edit' ? (
                <>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={handleSubmitListing}
                    disabled={!canSubmit || busyAction === 'submit'}
                  >
                    {busyAction === 'submit' ? 'Enviando...' : 'Enviar para aprovacao'}
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={handleArchiveListing}
                    disabled={!canArchive || busyAction === 'archive'}
                  >
                    {busyAction === 'archive' ? 'Suspenso...' : 'Suspender anuncio'}
                  </button>
                </>
              ) : null}
            </div>
          </form>

          {selectedListing ? (
            <div className="seller-section">
              <h3>Midias</h3>
              <div className="media-grid">
                {(selectedListing.media ?? []).map((media) => (
                  <div className="media-card" key={media.id}>
                    <img src={media.url} alt={media.type} />
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => handleRemoveMedia(media.id)}
                      disabled={busyAction === 'media-remove'}
                    >
                      Remover
                    </button>
                  </div>
                ))}
                {selectedListing.media && selectedListing.media.length === 0 ? (
                  <div className="state-card">Nenhuma midia enviada ainda.</div>
                ) : null}
              </div>
              <div className="media-upload">
                <input
                  type="file"
                  onChange={(event) => setMediaFile(event.target.files?.[0] ?? null)}
                />
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  max={50}
                  value={mediaPosition}
                  onChange={(event) => setMediaPosition(event.target.value)}
                />
                <button
                  className="primary-button"
                  type="button"
                  onClick={handleUploadMedia}
                  disabled={busyAction === 'media-upload'}
                >
                  {busyAction === 'media-upload' ? 'Enviando...' : 'Enviar midia'}
                </button>
              </div>
            </div>
          ) : null}

          {selectedListing && selectedListing.deliveryType === 'AUTO' ? (
            <div className="seller-section">
              <h3>Inventario (auto)</h3>
              <p className="auth-helper">
                O painel suporta add/import/remove. Para listar itens completos sera preciso
                endpoint dedicado.
              </p>
              <label className="form-field">
                Adicionar codigos
                <textarea
                  className="form-textarea"
                  value={inventoryCodes}
                  onChange={(event) => setInventoryCodes(event.target.value)}
                  rows={3}
                  placeholder="Um por linha ou separado por virgula"
                />
              </label>
              <button
                className="ghost-button"
                type="button"
                onClick={handleAddInventory}
                disabled={busyAction === 'inventory-add'}
              >
                {busyAction === 'inventory-add' ? 'Adicionando...' : 'Adicionar inventario'}
              </button>
              <label className="form-field">
                Importar CSV/texto
                <textarea
                  className="form-textarea"
                  value={inventoryPayload}
                  onChange={(event) => setInventoryPayload(event.target.value)}
                  rows={3}
                />
              </label>
              <button
                className="ghost-button"
                type="button"
                onClick={handleImportInventory}
                disabled={busyAction === 'inventory-import'}
              >
                {busyAction === 'inventory-import' ? 'Importando...' : 'Importar'}
              </button>
              <label className="form-field">
                Remover por itemId
                <input
                  className="form-input"
                  value={inventoryRemoveId}
                  onChange={(event) => setInventoryRemoveId(event.target.value)}
                  placeholder="UUID do item"
                />
              </label>
              <button
                className="ghost-button"
                type="button"
                onClick={handleRemoveInventory}
                disabled={busyAction === 'inventory-remove'}
              >
                {busyAction === 'inventory-remove' ? 'Removendo...' : 'Remover item'}
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
};
