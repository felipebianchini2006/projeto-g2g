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

  const todaySales = listings.length * 15000;
  const totalBalance = listings.length * 85000;
  const pendingQuestions = listings.length ? 3 : 0;
  const openTickets = listings.length ? 1 : 0;

  const handleError = (error: unknown, fallback = 'Não foi possível concluir a operacao.') => {
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
      handleError(error, 'Não foi possível carregar anúncios.');
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
      handleError(error, 'Não foi possível carregar detalhes do anúncio.');
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
      setError('Sessão expirada. Entre novamente.');
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
      setNotice(formMode === 'edit' ? 'Anúncio atualizado.' : 'Anúncio criado.');
    } catch (error) {
      handleError(error, 'Não foi possível salvar o anúncio.');
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
      setNotice('Anúncio enviado para aprovação.');
    } catch (error) {
      handleError(error, 'Não foi possível enviar para aprovação.');
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
      setNotice('Anúncio suspenso.');
    } catch (error) {
      handleError(error, 'Não foi possível suspender o anúncio.');
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
      setError('Informe pelo menos um código.');
      return;
    }
    setBusyAction('inventory-add');
    setError(null);
    setNotice(null);
    try {
      const result = await marketplaceApi.addInventoryItems(accessToken, selectedId, codes);
      setNotice(`Inventário atualizado: ${result.created ?? 0} novos.`);
      setInventoryCodes('');
    } catch (error) {
      handleError(error, 'Não foi possível adicionar inventário.');
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
      handleError(error, 'Não foi possível importar inventário.');
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
      setNotice('Item removido do inventário.');
      setInventoryRemoveId('');
    } catch (error) {
      handleError(error, 'Não foi possível remover o item.');
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
      setNotice('Mídia enviada com sucesso.');
      setMediaFile(null);
    } catch (error) {
      handleError(error, 'Não foi possível enviar a mídia.');
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
      setNotice('Mídia removida.');
    } catch (error) {
      handleError(error, 'Não foi possível remover a mídia.');
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
          <p className="auth-helper">Carregando sessão...</p>
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
          <p className="auth-helper">Seu usuário não possui acesso ao painel do seller.</p>
          <Link className="ghost-button" href="/">
            Voltar para home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="bg-meow-50/60 px-6 py-10">
      <div className="mx-auto grid w-full max-w-[1200px] gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <div className="rounded-[26px] border border-slate-100 bg-white p-5 text-center shadow-card">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-meow-200 to-meow-300 text-xl font-black text-white shadow-cute">
              LP
            </div>
            <h2 className="mt-4 text-lg font-black text-meow-charcoal">Loja do Seller</h2>
            <p className="text-xs font-semibold text-meow-muted">4.9 (2.3k vendas)</p>
            <Link
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-meow-charcoal"
              href="/produtos"
            >
              Visualizar loja pública
            </Link>
          </div>

          <div className="rounded-[26px] border border-slate-100 bg-white p-4 shadow-card">
            <p className="text-[11px] font-bold uppercase tracking-[0.4px] text-meow-muted">
              Gestao
            </p>
            <div className="mt-3 grid gap-1 text-sm">
              <button className="rounded-xl bg-meow-50 px-3 py-2 text-left text-sm font-semibold text-meow-deep">
                Visão geral
              </button>
              <Link
                className="rounded-xl px-3 py-2 text-sm font-semibold text-meow-charcoal/80 hover:bg-meow-50"
                href="/conta/vendas"
              >
                Minhas vendas
              </Link>
              <Link
                className="rounded-xl px-3 py-2 text-sm font-semibold text-meow-charcoal/80 hover:bg-meow-50"
                href="/conta/tickets"
              >
                Perguntas
              </Link>
              <Link
                className="rounded-xl px-3 py-2 text-sm font-semibold text-meow-charcoal/80 hover:bg-meow-50"
                href="/conta/tickets"
              >
                Intermediacoes
              </Link>
            </div>
            <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.4px] text-meow-muted">
              Financeiro
            </p>
            <div className="mt-3 grid gap-1 text-sm">
              <Link
                className="rounded-xl px-3 py-2 text-sm font-semibold text-meow-charcoal/80 hover:bg-meow-50"
                href="/conta/carteira"
              >
                Carteira
              </Link>
              <Link
                className="rounded-xl px-3 py-2 text-sm font-semibold text-meow-charcoal/80 hover:bg-meow-50"
                href="/conta/carteira/extrato"
              >
                Extrato
              </Link>
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <div className="rounded-[26px] border border-slate-100 bg-white p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-meow-charcoal">Visão geral</h1>
                <p className="mt-1 text-sm text-meow-muted">
                  Acompanhe o desempenho da sua loja.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-meow-charcoal" href="/conta/carteira">
                  Carteira
                </Link>
                <button className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-meow-charcoal" type="button" onClick={resetForm}>
                  Novo anúncio
                </button>
                <button className="rounded-full bg-meow-300 px-4 py-2 text-xs font-bold text-white shadow-cute" type="button" onClick={handleLogout} disabled={busyAction === 'logout'}>
                  {busyAction === 'logout' ? 'Saindo...' : 'Sair'}
                </button>
              </div>
            </div>
          </div>

          {error ? <div className="state-card error">Erro: {error}</div> : null}
          {notice ? <div className="state-card success">{notice}</div> : null}

          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                label: 'Vendas hoje',
                value: formatCurrency(todaySales),
                hint: '+12% vs ontem',
                tone: 'bg-rose-50 text-meow-deep',
              },
              {
                label: 'Saldo total',
                value: formatCurrency(totalBalance),
                hint: 'Disp: R$ 2.450',
                tone: 'bg-emerald-50 text-emerald-600',
              },
              {
                label: 'Perguntas',
                value: `${pendingQuestions}`,
                hint: 'Responder agora',
                tone: 'bg-orange-50 text-orange-500',
              },
              {
                label: 'Ticket aberto',
                value: `${openTickets}`,
                hint: 'Acao necessaria',
                tone: 'bg-red-50 text-red-500',
              },
            ].map((card) => (
              <div key={card.label} className="rounded-[22px] border border-slate-100 bg-white p-5 shadow-card">
                <div className={`grid h-11 w-11 place-items-center rounded-2xl text-sm font-black ${card.tone}`}>
                  {card.label.slice(0, 1)}
                </div>
                <p className="mt-4 text-xs font-semibold uppercase text-meow-muted">{card.label}</p>
                <p className="mt-2 text-2xl font-black text-meow-charcoal">{card.value}</p>
                <p className="mt-1 text-xs text-meow-muted">{card.hint}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[26px] border border-slate-100 bg-white p-6 shadow-card">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-black text-meow-charcoal">Desempenho de vendas</h2>
              <button className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-meow-charcoal">
                Ultimos 7 dias
              </button>
            </div>
            <div className="mt-4 h-40 rounded-2xl bg-gradient-to-r from-meow-50 to-slate-50" />
          </div>

          <div className="seller-grid">
            <section className="seller-panel">
              <div className="panel-header">
                <h2>Seus anúncios</h2>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={loadListings}
                  disabled={busyAction === 'load'}
                >
                  {busyAction === 'load' ? 'Atualizando...' : 'Atualizar'}
                </button>
              </div>

              {busyAction === 'load' ? (
                <div className="state-card">Carregando anúncios...</div>
              ) : null}

              {listings.length === 0 && busyAction !== 'load' ? (
                <div className="state-card">Nenhum anúncio criado ainda.</div>
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
                        {formatCurrency(listing.priceCents, listing.currency)} |{' '}
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
                <h2>{formMode === 'edit' ? 'Editar anúncio' : 'Novo anúncio'}</h2>
                {selectedListing ? (
                  <div className="seller-listing-summary">
                    <span>{listingSummary?.status}</span>
                    <span>{listingSummary?.delivery}</span>
                    <span>{listingSummary?.mediaCount ?? 0} mídias</span>
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
                  Título
                  <input
                    className="form-input"
                    value={formState.title}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, title: event.target.value }))
                    }
                    placeholder="Nome do anúncio"
                    required
                  />
                </label>
                <label className="form-field">
                  Descrição
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
                    Preço (centavos)
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
                        : 'Criar anúncio'}
                  </button>
                  {formMode === 'edit' ? (
                    <>
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={handleSubmitListing}
                        disabled={!canSubmit || busyAction === 'submit'}
                      >
                        {busyAction === 'submit' ? 'Enviando...' : 'Enviar para aprovação'}
                      </button>
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={handleArchiveListing}
                        disabled={!canArchive || busyAction === 'archive'}
                      >
                        {busyAction === 'archive' ? 'Suspenso...' : 'Suspender anúncio'}
                      </button>
                    </>
                  ) : null}
                </div>
              </form>

              {selectedListing ? (
                <div className="seller-section">
                  <h3>Mídias</h3>
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
                      <div className="state-card">Nenhuma mídia enviada ainda.</div>
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
                      {busyAction === 'media-upload' ? 'Enviando...' : 'Enviar mídia'}
                    </button>
                  </div>
                </div>
              ) : null}

              {selectedListing && selectedListing.deliveryType === 'AUTO' ? (
                <div className="seller-section">
                  <h3>Inventário (auto)</h3>
                  <p className="auth-helper">
                    O painel suporta add/import/remove. Para listar itens completos será preciso
                    endpoint dedicado.
                  </p>
                  <label className="form-field">
                    Adicionar códigos
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
                    {busyAction === 'inventory-add'
                      ? 'Adicionando...'
                      : 'Adicionar inventário'}
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
      </div>
    </section>
  );
};
