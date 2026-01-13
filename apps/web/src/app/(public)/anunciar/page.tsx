'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Info, Package, Sparkles, Wrench } from 'lucide-react';

import { useAuth } from '../../../components/auth/auth-provider';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { Toggle } from '../../../components/ui/toggle';
import { ApiClientError } from '../../../lib/api-client';
import {
  marketplaceApi,
  type Listing,
  type ListingInput,
} from '../../../lib/marketplace-api';
import {
  catalogPublicApi,
  type CatalogGroup,
  type CatalogOption,
} from '../../../lib/catalog-public-api';
import {
  fetchPublicCategories,
  type CatalogCategory,
} from '../../../lib/marketplace-public';

const emptyListing: ListingInput = {
  categoryId: '',
  categoryGroupId: '',
  salesModelId: '',
  originId: '',
  recoveryOptionId: '',
  title: '',
  description: '',
  priceCents: 0,
  currency: 'BRL',
  deliveryType: 'AUTO',
  deliverySlaHours: 24,
  refundPolicy: 'Reembolso disponivel enquanto o pedido estiver em aberto.',
};

const steps = [
  { id: 1, title: 'Categoria', subtitle: 'O que vamos vender?' },
  { id: 2, title: 'Detalhes', subtitle: 'Título, descrição e preço' },
  { id: 3, title: 'Entrega', subtitle: 'Entrega automática e dados' },
  { id: 4, title: 'Imagens', subtitle: 'Upload do anúncio' },
  { id: 5, title: 'Revisão', subtitle: 'Confirme e publique' },
];

const parsePriceToCents = (value: string) => {
  const digits = value.replace(/[^0-9]/g, '');
  return digits ? Number(digits) : 0;
};

const parseInventoryItems = (payload: string) =>
  payload
    .split(/[\n,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);

export default function Page() {
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [formState, setFormState] = useState<ListingInput>(emptyListing);
  const [priceInput, setPriceInput] = useState('');
  const [autoDelivery, setAutoDelivery] = useState(true);
  const [inventoryPayload, setInventoryPayload] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [salesModels, setSalesModels] = useState<CatalogOption[]>([]);
  const [origins, setOrigins] = useState<CatalogOption[]>([]);
  const [recoveryOptions, setRecoveryOptions] = useState<CatalogOption[]>([]);
  const [groups, setGroups] = useState<CatalogGroup[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    let active = true;
    const loadCategories = async () => {
      const categoriesResponse = await fetchPublicCategories().catch(() => ({
        categories: [],
        source: 'api' as const,
      }));
      if (!active) {
        return;
      }
      setCategories(categoriesResponse.categories);
    };
    loadCategories().catch(() => {
      if (active) {
        setCategories([]);
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

  useEffect(() => {
    if (step !== 2) {
      return;
    }
    let active = true;
    const loadCatalogs = async () => {
      setCatalogError(null);
      const results = await Promise.allSettled([
        catalogPublicApi.listSalesModels(),
        catalogPublicApi.listOrigins(),
        catalogPublicApi.listRecoveryOptions(),
        catalogPublicApi.listGroups(formState.categoryId || undefined),
      ]);
      if (!active) {
        return;
      }
      const [salesRes, originsRes, recoveryRes, groupsRes] = results;
      setSalesModels(salesRes.status === 'fulfilled' ? salesRes.value : []);
      setOrigins(originsRes.status === 'fulfilled' ? originsRes.value : []);
      setRecoveryOptions(recoveryRes.status === 'fulfilled' ? recoveryRes.value : []);
      setGroups(groupsRes.status === 'fulfilled' ? groupsRes.value : []);
      if (results.some((result) => result.status === 'rejected')) {
        setCatalogError('Não foi possível carregar todos os catalogos.');
      }
    };
    loadCatalogs().catch(() => {
      if (active) {
        setCatalogError('Não foi possível carregar os catalogos.');
        setSalesModels([]);
        setOrigins([]);
        setRecoveryOptions([]);
        setGroups([]);
      }
    });
    return () => {
      active = false;
    };
  }, [step, formState.categoryId]);

  useEffect(() => {
    if (mediaFiles.length === 0) {
      setMediaPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(mediaFiles[0]);
    setMediaPreview(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [mediaFiles]);

  useEffect(() => {
    if (salesModels.length === 0 || formState.salesModelId) {
      return;
    }
    const defaultModel =
      salesModels.find((model) => model.slug === 'normal') ?? salesModels[0];
    if (defaultModel) {
      setFormState((prev) => ({ ...prev, salesModelId: defaultModel.id }));
    }
  }, [salesModels, formState.salesModelId]);

  useEffect(() => {
    if (groups.length === 0) {
      return;
    }
    const exists = groups.some((group) => group.id === formState.categoryGroupId);
    if (!formState.categoryGroupId || !exists) {
      setFormState((prev) => ({ ...prev, categoryGroupId: groups[0]?.id ?? '' }));
    }
  }, [groups, formState.categoryGroupId]);

  useEffect(() => {
    if (origins.length === 0 || formState.originId) {
      return;
    }
    setFormState((prev) => ({ ...prev, originId: origins[0]?.id ?? '' }));
  }, [origins, formState.originId]);

  useEffect(() => {
    if (recoveryOptions.length === 0 || formState.recoveryOptionId) {
      return;
    }
    setFormState((prev) => ({ ...prev, recoveryOptionId: recoveryOptions[0]?.id ?? '' }));
  }, [recoveryOptions, formState.recoveryOptionId]);

  const inventoryItems = useMemo(
    () => parseInventoryItems(inventoryPayload),
    [inventoryPayload],
  );

  const inventoryCount = inventoryItems.length;
  const previewTitle = formState.title || 'Seu título aparece aqui...';
  const previewPrice = formatCurrency(formState.priceCents, formState.currency ?? 'BRL');
  const previewCategory =
    categories.find(
      (category) =>
        category.id === formState.categoryId || category.slug === formState.categoryId,
    )?.label ?? 'Categoria';

  const previewImage =
    listing?.media?.[0]?.url ?? mediaPreview ?? '/assets/meoow/highlight-01.webp';
  const selectedSalesModel = salesModels.find((model) => model.id === formState.salesModelId);
  const selectedGroup = groups.find((group) => group.id === formState.categoryGroupId);
  const selectedOrigin = origins.find((origin) => origin.id === formState.originId);
  const selectedRecovery = recoveryOptions.find(
    (option) => option.id === formState.recoveryOptionId,
  );

  const resolveSalesModelDescription = (model?: CatalogOption | null) => {
    if (!model) {
      return '1 produto unico por anúncio';
    }
    if (model.description?.trim()) {
      return model.description;
    }
    const key = `${model.slug ?? ''} ${model.name ?? ''}`.toLowerCase();
    if (key.includes('dinam') || key.includes('dynamic')) {
      return 'Estoques automáticos e manuais';
    }
    if (key.includes('serv') || key.includes('service')) {
      return 'Servicos, Boost e outros';
    }
    return '1 produto unico por anúncio';
  };

  const resolveSalesModelIcon = (model?: CatalogOption | null) => {
    if (!model) {
      return Package;
    }
    const key = `${model.slug ?? ''} ${model.name ?? ''}`.toLowerCase();
    if (key.includes('dinam') || key.includes('dynamic')) {
      return Sparkles;
    }
    if (key.includes('serv') || key.includes('service')) {
      return Wrench;
    }
    return Package;
  };

  const goToStep = (nextStep: number) => {
    setStep(nextStep);
    setMaxStep((prev) => Math.max(prev, nextStep));
  };

  const ensureListing = async () => {
    if (!accessToken) {
      setError('Sessão expirada. Entre novamente.');
      return null;
    }
    const payload: ListingInput = {
      ...formState,
      description: formState.description?.trim() || undefined,
      refundPolicy: formState.refundPolicy?.trim() || emptyListing.refundPolicy,
      deliverySlaHours: Number(formState.deliverySlaHours) || 24,
      categoryGroupId: formState.categoryGroupId?.trim() || undefined,
      salesModelId: formState.salesModelId?.trim() || undefined,
      originId: formState.originId?.trim() || undefined,
      recoveryOptionId: formState.recoveryOptionId?.trim() || undefined,
    };

    try {
      const saved = listing?.id
        ? await marketplaceApi.updateListing(accessToken, listing.id, payload)
        : await marketplaceApi.createListing(accessToken, payload);
      setListing(saved);
      return saved;
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível salvar o anúncio.';
      setError(message);
      return null;
    }
  };

  const handleNextFromCategory = () => {
    if (!formState.categoryId.trim()) {
      setError('Selecione uma categoria para continuar.');
      return;
    }
    setError(null);
    goToStep(2);
  };

  const handleNextFromDetails = async () => {
    if (!formState.categoryId.trim()) {
      setError('Selecione uma categoria.');
      return;
    }
    if (!formState.title.trim()) {
      setError('Informe um título para o anúncio.');
      return;
    }
    if (formState.priceCents <= 0) {
      setError('Informe um valor valido.');
      return;
    }
    setError(null);
    setNotice(null);
    setBusyAction('save');
    const saved = await ensureListing();
    setBusyAction(null);
    if (saved) {
      setNotice('Detalhes salvos.');
      goToStep(3);
    }
  };

  const handleNextFromDelivery = async () => {
    setError(null);
    setNotice(null);
    setBusyAction('save');
    const saved = await ensureListing();
    setBusyAction(null);
    if (saved) {
      setNotice('Entrega atualizada.');
      goToStep(4);
    }
  };

  const handleUploadMedia = async () => {
    if (mediaFiles.length === 0) {
      setNotice('Selecione ao menos uma imagem.');
      return false;
    }
    setError(null);
    setNotice(null);
    setBusyAction('media');
    const saved = await ensureListing();
    if (!saved) {
      setBusyAction(null);
      return false;
    }

    try {
      const startPosition = saved.media?.length ?? 0;
      for (const [index, file] of mediaFiles.entries()) {
        // Upload sequentially to preserve ordering
        // eslint-disable-next-line no-await-in-loop
        await marketplaceApi.uploadMedia(accessToken, saved.id, file, startPosition + index);
      }
      const refreshed = await marketplaceApi.getSellerListing(accessToken, saved.id);
      setListing(refreshed);
      setMediaFiles([]);
      setNotice('Mídias enviadas com sucesso.');
      return true;
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível enviar as mídias.';
      setError(message);
      return false;
    } finally {
      setBusyAction(null);
    }
  };

  const handleNextFromMedia = async () => {
    if (mediaFiles.length > 0) {
      const uploaded = await handleUploadMedia();
      if (!uploaded) {
        return;
      }
    }
    goToStep(5);
  };

  const handlePublish = async () => {
    if (!termsAccepted) {
      setError('Aceite os termos antes de publicar.');
      return;
    }
    if (autoDelivery && inventoryCount === 0) {
      setError('Adicione os dados de entrega ou desative a entrega automática.');
      return;
    }

    setError(null);
    setNotice(null);
    setBusyAction('publish');

    const saved = await ensureListing();
    if (!saved) {
      setBusyAction(null);
      return;
    }

    try {
      if (mediaFiles.length > 0) {
        const startPosition = saved.media?.length ?? 0;
        for (const [index, file] of mediaFiles.entries()) {
          // eslint-disable-next-line no-await-in-loop
          await marketplaceApi.uploadMedia(accessToken, saved.id, file, startPosition + index);
        }
      }

      if (inventoryPayload.trim()) {
        await marketplaceApi.importInventoryItems(accessToken, saved.id, inventoryPayload.trim());
      }

      await marketplaceApi.submitListing(accessToken, saved.id);
      setNotice('Anúncio enviado para aprovação.');
      router.push('/conta/anuncios');
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível publicar o anúncio.';
      setError(message);
    } finally {
      setBusyAction(null);
    }
  };

  if (!user) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-meow-50 px-6 py-16">
        <div className="w-full max-w-xl rounded-[32px] border border-meow-100 bg-white p-8 text-center shadow-card">
          <h1 className="text-2xl font-black text-meow-charcoal">Criar anúncio</h1>
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
        <main className="flex-1 space-y-6">
          <div>
            <h1 className="text-3xl font-black text-slate-800">Anúncio</h1>
            <p className="text-sm font-bold text-meow-300">Criar novo anúncio</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {steps.map((item) => {
              const isActive = item.id === step;
              const isAvailable = item.id <= maxStep;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => isAvailable && goToStep(item.id)}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition ${
                    isActive
                      ? 'border-meow-300 bg-meow-100 text-meow-deep'
                      : 'border-slate-200 bg-white text-slate-400 hover:border-meow-200 hover:text-meow-500'
                  } ${!isAvailable ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[11px] text-slate-600 shadow-sm">
                    {item.id}
                  </span>
                  {item.title}
                </button>
              );
            })}
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

          {step === 1 ? (
            <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-card">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-800">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-meow-100 text-xs text-meow-500">
                  1
                </span>
                O que vamos vender?
              </h2>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">Categoria</label>
                <div className="relative">
                  <Select
                    className="rounded-xl border-slate-200 bg-slate-50 text-sm font-bold text-slate-700"
                    value={formState.categoryId}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        categoryId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Selecione...</option>
                    {categories.map((category) => (
                      <option key={category.slug} value={category.id ?? category.slug}>
                        {category.label}
                      </option>
                    ))}
                  </Select>
                  <i className="fas fa-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <Button type="button" variant="secondary" onClick={() => router.push('/')}>
                  Cancelar
                </Button>
                <Button type="button" onClick={handleNextFromCategory}>
                  Continuar
                </Button>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-card">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-800">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-meow-100 text-xs text-meow-500">
                  2
                </span>
                Detalhes do produto
              </h2>

              <div className="mb-6">
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                  Título do anúncio <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    maxLength={80}
                    placeholder="Ex: Conta LoL Diamante, 250 Tibia Coins..."
                    className="rounded-xl border-slate-200 bg-slate-50 text-sm font-bold text-slate-800"
                    value={formState.title}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, title: event.target.value }))
                    }
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    {formState.title.length}/80
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-500">
                    Modelo de venda
                  </span>
                  <button
                    type="button"
                    className="text-slate-400"
                    title="Define como o anúncio funciona (produto unico, estoque dinamico ou servicos)."
                  >
                    <Info size={16} aria-hidden />
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {(salesModels.length > 0 ? salesModels : [
                    { id: 'normal', name: 'Normal', slug: 'normal' },
                    { id: 'dinamico', name: 'Dinamico', slug: 'dinamico' },
                    { id: 'servico', name: 'Servico', slug: 'servico' },
                  ]).map((model) => {
                    const isSelected = formState.salesModelId === model.id;
                    const Icon = resolveSalesModelIcon(model);
                    const description = resolveSalesModelDescription(model);
                    return (
                      <button
                        key={model.id}
                        type="button"
                        className={`rounded-2xl border p-4 text-left transition ${
                          isSelected
                            ? 'border-meow-300 bg-meow-50 shadow-cute'
                            : 'border-slate-200 bg-white hover:border-meow-200 hover:shadow-sm'
                        }`}
                        onClick={() =>
                          setFormState((prev) => ({ ...prev, salesModelId: model.id }))
                        }
                      >
                        <div className="flex items-start justify-between">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                            <Icon size={18} aria-hidden />
                          </span>
                          {isSelected ? (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-meow-300 text-white">
                              <Check size={14} aria-hidden />
                            </span>
                          ) : null}
                        </div>
                        <h3 className="mt-3 text-sm font-bold text-slate-800">{model.name}</h3>
                        <p className="mt-1 text-xs text-slate-500">{description}</p>
                      </button>
                    );
                  })}
                </div>
                {catalogError ? (
                  <p className="mt-2 text-xs text-slate-400">{catalogError}</p>
                ) : null}
              </div>

              <div className="mb-6">
                <label className="mb-2 block text-xs font-bold uppercase text-slate-500">
                  Descrição detalhada
                </label>
                <Textarea
                  className="h-40 rounded-xl border-slate-200 bg-slate-50 text-sm text-slate-700"
                  placeholder="Descreva seu produto com detalhes."
                  value={formState.description ?? ''}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
                <div className="mt-2 flex gap-3 rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">
                  <i className="fas fa-exclamation-triangle mt-0.5 text-red-500" aria-hidden />
                  <p>
                    E proibido informar contatos pessoais na descrição ou chat. O sistema detecta
                    automaticamente e seu anúncio será reprovado.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-500">Valor (BRL)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      R$
                    </span>
                    <Input
                      type="text"
                      placeholder="0,00"
                      className="rounded-xl border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-bold text-slate-800"
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
                  <Input
                    readOnly
                    value={inventoryCount}
                    className="rounded-xl border-slate-200 bg-slate-50 text-sm font-bold text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400">
                    Estoque e calculado a partir dos itens adicionados na entrega.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <label className="grid gap-2 text-xs font-bold uppercase text-slate-500">
                  Tipo
                  <Select
                    className="rounded-xl border-slate-200 bg-slate-50 text-sm font-bold text-slate-700"
                    value={formState.categoryGroupId ?? ''}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        categoryGroupId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Sem opções disponiveis</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="grid gap-2 text-xs font-bold uppercase text-slate-500">
                  Procedência
                  <Select
                    className="rounded-xl border-slate-200 bg-slate-50 text-sm font-bold text-slate-700"
                    value={formState.originId ?? ''}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        originId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Sem opções disponiveis</option>
                    {origins.map((origin) => (
                      <option key={origin.id} value={origin.id}>
                        {origin.name}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="grid gap-2 text-xs font-bold uppercase text-slate-500">
                  Dados de recuperação
                  <Select
                    className="rounded-xl border-slate-200 bg-slate-50 text-sm font-bold text-slate-700"
                    value={formState.recoveryOptionId ?? ''}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        recoveryOptionId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Sem opções disponiveis</option>
                    {recoveryOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <Button type="button" variant="secondary" onClick={() => goToStep(1)}>
                  Voltar
                </Button>
                <Button type="button" onClick={handleNextFromDetails} disabled={busyAction === 'save'}>
                  {busyAction === 'save' ? 'Salvando...' : 'Salvar e continuar'}
                </Button>
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="rounded-[28px] border border-emerald-100 bg-gradient-to-r from-emerald-50 to-green-50 p-6 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500 text-white shadow-cute">
                    <i className="fas fa-bolt" aria-hidden />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800">Entrega automática</h2>
                    <p className="text-xs font-bold text-slate-500">
                      O sistema entrega o produto assim que o pagamento for aprovado.
                    </p>
                  </div>
                </div>
                <Toggle checked={autoDelivery} onCheckedChange={setAutoDelivery} className="h-6 w-12" />
              </div>

              {autoDelivery ? (
                <div className="mt-4 border-t border-emerald-200 pt-4">
                  <label className="block text-xs font-bold uppercase text-emerald-700">
                    Dados para entrega (oculto até a venda)
                  </label>
                  <Textarea
                    className="mt-2 h-28 resize-none rounded-xl border-emerald-200 bg-white text-sm text-slate-600 focus:border-emerald-400 focus:ring-0"
                    placeholder="Ex: Login: usuario123 | Senha: senha123"
                    value={inventoryPayload}
                    onChange={(event) => setInventoryPayload(event.target.value)}
                  />
                  <p className="mt-2 text-[10px] font-semibold text-emerald-600">
                    Itens informados: {inventoryCount}.
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3 text-xs text-emerald-700">
                  Entrega manual selecionada. Você pode ativar a entrega automática a qualquer momento.
                </div>
              )}

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-xs font-bold uppercase text-slate-500">
                  SLA de entrega (horas)
                  <Input
                    type="number"
                    min={1}
                    className="rounded-xl border-emerald-200 bg-white text-sm font-bold text-slate-700"
                    value={formState.deliverySlaHours}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        deliverySlaHours: Number(event.target.value),
                      }))
                    }
                  />
                </label>
                <label className="grid gap-2 text-xs font-bold uppercase text-slate-500">
                  Politica de reembolso
                  <Textarea
                    rows={3}
                    className="rounded-xl border-emerald-200 bg-white text-sm text-slate-700"
                    value={formState.refundPolicy}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, refundPolicy: event.target.value }))
                    }
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <Button type="button" variant="secondary" onClick={() => goToStep(2)}>
                  Voltar
                </Button>
                <Button type="button" onClick={handleNextFromDelivery} disabled={busyAction === 'save'}>
                  {busyAction === 'save' ? 'Salvando...' : 'Salvar e continuar'}
                </Button>
              </div>
            </section>
          ) : null}

          {step === 4 ? (
            <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-card">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-800">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-meow-100 text-xs text-meow-500">
                  4
                </span>
                Imagens do anúncio
              </h2>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center transition hover:border-meow-300 hover:bg-slate-50">
                <div className="mb-3 grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-slate-400">
                  <i className="fas fa-cloud-upload-alt text-2xl" aria-hidden />
                </div>
                <h4 className="text-sm font-bold text-slate-700">
                  Arraste e solte ou clique para enviar
                </h4>
                <p className="mt-1 text-xs text-slate-400">
                  JPG, PNG ou JPEG. Não mostre nicks ou dados sensiveis.
                </p>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(event) =>
                    setMediaFiles(event.target.files ? Array.from(event.target.files) : [])
                  }
                />
              </label>
              {mediaFiles.length > 0 ? (
                <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
                  {mediaFiles.length} arquivo(s) selecionado(s):{' '}
                  {mediaFiles.map((file) => file.name).join(', ')}
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <Button type="button" variant="secondary" onClick={() => goToStep(3)}>
                  Voltar
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleUploadMedia}
                    disabled={busyAction === 'media' || mediaFiles.length === 0}
                  >
                    {busyAction === 'media' ? 'Enviando...' : 'Enviar imagens'}
                  </Button>
                  <Button type="button" onClick={handleNextFromMedia}>
                    Continuar
                  </Button>
                </div>
              </div>
            </section>
          ) : null}

          {step === 5 ? (
            <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-card">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-800">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-meow-100 text-xs text-meow-500">
                  5
                </span>
                Revisão final
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                  <p className="text-xs font-bold uppercase text-slate-400">Resumo</p>
                  <p className="mt-2 font-semibold text-slate-700">Categoria: {previewCategory}</p>
                  <p className="mt-1 font-semibold text-slate-700">Título: {previewTitle}</p>
                  <p className="mt-1 font-semibold text-slate-700">Preço: {previewPrice}</p>
                  <p className="mt-1 font-semibold text-slate-700">
                    Entrega: {autoDelivery ? 'Automatica' : 'Manual'}
                  </p>
                  <p className="mt-1 font-semibold text-slate-700">
                    Modelo de venda: {selectedSalesModel?.name ?? 'Não informado'}
                  </p>
                  <p className="mt-1 font-semibold text-slate-700">
                    Tipo: {selectedGroup?.name ?? 'Não informado'}
                  </p>
                  <p className="mt-1 font-semibold text-slate-700">
                    Procedência: {selectedOrigin?.name ?? 'Não informado'}
                  </p>
                  <p className="mt-1 font-semibold text-slate-700">
                    Recuperação: {selectedRecovery?.name ?? 'Não informado'}
                  </p>
                  <p className="mt-1 font-semibold text-slate-700">
                    Estoque: {inventoryCount} item(s)
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-500">
                  <h4 className="mb-2 text-sm font-bold text-slate-700">
                    <i className="fas fa-shield-alt text-meow-300" aria-hidden /> Seguranca garantida
                  </h4>
                  <p className="mb-2">
                    A Meoww atua como intermediadora. O valor pago pelo comprador fica retido conosco até você entregar o produto.
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
                    <Link href="/institucional/termos" className="font-bold text-meow-400 underline">
                      Contrato do vendedor
                    </Link>
                    . Entendo que qualquer alteracao no anúncio passará por nova análise.
                  </span>
                </label>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <Button type="button" variant="secondary" onClick={() => goToStep(4)}>
                  Voltar
                </Button>
                <Button type="button" onClick={handlePublish} disabled={busyAction === 'publish'}>
                  {busyAction === 'publish' ? 'Publicando...' : 'Publicar anúncio agora'}
                </Button>
              </div>
            </section>
          ) : null}
        </main>

        <aside className="hidden w-full max-w-[320px] space-y-6 lg:block">
          <div className="sticky top-24 rounded-[28px] border border-slate-100 bg-white p-5 shadow-card">
            <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-800">
              Pre-visualizacao
            </h3>
            <div className="relative rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
              <div className="mb-3 flex h-32 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-300">
                <img src={previewImage} alt={previewTitle} className="h-full w-full object-cover" />
              </div>
              <span className="rounded bg-meow-50 px-2 py-0.5 text-[10px] font-bold uppercase text-meow-500">
                {previewCategory}
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
                  <h4 className="text-xs font-bold text-slate-700">Título chamativo</h4>
                  <p className="text-[10px] text-slate-400">
                    Use palavras-chave como Diamante e Entrega rápida.
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
                    Mostre inventário e niveis. Oculte nicks.
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
