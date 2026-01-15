'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  Info,
  Package,
  Sparkles,
  Wrench,
  Camera,
  UploadCloud,
  X,
  ShieldAlert,
  Wallet,
  Zap,
  Box,
  ChevronRight,
  AlertTriangle,
  ShieldCheck,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';

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
  { id: 1, title: 'Categoria', subtitle: 'Tipo do produto' },
  { id: 2, title: 'Detalhes', subtitle: 'Informações gerais' },
  { id: 3, title: 'Entrega', subtitle: 'Dados de envio' },
  { id: 4, title: 'Imagens', subtitle: 'Mídia do anúncio' },
  { id: 5, title: 'Revisão', subtitle: 'Confirmar e publicar' },
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

  const handleRemoveFile = (indexToRemove: number) => {
    setMediaFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
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
        <div className="w-full max-w-xl rounded-[32px] border border-meow-100 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-meow-red/10 text-meow-deep">
            <Wallet size={32} />
          </div>
          <h1 className="text-2xl font-black text-meow-charcoal">Vamos começar?</h1>
          <p className="mt-2 text-sm text-meow-muted">
            Faça login na sua conta para criar um anúncio e começar a vender agora mesmo.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-meow-deep px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-meow-deep/90"
          >
            Fazer login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 pt-8 antialiased">
      <div className="mx-auto max-w-[1200px] px-4 lg:px-6">
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-3xl font-black tracking-tight text-slate-800">Criar Anúncio</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Preencha os dados abaixo para colocar seu produto a venda.
          </p>
        </header>

        <div className="flex flex-col gap-8 lg:flex-row">
          <main className="flex-1">
            {/* Stepper */}
            <div className="mb-8 overflow-x-auto pb-4 lg:pb-0">
              <div className="flex min-w-max items-center gap-2">
                {steps.map((item, index) => {
                  const isActive = item.id === step;
                  const isCompleted = item.id < step;
                  const isAvailable = item.id <= maxStep;

                  return (
                    <div key={item.id} className="flex items-center">
                      <button
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => isAvailable && goToStep(item.id)}
                        className={`group flex items-center gap-3 rounded-full border px-4 py-2 transition ${isActive
                          ? 'border-meow-300 bg-white shadow-sm ring-2 ring-meow-red/10'
                          : isCompleted
                            ? 'border-slate-200 bg-slate-50 text-slate-600'
                            : 'cursor-not-allowed border-transparent bg-transparent opacity-50'
                          }`}
                      >
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition ${isActive
                            ? 'bg-meow-linear text-white'
                            : isCompleted
                              ? 'bg-green-500 text-white'
                              : 'bg-slate-200 text-slate-500 group-hover:bg-slate-300'
                            }`}
                        >
                          {isCompleted ? <Check size={12} strokeWidth={3} /> : item.id}
                        </span>
                        <span
                          className={`text-xs font-bold ${isActive ? 'text-meow-deep' : 'text-slate-600'}`}
                        >
                          {item.title}
                        </span>
                      </button>
                      {index < steps.length - 1 && (
                        <div className="mx-2 h-px w-6 bg-slate-200" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Alerts */}
            {error ? (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <ShieldAlert className="mt-0.5 shrink-0 text-red-500" size={18} />
                <p className="font-medium">{error}</p>
              </div>
            ) : null}
            {notice ? (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-meow-200 bg-meow-50 p-4 text-sm text-meow-deep">
                <CheckCircle2 className="mt-0.5 shrink-0 text-meow-500" size={18} />
                <p className="font-medium">{notice}</p>
              </div>
            ) : null}

            {/* STEP 1: Categoria */}
            {step === 1 && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm md:p-8">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-800">O que vamos vender?</h2>
                    <p className="text-sm text-slate-500">
                      Selecione a categoria que melhor se encaixa no seu produto.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {categories.map((category) => {
                      const isSelected =
                        formState.categoryId === category.id || formState.categoryId === category.slug;
                      return (
                        <button
                          key={category.slug}
                          type="button"
                          onClick={() =>
                            setFormState((prev) => ({
                              ...prev,
                              categoryId: category.id ?? category.slug,
                            }))
                          }
                          className={`relative flex flex-col items-center gap-4 rounded-3xl border-2 p-6 transition-all duration-200 ${isSelected
                            ? 'border-meow-500 bg-meow-50/50 shadow-md ring-4 ring-meow-red/10'
                            : 'border-slate-100 bg-white hover:border-meow-200 hover:shadow-sm'
                            }`}
                        >
                          <div className={`relative h-16 w-16 overflow-hidden rounded-2xl transition-transform duration-200 ${isSelected ? 'scale-110' : ''}`}>
                            <img
                              src={category.highlight || '/assets/meoow/highlight-01.webp'}
                              alt={category.label}
                              className="h-full w-full object-cover"
                            />
                            {isSelected && (
                              <div className="absolute inset-0 flex items-center justify-center bg-meow-deep/20 backdrop-blur-[1px]">
                                <Check className="text-white drop-shadow-md" strokeWidth={3} />
                              </div>
                            )}
                          </div>
                          <span
                            className={`text-center text-sm font-bold ${isSelected ? 'text-meow-deep' : 'text-slate-600'
                              }`}
                          >
                            {category.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">
                    <Button
                      size="lg"
                      onClick={handleNextFromCategory}
                      className="rounded-full bg-meow-deep px-8 font-bold text-white shadow-lg shadow-meow-red/20 transition hover:bg-meow-deep/90 hover:shadow-xl hover:shadow-meow-red/30"
                    >
                      Continuar <ChevronRight size={18} className="ml-2" />
                    </Button>
                  </div>
                </div>
              </section>
            )}

            {/* STEP 2: Detalhes */}
            {step === 2 && (
              <section className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Card 1: Informações Principais */}
                <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm md:p-8">
                  <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-meow-50 text-meow-deep">
                      <Zap size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Informações Principais</h2>
                      <p className="text-xs font-medium text-slate-500">
                        Defina o título e o valor do seu produto
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Título do Anúncio <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <Input
                          value={formState.title}
                          onChange={(e) =>
                            setFormState((prev) => ({ ...prev, title: e.target.value }))
                          }
                          maxLength={80}
                          placeholder="Ex: Conta nível 50 com skins raras + email verificado"
                          className="h-12 rounded-2xl border-slate-200 bg-slate-50 font-semibold text-slate-800 placeholder:font-normal focus:border-meow-300 focus:ring-4 focus:ring-meow-red/10"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                          {formState.title.length}/80
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Valor (BRL) <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                            R$
                          </div>
                          <Input
                            value={priceInput}
                            onChange={(e) => {
                              const value = e.target.value;
                              setPriceInput(value);
                              setFormState((prev) => ({
                                ...prev,
                                priceCents: parsePriceToCents(value),
                              }));
                            }}
                            placeholder="0,00"
                            className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-10 font-black text-slate-800 focus:border-meow-300 focus:ring-4 focus:ring-meow-red/10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2 opacity-60">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Estoque Disponível
                        </label>
                        <Input
                          value={inventoryCount + ' item(s)'}
                          readOnly
                          className="h-12 rounded-2xl border-slate-200 bg-slate-100 font-bold text-slate-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Detalhes Técnicos */}
                <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm md:p-8">
                  <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                      <Box size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Detalhes Técnicos</h2>
                      <p className="text-xs font-medium text-slate-500">Categorização e filtros</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Modelo de Venda
                        </label>
                        <span className="cursor-help text-[10px] font-bold text-meow-400 hover:underline">
                          O que é isso?
                        </span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {(salesModels.length > 0
                          ? salesModels
                          : [
                            { id: 'normal', name: 'Normal', slug: 'normal' },
                            { id: 'dinamico', name: 'Dinamico', slug: 'dinamico' },
                            { id: 'servico', name: 'Servico', slug: 'servico' },
                          ]
                        ).map((model) => {
                          const isSelected = formState.salesModelId === model.id;
                          const Icon = resolveSalesModelIcon(model);
                          return (
                            <button
                              key={model.id}
                              type="button"
                              onClick={() =>
                                setFormState((prev) => ({ ...prev, salesModelId: model.id }))
                              }
                              className={`rounded-2xl border px-4 py-3 text-left transition-all ${isSelected
                                ? 'border-meow-500 bg-meow-50 ring-2 ring-meow-red/10'
                                : 'border-slate-200 bg-white hover:border-meow-200'
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <Icon
                                  size={18}
                                  className={isSelected ? 'text-meow-deep' : 'text-slate-400'}
                                />
                                {isSelected && (
                                  <div className="h-2 w-2 rounded-full bg-meow-500" />
                                )}
                              </div>
                              <p
                                className={`mt-2 text-sm font-bold ${isSelected ? 'text-meow-charcoal' : 'text-slate-600'}`}
                              >
                                {model.name}
                              </p>
                              <p className={`mt-1 text-[11px] font-medium leading-tight ${isSelected ? 'text-meow-charcoal/70' : 'text-slate-400'}`}>
                                {resolveSalesModelDescription(model)}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Tipo
                        </label>
                        <Select
                          value={formState.categoryGroupId}
                          onChange={(e) =>
                            setFormState((prev) => ({ ...prev, categoryGroupId: e.target.value }))
                          }
                          className="h-11 rounded-xl border-slate-200 bg-slate-50 font-medium text-slate-700 focus:border-meow-300"
                        >
                          {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Procedência
                        </label>
                        <Select
                          value={formState.originId}
                          onChange={(e) =>
                            setFormState((prev) => ({ ...prev, originId: e.target.value }))
                          }
                          className="h-11 rounded-xl border-slate-200 bg-slate-50 font-medium text-slate-700 focus:border-meow-300"
                        >
                          {origins.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Recuperação
                        </label>
                        <Select
                          value={formState.recoveryOptionId}
                          onChange={(e) =>
                            setFormState((prev) => ({ ...prev, recoveryOptionId: e.target.value }))
                          }
                          className="h-11 rounded-xl border-slate-200 bg-slate-50 font-medium text-slate-700 focus:border-meow-300"
                        >
                          {recoveryOptions.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: Descrição */}
                <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm md:p-8">
                  <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
                      <Info size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Descrição</h2>
                      <p className="text-xs font-medium text-slate-500">
                        Detalhe o que você está vendendo
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Textarea
                      placeholder="Descreva seu produto..."
                      value={formState.description}
                      onChange={(e) =>
                        setFormState((prev) => ({ ...prev, description: e.target.value }))
                      }
                      className="min-h-[160px] resize-y rounded-2xl border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700 focus:border-meow-300 focus:ring-4 focus:ring-meow-red/10"
                    />
                    <div className="flex gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
                      <AlertTriangle className="mt-0.5 shrink-0 text-red-500" size={18} />
                      <div className="text-xs text-red-700">
                        <p className="font-bold">Atenção Vendedor:</p>
                        <p>
                          É estritamente proibido informar contatos pessoais (WhatsApp, Discord, etc)
                          na descrição ou chat. O sistema bloqueia automaticamente anúncios com
                          esses dados.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
                    <Button
                      variant="ghost"
                      onClick={() => goToStep(1)}
                      className="text-slate-500 hover:text-slate-800"
                    >
                      Voltar
                    </Button>
                    <Button
                      onClick={handleNextFromDetails}
                      disabled={busyAction === 'save'}
                      className="rounded-full bg-meow-deep px-8 font-bold text-white shadow-lg shadow-meow-red/20 transition hover:bg-meow-deep/90"
                    >
                      {busyAction === 'save' ? 'Salvando...' : 'Salvar e Continuar'}
                    </Button>
                  </div>
                </div>
              </section>
            )}

            {/* STEP 3: Entrega */}
            {step === 3 && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm md:p-8">
                  <div className="mb-8 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Forma de Entrega</h2>
                      <p className="text-sm text-slate-500">
                        Como você vai entregar o produto ao comprador?
                      </p>
                    </div>
                    <div className="flex items-center gap-3 rounded-full bg-slate-100 p-1 pr-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                        {autoDelivery ? (
                          <Sparkles size={14} className="text-meow-deep" />
                        ) : (
                          <Package size={14} className="text-slate-500" />
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-600">
                        {autoDelivery ? 'Automática' : 'Manual'}
                      </span>
                      <Toggle
                        checked={autoDelivery}
                        onPressedChange={(pressed) => setAutoDelivery(pressed)}
                        className="ml-2 data-[state=on]:bg-meow-green data-[state=on]:text-white"
                        size="sm"
                      />
                    </div>
                  </div>

                  {autoDelivery ? (
                    <div className="mb-8 overflow-hidden rounded-3xl border border-emerald-100 bg-emerald-50/50">
                      <div className="border-b border-emerald-100 bg-emerald-50 px-6 py-4">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                          <Zap size={16} className="text-emerald-500" />
                          {selectedSalesModel?.slug?.includes('dinam') ? 'Estoque Dinâmico (Múltiplos Itens)' : 'Entrega Automática Ativada'}
                        </h3>
                        <p className="mt-1 text-xs text-emerald-600">
                          {selectedSalesModel?.slug?.includes('dinam')
                            ? 'Adicione sua lista de contas/chaves abaixo. Cada linha será um produto vendido separadamente.'
                            : 'Cole abaixo os dados (login, senha, códigos). O sistema enviará um por venda.'
                          }
                        </p>
                      </div>
                      <div className="p-6">
                        <div className="mb-2 flex items-center justify-between text-xs font-bold text-emerald-700/70">
                          <span>Conteúdo do Estoque</span>
                          <span>{inventoryCount} item(s) identificado(s)</span>
                        </div>
                        <Textarea
                          value={inventoryPayload}
                          onChange={(e) => setInventoryPayload(e.target.value)}
                          placeholder={selectedSalesModel?.slug?.includes('dinam')
                            ? "Login:Senha | Skin Rara (Descrição)\nLogin2:Senha2 | 50 Skins (Descrição)\nKEY-XXXX-YYYY | Jogo Base"
                            : "Ex: usuario:senha\nusuario2:senha2\nKEY-XXXX-YYYY-ZZZZ"
                          }
                          className="min-h-[200px] resize-y rounded-2xl border-emerald-200/50 bg-white font-mono text-sm leading-relaxed text-slate-700 shadow-sm focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        />
                        {selectedSalesModel?.slug?.includes('dinam') && (
                          <div className="mt-3 rounded-xl bg-white p-3 text-[11px] text-slate-500 shadow-sm ring-1 ring-slate-200/50">
                            <p className="font-bold text-emerald-600 mb-1">Dica para Estoque Dinâmico:</p>
                            <p>Você pode adicionar descrições extras para cada conta separando com &quot;|&quot;. Exemplo: <strong>user:pass | Descrição que o comprador verá</strong></p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-8 rounded-3xl border border-slate-100 bg-slate-50 p-8 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                        <Package size={32} className="text-slate-400" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-700">Entrega Manual</h3>
                      <p className="mx-auto mt-2 max-w-sm text-xs text-slate-500">
                        Você precisará entrar no chat após a venda para entregar o produto
                        manualmente ao comprador.
                      </p>
                    </div>
                  )}

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Prazo de Entrega (Horas)
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={formState.deliverySlaHours}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            deliverySlaHours: Number(e.target.value),
                          }))
                        }
                        className="h-11 rounded-xl border-slate-200 bg-slate-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Política de Reembolso
                      </label>
                      <Input
                        value={formState.refundPolicy}
                        onChange={(e) =>
                          setFormState((prev) => ({ ...prev, refundPolicy: e.target.value }))
                        }
                        className="h-11 rounded-xl border-slate-200 bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
                    <Button
                      variant="ghost"
                      onClick={() => goToStep(2)}
                      className="text-slate-500 hover:text-slate-800"
                    >
                      Voltar
                    </Button>
                    <Button
                      onClick={handleNextFromDelivery}
                      disabled={busyAction === 'save'}
                      className="rounded-full bg-meow-deep px-8 font-bold text-white shadow-lg shadow-meow-red/20 transition hover:bg-meow-deep/90"
                    >
                      {busyAction === 'save' ? 'Salvando...' : 'Salvar e Continuar'}
                    </Button>
                  </div>
                </div>
              </section>
            )}

            {/* STEP 4: Imagens */}
            {step === 4 && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm md:p-8">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-800">Mídias do Anúncio</h2>
                    <p className="text-sm text-slate-500">
                      Adicione fotos claras do seu produto. Isso aumenta muito a conversão.
                    </p>
                  </div>

                  <div className="mb-8">
                    <label className="group relative flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-12 text-center transition hover:border-meow-400 hover:bg-meow-50/30">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-meow-400 shadow-sm transition group-hover:scale-110 group-hover:text-meow-500">
                        <UploadCloud size={32} />
                      </div>
                      <h4 className="text-lg font-bold text-slate-700">
                        Clique ou arraste imagens aqui
                      </h4>
                      <p className="mt-1 max-w-xs text-xs text-slate-400">
                        JPG ou PNG. Max 5MB. Evite mostrar dados sensíveis nas imagens.
                      </p>
                      <Input
                        type="file"
                        multiple
                        className="absolute inset-0 cursor-pointer opacity-0"
                        onChange={(e) =>
                          setMediaFiles(e.target.files ? Array.from(e.target.files) : [])
                        }
                      />
                    </label>
                  </div>

                  {mediaFiles.length > 0 && (
                    <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {mediaFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
                        >
                          <img
                            src={URL.createObjectURL(file)}
                            alt="preview"
                            className="h-full w-full object-cover"
                          />
                          <button
                            onClick={() => handleRemoveFile(idx)}
                            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:bg-red-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
                    <Button
                      variant="ghost"
                      onClick={() => goToStep(3)}
                      className="text-slate-500 hover:text-slate-800"
                    >
                      Voltar
                    </Button>
                    <div className="flex gap-3">
                      <Button
                        variant="secondary"
                        onClick={handleUploadMedia}
                        disabled={busyAction === 'media' || mediaFiles.length === 0}
                      >
                        {busyAction === 'media' ? 'Enviando...' : 'Fazer Upload'}
                      </Button>
                      <Button
                        onClick={handleNextFromMedia}
                        className="rounded-full bg-meow-deep px-8 font-bold text-white shadow-lg shadow-meow-red/20 transition hover:bg-meow-deep/90"
                      >
                        Continuar
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* STEP 5: Revisão */}
            {step === 5 && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex flex-col gap-6">
                  <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm md:p-8">
                    <div className="mb-6">
                      <h2 className="text-xl font-bold text-slate-800">Revisão Final</h2>
                      <p className="text-sm text-slate-500">
                        Confira se está tudo certo antes de publicar.
                      </p>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-slate-50">
                      <div className="grid gap-px bg-slate-100 sm:grid-cols-2">
                        <div className="bg-white p-4">
                          <p className="text-[10px] font-bold uppercase text-slate-400">Título</p>
                          <p className="font-semibold text-slate-700">{previewTitle}</p>
                        </div>
                        <div className="bg-white p-4">
                          <p className="text-[10px] font-bold uppercase text-slate-400">
                            Categoria
                          </p>
                          <p className="font-semibold text-slate-700">{previewCategory}</p>
                        </div>
                        <div className="bg-white p-4">
                          <p className="text-[10px] font-bold uppercase text-slate-400">Valor</p>
                          <p className="font-bold text-meow-deep">{previewPrice}</p>
                        </div>
                        <div className="bg-white p-4">
                          <p className="text-[10px] font-bold uppercase text-slate-400">Entrega</p>
                          <p className="font-semibold text-slate-700">
                            {autoDelivery ? 'Automática' : 'Manual'}
                          </p>
                        </div>
                        <div className="col-span-full bg-white p-4">
                          <p className="text-[10px] font-bold uppercase text-slate-400">Estoque</p>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">
                              {inventoryCount} item(s) cadastrado(s)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm md:p-8">
                    <div className="mb-6 flex items-start gap-4">
                      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-800">
                          Garantia de Segurança
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          A Meow atua como intermediadora segura. O valor pago pelo comprador fica
                          retido conosco até que você realize a entrega e o cliente confirme o
                          recebimento. Isso garante proteção para ambos.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 border-t border-slate-100 pt-6">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-1 h-5 w-5 rounded border-slate-300 accent-meow-500"
                        id="terms"
                      />
                      <label htmlFor="terms" className="text-sm text-slate-600">
                        Declaro que li e aceito os{' '}
                        <Link
                          href="/termos"
                          className="font-bold text-meow-500 hover:underline"
                        >
                          Termos de Uso
                        </Link>{' '}
                        e o{' '}
                        <Link
                          href="/contrato"
                          className="font-bold text-meow-500 hover:underline"
                        >
                          Contrato do Vendedor
                        </Link>
                        . Entendo que o anúncio passará por análise antes de ser listado.
                      </label>
                    </div>

                    <div className="mt-8 flex justify-between">
                      <Button variant="ghost" onClick={() => goToStep(4)}>
                        Voltar
                      </Button>
                      <Button
                        onClick={handlePublish}
                        disabled={busyAction === 'publish'}
                        className="rounded-full bg-gradient-to-r from-meow-500 to-meow-400 px-8 py-6 text-base font-bold text-white shadow-xl shadow-meow-red/20 transition hover:scale-105 hover:from-meow-400 hover:to-meow-300"
                      >
                        {busyAction === 'publish' ? (
                          'Publicando...'
                        ) : (
                          <span className="flex items-center gap-2">
                            Publicar Agora <Zap size={18} fill="currentColor" />
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </main>

          {/* ASIDE Preview */}
          <aside className="hidden w-80 shrink-0 lg:block">
            <div className="sticky top-28 space-y-6">
              <div className="relative overflow-hidden rounded-[24px] bg-white p-4 shadow-xl shadow-slate-200/50 ring-1 ring-slate-100">
                <div className="mb-4 text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                    Preview
                  </span>
                </div>
                <div className="relative mb-4 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-100">
                  <img
                    src={previewImage}
                    alt={previewTitle}
                    className="h-full w-full object-cover transition hover:scale-110"
                  />
                  <div className="absolute left-3 top-3 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-bold uppercase text-white backdrop-blur-md">
                    {previewCategory}
                  </div>
                </div>
                <div className="space-y-2 px-1">
                  <h3 className="line-clamp-2 text-sm font-bold leading-tight text-slate-800">
                    {previewTitle}
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        Valor
                      </span>
                      <span className="text-xl font-black text-meow-deep">{previewPrice}</span>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-meow-50 text-meow-deep">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-5">
                <h4 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                  <Info size={14} /> Dicas para vender mais
                </h4>
                <ul className="space-y-4">
                  <li className="flex gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <Check size={10} strokeWidth={4} />
                    </div>
                    <p className="text-xs text-slate-500">
                      <strong className="text-slate-700">Título Claro:</strong> Inclua nível,
                      rank e itens raros no título.
                    </p>
                  </li>
                  <li className="flex gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <Check size={10} strokeWidth={4} />
                    </div>
                    <p className="text-xs text-slate-500">
                      <strong className="text-slate-700">Preço Competitivo:</strong> Pesquise
                      outros anúncios similares.
                    </p>
                  </li>
                  <li className="flex gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <Check size={10} strokeWidth={4} />
                    </div>
                    <p className="text-xs text-slate-500">
                      <strong className="text-slate-700">Entrega Rápida:</strong> A entrega
                      automática vende 3x mais.
                    </p>
                  </li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
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
