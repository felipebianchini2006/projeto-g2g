
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../../../components/auth/auth-provider';
import { ApiClientError } from '../../../lib/api-client';
import {
  catalogPublicApi,
  type CatalogGroup,
  type CatalogOption,
  type CatalogSection,
} from '../../../lib/catalog-public-api';
import {
  marketplaceApi,
  type Listing,
  type ListingInput,
} from '../../../lib/marketplace-api';
import {
  fetchPublicCategories,
  type CatalogCategory,
} from '../../../lib/marketplace-public';

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

const parsePriceToCents = (value: string) => {
  const digits = value.replace(/[^0-9]/g, '');
  return digits ? Number(digits) : 0;
};

export default function Page() {
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const [formState, setFormState] = useState<ListingInput>(emptyListing);
  const [priceInput, setPriceInput] = useState('');
  const [stock, setStock] = useState('1');
  const [autoDelivery, setAutoDelivery] = useState(true);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [listing, setListing] = useState<Listing | null>(null);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [groups, setGroups] = useState<CatalogGroup[]>([]);
  const [sections, setSections] = useState<CatalogSection[]>([]);
  const [salesModels, setSalesModels] = useState<CatalogOption[]>([]);
  const [origins, setOrigins] = useState<CatalogOption[]>([]);
  const [recoveryOptions, setRecoveryOptions] = useState<CatalogOption[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    let active = true;
    const loadCatalog = async () => {
      const categoriesResponse = await fetchPublicCategories().catch(() => ({
        categories: [],
        source: 'api' as const,
      }));
      const [
        groupsData,
        sectionsData,
        salesModelsData,
        originsData,
        recoveryData,
      ] = await Promise.all([
        catalogPublicApi.listGroups().catch(() => []),
        catalogPublicApi.listSections().catch(() => []),
        catalogPublicApi.listSalesModels().catch(() => []),
        catalogPublicApi.listOrigins().catch(() => []),
        catalogPublicApi.listRecoveryOptions().catch(() => []),
      ]);
      if (!active) {
        return;
      }
      setCategories(categoriesResponse.categories);
      setGroups(groupsData);
      setSections(sectionsData);
      setSalesModels(salesModelsData);
      setOrigins(originsData);
      setRecoveryOptions(recoveryData);
    };
    loadCatalog().catch(() => {
      if (active) {
        setCategories([]);
        setGroups([]);
        setSections([]);
        setSalesModels([]);
        setOrigins([]);
        setRecoveryOptions([]);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setFormState((prev) => ({
      ...prev,
      deliveryType: autoDelivery ? 'AUTO' : 'MANUAL',
    }));
  }, [autoDelivery]);

  const previewTitle = formState.title || 'Seu titulo aparece aqui...';
  const previewPrice = formatCurrency(formState.priceCents, formState.currency ?? 'BRL');
  const titleCount = formState.title.length;
  const filteredGroups = useMemo(() => {
    if (!formState.categoryId) {
      return groups;
    }
    return groups.filter((group) => group.categoryId === formState.categoryId);
  }, [groups, formState.categoryId]);

  const filteredSections = useMemo(() => {
    if (!formState.categoryGroupId) {
      return sections;
    }
    return sections.filter((section) => section.groupId === formState.categoryGroupId);
  }, [sections, formState.categoryGroupId]);

  const canSubmit = useMemo(() => {
    return (
      formState.title.trim().length > 0 &&
      formState.categoryId.trim().length > 0 &&
      formState.priceCents > 0 &&
      termsAccepted
    );
  }, [formState, termsAccepted]);

  const handleCreateOrUpdate = async (submitAfter = false) => {
    if (!accessToken) {
      setError('Sessao expirada. Entre novamente.');
      return;
    }
    if (!formState.categoryId.trim()) {
      setError('Selecione uma categoria.');
      return;
    }
    if (!formState.title.trim()) {
      setError('Informe um titulo para o anuncio.');
      return;
    }
    if (formState.priceCents <= 0) {
      setError('Informe um valor valido.');
      return;
    }
    if (submitAfter && !termsAccepted) {
      setError('Aceite os termos antes de publicar.');
      return;
    }
    setError(null);
    setNotice(null);
    setBusyAction(submitAfter ? 'publish' : 'draft');

    try {
      const payload: ListingInput = {
        ...formState,
        description: formState.description?.trim() || undefined,
      };

      const created =
        listing && listing.id
          ? await marketplaceApi.updateListing(accessToken, listing.id, payload)
          : await marketplaceApi.createListing(accessToken, payload);
      setListing(created);

      if (mediaFiles.length > 0) {
        await marketplaceApi.uploadMedia(accessToken, created.id, mediaFiles[0], 0);
      }

      if (submitAfter) {
        await marketplaceApi.submitListing(accessToken, created.id);
        setNotice('Anuncio enviado para aprovacao.');
        router.push('/conta/anuncios');
        return;
      }

      setNotice('Rascunho salvo com sucesso.');
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Nao foi possivel salvar o anuncio.';
      setError(message);
    } finally {
      setBusyAction(null);
    }
  };

  if (!user) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-meow-50 px-6 py-16">
        <div className="w-full max-w-xl rounded-[32px] border border-meow-100 bg-white p-8 text-center shadow-card">
          <h1 className="text-2xl font-black text-meow-charcoal">Criar anuncio</h1>
          <p className="mt-2 text-sm text-meow-muted">
            Entre com sua conta para anunciar.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-meow-300 px-6 py-2 text-sm font-bold text-white shadow-cute"
          >
            Fazer login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-meow-50 text-slate-600 antialiased">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-8 lg:flex-row">
        <main className="flex-1 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-800">Anuncio</h1>
              <p className="text-sm font-bold text-meow-300">Criar novo anuncio</p>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          {notice ? (
            <div className="rounded-2xl border border-meow-100 bg-meow-50 px-4 py-3 text-sm text-meow-muted">
              {notice}
            </div>
          ) : null}

          <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-card">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-800">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-meow-100 text-xs text-meow-500">
                1
              </span>
              O que vamos vender?
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">
                  Categoria
                </label>
                <div className="relative">
                  <select
                    className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 focus:border-meow-300 focus:outline-none focus:ring-4 focus:ring-meow-100"
                    value={formState.categoryId}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        categoryId: event.target.value,
                        categoryGroupId: undefined,
                        categorySectionId: undefined,
                      }))
                    }
                  >
                    <option value="">Selecione...</option>
                    {categories.map((category) => (
                      <option key={category.slug} value={category.id ?? category.slug}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                  <i className="fas fa-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">
                  Jogo / Subcategoria
                </label>
                <div className="relative">
                  <select
                    className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 focus:border-meow-300 focus:outline-none focus:ring-4 focus:ring-meow-100"
                    value={formState.categoryGroupId ?? ''}
                    onChange={(event) =>
                      setFormState((prev) => ({
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
                  <i className="fas fa-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">Secao</label>
                <div className="relative">
                  <select
                    className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 focus:border-meow-300 focus:outline-none focus:ring-4 focus:ring-meow-100"
                    value={formState.categorySectionId ?? ''}
                    onChange={(event) =>
                      setFormState((prev) => ({
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
                  <i className="fas fa-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-card">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-800">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-meow-100 text-xs text-meow-500">
                2
              </span>
              Detalhes do produto
            </h2>

            <div className="mb-6">
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                Titulo do anuncio <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={80}
                  placeholder="Ex: Conta LoL Diamante, 250 Tibia Coins..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 focus:border-meow-300 focus:outline-none focus:ring-4 focus:ring-meow-100"
                  value={formState.title}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  {titleCount}/80
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  'Conta LoL Diamante (Full Champs)',
                  'Acesso Spotify Premium Vitalicio',
                  '13.500 V-Bucks Fortnite',
                ].map((text) => (
                  <button
                    key={text}
                    type="button"
                    className="rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500 transition hover:bg-meow-50 hover:text-meow-500"
                    onClick={() => setFormState((prev) => ({ ...prev, title: text }))}
                  >
                    Ex: {text.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-xs font-bold uppercase text-slate-500">
                Modelo de venda
              </label>
              {salesModels.length === 0 ? (
                <div className="state-card info">
                  Nenhum tipo cadastrado. Faca o cadastro no painel admin.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-3">
                  {salesModels.map((option, index) => {
                    const colors = [
                      'text-blue-500 bg-blue-100',
                      'text-purple-500 bg-purple-100',
                      'text-orange-500 bg-orange-100',
                      'text-emerald-500 bg-emerald-100',
                    ];
                    const icon = option.slug?.includes('serv')
                      ? 'fa-tools'
                      : option.slug?.includes('din')
                        ? 'fa-layer-group'
                        : 'fa-box';
                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 text-center transition ${
                          formState.salesModelId === option.id
                            ? 'border-meow-300 bg-meow-50 shadow-cute'
                            : 'border-slate-100 hover:border-meow-200'
                        }`}
                        onClick={() =>
                          setFormState((prev) => ({ ...prev, salesModelId: option.id }))
                        }
                      >
                        <div
                          className={`grid h-10 w-10 place-items-center rounded-full ${
                            colors[index % colors.length]
                          }`}
                        >
                          <i className={`fas ${icon}`} aria-hidden />
                        </div>
                        <span className="font-bold text-slate-700">{option.name}</span>
                        <span className="text-[10px] text-slate-400">
                          {option.description ?? 'Tipo de venda configurado pelo admin.'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="mb-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">Valor (BRL)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    R$
                  </span>
                  <input
                    type="text"
                    placeholder="0,00"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm font-bold text-slate-800 focus:border-meow-300 focus:outline-none focus:ring-4 focus:ring-meow-100"
                    value={priceInput}
                    onChange={(event) => {
                      const value = event.target.value;
                      setPriceInput(value);
                      setFormState((prev) => ({
                        ...prev,
                        priceCents: parsePriceToCents(value),
                      }));
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">Estoque</label>
                <input
                  type="number"
                  value={stock}
                  onChange={(event) => setStock(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 focus:border-meow-300 focus:outline-none focus:ring-4 focus:ring-meow-100"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">Tipo</label>
                <div className="relative">
                  <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 focus:border-meow-300 focus:outline-none">
                    <option>Conta</option>
                    <option>Gold / Moeda</option>
                    <option>Item / Skin</option>
                  </select>
                  <i className="fas fa-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">Procedencia</label>
                <div className="relative">
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 focus:border-meow-300 focus:outline-none"
                    value={formState.originId ?? ''}
                    onChange={(event) =>
                      setFormState((prev) => ({
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
                  <i className="fas fa-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">
                  Dados de recuperacao
                </label>
                <div className="relative">
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 focus:border-meow-300 focus:outline-none"
                    value={formState.recoveryOptionId ?? ''}
                    onChange={(event) =>
                      setFormState((prev) => ({
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
                  <i className="fas fa-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-emerald-100 bg-gradient-to-r from-emerald-50 to-green-50 p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500 text-white shadow-cute">
                  <i className="fas fa-bolt" aria-hidden />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800">Entrega automatica</h2>
                  <p className="text-xs font-bold text-slate-500">
                    O sistema entrega o produto assim que o pagamento for aprovado.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={`relative h-6 w-12 rounded-full ${
                  autoDelivery ? 'bg-meow-300' : 'bg-slate-300'
                }`}
                onClick={() => setAutoDelivery((prev) => !prev)}
                aria-pressed={autoDelivery}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                    autoDelivery ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {autoDelivery ? (
              <div className="mt-4 border-t border-emerald-200 pt-4">
                <label className="block text-xs font-bold uppercase text-emerald-700">
                  Dados para entrega (oculto ate a venda)
                </label>
                <textarea
                  className="mt-2 h-24 w-full resize-none rounded-xl border border-emerald-200 bg-white p-4 text-sm text-slate-600 focus:border-emerald-400 focus:outline-none"
                  placeholder="Ex: Login: usuario123 | Senha: senha123"
                />
                <p className="mt-2 text-[10px] font-semibold text-emerald-600">
                  Esses dados sao criptografados e enviados apenas apos o pagamento.
                </p>
              </div>
            ) : null}
          </section>

          <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-card">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-800">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-meow-100 text-xs text-meow-500">
                3
              </span>
              Descricao e imagens
            </h2>
            <div className="mb-6">
              <label className="mb-2 block text-xs font-bold uppercase text-slate-500">
                Descricao detalhada
              </label>
              <textarea
                className="h-40 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-meow-300 focus:outline-none focus:ring-4 focus:ring-meow-100"
                placeholder="Descreva seu produto com detalhes."
                value={formState.description ?? ''}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, description: event.target.value }))
                }
              />
              <div className="mt-2 flex gap-3 rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">
                <i className="fas fa-exclamation-triangle mt-0.5 text-red-500" aria-hidden />
                <p>
                  E proibido informar contatos pessoais na descricao ou chat. O sistema
                  detecta automaticamente e seu anuncio sera reprovado.
                </p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-slate-500">
                Imagens do produto (max 5MB)
              </label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center transition hover:border-meow-300 hover:bg-slate-50">
                <div className="mb-3 grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-slate-400">
                  <i className="fas fa-cloud-upload-alt text-2xl" aria-hidden />
                </div>
                <h4 className="text-sm font-bold text-slate-700">
                  Arraste e solte ou clique para enviar
                </h4>
                <p className="mt-1 text-xs text-slate-400">
                  JPG, PNG ou JPEG. Nao mostre nicks ou dados sensiveis.
                </p>
                <input
                  type="file"
                  className="hidden"
                  onChange={(event) =>
                    setMediaFiles(event.target.files ? Array.from(event.target.files) : [])
                  }
                />
              </label>
              {mediaFiles.length > 0 ? (
                <p className="mt-2 text-xs font-semibold text-meow-muted">
                  {mediaFiles.length} arquivo(s) selecionado(s).
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-card">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-700">Notificacoes</h4>
                <label className="flex items-center gap-3 text-sm font-bold text-slate-600">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300" defaultChecked />
                  <span>
                    <i className="fab fa-discord mr-1 text-indigo-500" aria-hidden />
                    Notificar via Discord
                  </span>
                </label>
                <label className="flex items-center gap-3 text-sm font-bold text-slate-600">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                  <span>
                    <i className="fas fa-bell mr-1 text-yellow-500" aria-hidden />
                    Notificar no navegador
                  </span>
                </label>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-500">
                <h4 className="mb-2 text-sm font-bold text-slate-700">
                  <i className="fas fa-shield-alt text-meow-300" aria-hidden /> Seguranca garantida
                </h4>
                <p className="mb-2">
                  A Meoww atua como intermediadora. O valor pago pelo comprador fica retido
                  conosco ate voce entregar o produto.
                </p>
                <p>Isso garante protecao total para ambas as partes.</p>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-6">
              <label className="flex items-start gap-3 text-xs text-slate-500">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                />
                <span>
                  Declaro que li e aceito os{' '}
                  <Link href="/institucional/termos" className="font-bold text-meow-400 underline">
                    Termos de uso
                  </Link>{' '}
                  e{' '}
                  <Link
                    href="/institucional/termos"
                    className="font-bold text-meow-400 underline"
                  >
                    Contrato do vendedor
                  </Link>
                  . Entendo que qualquer alteracao no anuncio passara por nova analise.
                </span>
              </label>
            </div>
          </section>

          <div className="flex flex-col gap-4 pt-4 md:flex-row">
            <button
              type="button"
              className="flex-1 rounded-2xl bg-meow-300 py-4 text-sm font-black text-white shadow-cute transition hover:-translate-y-1 hover:bg-meow-500"
              onClick={() => handleCreateOrUpdate(true)}
              disabled={!canSubmit || busyAction === 'publish'}
            >
              {busyAction === 'publish' ? 'Publicando...' : 'Publicar anuncio agora'}
            </button>
            <button
              type="button"
              className="flex-1 rounded-2xl border border-slate-200 bg-white py-4 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
              onClick={() => handleCreateOrUpdate(false)}
              disabled={busyAction === 'draft'}
            >
              {busyAction === 'draft' ? 'Salvando...' : 'Salvar rascunho'}
            </button>
          </div>
        </main>

        <aside className="hidden w-full max-w-[320px] space-y-6 lg:block">
          <div className="sticky top-24 rounded-[28px] border border-slate-100 bg-white p-5 shadow-card">
            <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-800">
              Pre-visualizacao
            </h3>
            <div className="relative rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
              <div className="mb-3 flex h-32 items-center justify-center rounded-xl bg-slate-100 text-slate-300">
                <i className="fas fa-image text-3xl" aria-hidden />
              </div>
              <span className="rounded bg-meow-50 px-2 py-0.5 text-[10px] font-bold uppercase text-meow-500">
                Jogos
              </span>
              <h4 className="mt-2 text-sm font-bold text-slate-800">{previewTitle}</h4>
              <div className="mt-4 flex items-end justify-between">
                <span className="text-lg font-black text-slate-800">{previewPrice}</span>
                <div className="grid h-8 w-8 place-items-center rounded-full bg-meow-300 text-xs text-white shadow-cute">
                  <i className="fas fa-arrow-right" aria-hidden />
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-blue-50 text-blue-400">
                  <i className="fas fa-lightbulb" aria-hidden />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-700">Titulo chamativo</h4>
                  <p className="text-[10px] text-slate-400">
                    Use palavras-chave como Diamante e Entrega rapida.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-green-50 text-green-400">
                  <i className="fas fa-camera" aria-hidden />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-700">Boas imagens</h4>
                  <p className="text-[10px] text-slate-400">
                    Mostre inventario e niveis. Oculte nicks.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);
