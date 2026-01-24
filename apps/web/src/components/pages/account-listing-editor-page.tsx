'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Crown,
  Gamepad2,
  LayoutGrid,
  Package,
  Plus,
  Sparkles,
  Trophy,
  Wrench,
  X,
  AlertCircle,
  Zap,
  Image as ImageIcon,
  ArrowLeft,
} from 'lucide-react';

import { useAuth } from '../auth/auth-provider';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Toggle } from '../ui/toggle';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ApiClientError } from '../../lib/api-client';
import {
  marketplaceApi,
  type Listing,
  type ListingUpdateInput,
  type DeliveryType,
  type InventoryItem,
  type InventoryStatus,
} from '../../lib/marketplace-api';
import {
  catalogPublicApi,
  type CatalogGroup,
  type CatalogSection,
  type CatalogOption,
} from '../../lib/catalog-public-api';
import {
  fetchPublicCategories,
  type CatalogCategory,
} from '../../lib/marketplace-public';

// Custom Components
import { FormTitleSection } from '../forms/form-title-section';
import { ModelSelector, type ModelOption } from '../forms/model-selector';
import { ImageUploader } from '../forms/image-uploader';
import { AdTierSelector, type Tier } from '../forms/ad-tier-selector';
import { ListingDescriptionField } from '../forms/listing-description-field';
import { ActionBar } from '../forms/action-bar';
import { ListingCard } from '../listings/listing-card';
import { AccountShell } from '../account/account-shell';
import { useDashboardLayout } from '../layout/dashboard-layout';

// --- Types & Constants ---

type ListingState = {
  status: 'loading' | 'ready';
  listing: Listing | null;
  error?: string;
};

const statusLabel: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Em análise',
  PUBLISHED: 'Publicado',
  SUSPENDED: 'Suspenso',
};

const statusTone: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'neutral'> = {
  DRAFT: 'neutral',
  PENDING: 'warning',
  PUBLISHED: 'success',
  SUSPENDED: 'danger',
};

const MAX_PRICE_CENTS = 300000;

const parsePriceToCentsRaw = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }
  const cleaned = trimmed.replace(/[^\d,.-]/g, '').replace(/-/g, '');
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  const lastSeparator = Math.max(lastComma, lastDot);
  if (lastSeparator === -1) {
    const digits = cleaned.replace(/\D/g, '');
    return digits ? Number(digits) * 100 : 0;
  }
  const integerPart = cleaned.slice(0, lastSeparator).replace(/\D/g, '');
  const decimalRaw = cleaned.slice(lastSeparator + 1).replace(/\D/g, '');
  const decimalPart = decimalRaw.slice(0, 2).padEnd(2, '0');
  const integerValue = integerPart ? Number(integerPart) : 0;
  const decimalValue = decimalPart ? Number(decimalPart) : 0;
  return integerValue * 100 + decimalValue;
};

const parsePriceToCents = (value: string) =>
  Math.min(parsePriceToCentsRaw(value), MAX_PRICE_CENTS);

const formatCurrency = (cents: number) => {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const parseInventoryItems = (payload: string) =>
  payload
    .split(/[\n,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);
const stripDigits = (value: string) => value.replace(/\D/g, '');

type DynamicItem = {
  id: string;
  title: string;
  price: string;
  quantity: string;
};

// Fallback Data if API is empty
const DEFAULT_SALES_MODELS: CatalogOption[] = [
  { id: 'aac45330-7455-4a7b-a010-449e37603c46', slug: 'normal', name: 'Normal', description: 'O item vendido será exatamente o do título do anúncio cadastrado neste formulário.' },
  { id: '1ba05634-916c-4866-b256-4299b8032743', slug: 'dinamico', name: 'Dinâmico', description: 'Anuncie vários itens; dando opções para que o cliente escolha qual item ele deseja.' },
  { id: 'b0a1e04d-520c-4573-82a1-30954e7d00f9', slug: 'servico', name: 'Serviço', description: 'Anuncie um serviço no qual o preço não é fixo e que dependem de orçamentos.' },
];

const DEFAULT_ORIGINS: CatalogOption[] = [
  { id: 'origin-1', slug: 'primeiro-dono', name: 'Primeiro dono', description: 'Você é o criador original da conta/item.' },
  { id: 'origin-2', slug: 'nao-sou-primeiro-dono', name: 'Não sou primeiro dono', description: 'Item adquirido de terceiros.' },
];

const DEFAULT_RECOVERY: CatalogOption[] = [
  { id: 'recovery-1', slug: 'tem-dados', name: 'Tem os dados de recuperação', description: 'Possui email de criação ou chaves de recuperação.' },
  { id: 'recovery-2', slug: 'nao-tem-dados', name: 'Não tem os dados de recuperação', description: 'Não possui dados para recuperação do acesso.' },
];

// --- Components ---
function FormSection({ step, title, icon: Icon, children, className = '' }: { step?: string, title: string, icon?: React.ElementType, children: React.ReactNode, className?: string }) {
  return (
    <div className={`rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md md:p-8 ${className}`}>
      <div className="mb-8 flex items-center gap-4 border-b border-slate-50 pb-6">
        {step && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-lg font-black text-meow-600 shadow-sm">
            {step}
          </div>
        )}
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
      </div>
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {children}
      </div>
    </div>
  );
}

// --- Main Component ---

export const AccountListingEditorContent = ({ listingId }: { listingId: string }) => {
  const { user, accessToken, loading } = useAuth();
  const { inDashboardLayout } = useDashboardLayout();

  // State
  const [state, setState] = useState<ListingState>({
    status: 'loading',
    listing: null,
  });
  const [formState, setFormState] = useState<ListingUpdateInput>({
    title: '',
    description: '',
    priceCents: 0,
    currency: 'BRL',
    deliveryType: 'AUTO',
    deliverySlaHours: 24,
    refundPolicy: '',
  });
  const [priceInput, setPriceInput] = useState('');
  const [autoDelivery, setAutoDelivery] = useState(true);
  const [inventoryPayload, setInventoryPayload] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  // Data State
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [salesModels, setSalesModels] = useState<CatalogOption[]>([]);
  const [origins, setOrigins] = useState<CatalogOption[]>([]);
  const [recoveryOptions, setRecoveryOptions] = useState<CatalogOption[]>([]);
  const [groups, setGroups] = useState<CatalogGroup[]>([]);
  const [sections, setSections] = useState<CatalogSection[]>([]);

  // UI State
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [listingType, setListingType] = useState('premium');
  const [productKind, setProductKind] = useState('Conta');
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryGroupId, setCategoryGroupId] = useState('');
  const [categorySectionId, setCategorySectionId] = useState('');
  const [salesModelId, setSalesModelId] = useState('');
  const [originId, setOriginId] = useState('');
  const [recoveryOptionId, setRecoveryOptionId] = useState('');
  const [dynamicItems, setDynamicItems] = useState<DynamicItem[]>([
    { id: `item-${Date.now()}`, title: '', price: '', quantity: '1' },
  ]);

  const accessAllowed = user?.role === 'SELLER' || user?.role === 'ADMIN';

  // --- Effects ---

  // Load Listing
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
        setFormState({
          title: listing.title,
          description: listing.description ?? '',
          priceCents: listing.priceCents,
          currency: listing.currency,
          deliveryType: listing.deliveryType,
          deliverySlaHours: listing.deliverySlaHours ?? 24,
          refundPolicy: listing.refundPolicy ?? '',
        });
        setPriceInput(formatCurrency(listing.priceCents));
        setAutoDelivery(listing.deliveryType === 'AUTO');
        setCategoryId(listing.categoryId ?? '');
        setCategoryGroupId(listing.categoryGroupId ?? '');
        setCategorySectionId(listing.categorySectionId ?? '');
        setSalesModelId(listing.salesModelId ?? '');
        setOriginId(listing.originId ?? '');
        setRecoveryOptionId(listing.recoveryOptionId ?? '');

        // Determine tier from platformFeeBps (if available from API)
        const feeBps = (listing as any).platformFeeBps;
        if (feeBps) {
          if (feeBps <= 999) {
            setListingType('normal');
          } else if (feeBps <= 1199) {
            setListingType('premium');
          } else {
            setListingType('deluxe');
          }
        }

        // Load inventory if auto delivery
        if (listing.deliveryType === 'AUTO') {
          setInventoryLoading(true);
          try {
            const items = await marketplaceApi.listInventoryItems(accessToken, listingId);
            setInventoryItems(items);
          } catch {
            // Ignore inventory errors
          } finally {
            setInventoryLoading(false);
          }
        }
      } catch (err) {
        if (!active) {
          return;
        }
        const message =
          err instanceof ApiClientError
            ? err.message
            : 'Não foi possível carregar o anúncio.';
        setState({ status: 'ready', listing: null, error: message });
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [accessAllowed, accessToken, listingId]);

  // Load Categories
  useEffect(() => {
    let active = true;
    const loadData = async () => {
      const res = await fetchPublicCategories().catch(() => ({ categories: [] }));
      if (active) setCategories(res.categories);
    };
    loadData();
    return () => { active = false; };
  }, []);

  // Load Global Catalogs (Sales Models, Origins, Recovery)
  useEffect(() => {
    let active = true;
    const loadGlobals = async () => {
      const [salesRes, originsRes, recoveryRes] = await Promise.allSettled([
        catalogPublicApi.listSalesModels(),
        catalogPublicApi.listOrigins(),
        catalogPublicApi.listRecoveryOptions(),
      ]);

      if (!active) return;

      if (salesRes.status === 'fulfilled' && salesRes.value.length > 0) {
        setSalesModels(salesRes.value);
      } else {
        setSalesModels(DEFAULT_SALES_MODELS);
      }

      if (originsRes.status === 'fulfilled' && originsRes.value.length > 0) {
        setOrigins(originsRes.value);
      } else {
        setOrigins(DEFAULT_ORIGINS);
      }

      if (recoveryRes.status === 'fulfilled' && recoveryRes.value.length > 0) {
        setRecoveryOptions(recoveryRes.value);
      } else {
        setRecoveryOptions(DEFAULT_RECOVERY);
      }
    };
    loadGlobals();
    return () => { active = false; };
  }, []);

  // Load Category Groups
  useEffect(() => {
    if (!categoryId) {
      setGroups([]);
      return;
    }
    let active = true;
    const loadGroups = async () => {
      const groupsRes = await catalogPublicApi.listGroups(categoryId);
      if (active) setGroups(groupsRes);
    };
    loadGroups().catch(() => active && setGroups([]));
    return () => { active = false; };
  }, [categoryId]);

  // Load Category Sections
  useEffect(() => {
    if (!categoryGroupId) {
      setSections([]);
      return;
    }
    let active = true;
    const loadSections = async () => {
      const sectsRes = await catalogPublicApi.listSections(categoryGroupId);
      if (active) setSections(sectsRes);
    };
    loadSections().catch(() => active && setSections([]));
    return () => { active = false; };
  }, [categoryGroupId]);

  // Defaults
  useEffect(() => {
    setFormState(prev => ({ ...prev, deliveryType: autoDelivery ? 'AUTO' : 'MANUAL' }));
  }, [autoDelivery]);

  const selectedModel = salesModels.find(m => m.id === salesModelId);
  const inventoryCount = inventoryItems.filter(i => i.status === 'AVAILABLE').length;
  const isDynamic = selectedModel?.slug?.includes('dinam');
  const dynamicInventoryPayload = useMemo(() => {
    const lines: string[] = [];
    dynamicItems.forEach((item, index) => {
      const qty = Math.max(0, Number(stripDigits(item.quantity)) || 0);
      if (!qty) {
        return;
      }
      const name = item.title.trim() || `Item ${index + 1}`;
      const priceCents = parsePriceToCents(item.price || '');
      const priceLabel = priceCents ? formatCurrency(priceCents) : '';
      const line = priceLabel ? `${name} | ${priceLabel}` : name;
      for (let i = 0; i < qty; i += 1) {
        lines.push(line);
      }
    });
    return lines.join('\n');
  }, [dynamicItems]);
  const dynamicStockCount = useMemo(
    () =>
      dynamicItems.reduce((acc, item) => {
        const qty = Math.max(0, Number(stripDigits(item.quantity)) || 0);
        return acc + qty;
      }, 0),
    [dynamicItems],
  );
  const updateDynamicItem = (id: string, updates: Partial<DynamicItem>) => {
    setDynamicItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  };
  const removeDynamicItem = (id: string) => {
    setDynamicItems((prev) => prev.filter((item) => item.id !== id));
  };
  const addDynamicItem = () => {
    setDynamicItems((prev) => [
      ...prev,
      { id: `item-${Date.now()}-${Math.random().toString(16).slice(2)}`, title: '', price: '', quantity: '1' },
    ]);
  };

  useEffect(() => {
    if (!isDynamic) {
      return;
    }
    setInventoryPayload(dynamicInventoryPayload);
    if (!priceInput.trim() && dynamicItems.length > 0) {
      const firstPrice = parsePriceToCents(dynamicItems[0]?.price || '');
      if (firstPrice > 0) {
        setPriceInput(formatCurrency(firstPrice));
        setFormState((prev) => ({ ...prev, priceCents: firstPrice }));
      }
    }
  }, [dynamicInventoryPayload, dynamicItems, isDynamic, priceInput]);

  const filteredCategories = categories.filter((category) => {
    const term = categorySearch.trim().toLowerCase();
    if (!term) {
      return true;
    }
    return category.label.toLowerCase().includes(term);
  });

  // --- Handlers ---

  const refreshListing = async () => {
    if (!accessToken) {
      return;
    }
    const listing = await marketplaceApi.getSellerListing(accessToken, listingId);
    setState((prev) => ({ ...prev, listing }));
    if (listing.deliveryType === 'AUTO') {
      setInventoryLoading(true);
      try {
        const items = await marketplaceApi.listInventoryItems(accessToken, listingId);
        setInventoryItems(items);
      } catch {
        // Ignore
      } finally {
        setInventoryLoading(false);
      }
    }
  };

  const handleUpdateListing = async () => {
    if (!accessToken || !state.listing) {
      return;
    }

    if (!formState.title?.trim()) {
      setError('O título é obrigatório.');
      return;
    }
    if ((formState.priceCents ?? 0) <= 0) {
      setError('O valor deve ser maior que zero.');
      return;
    }

    setError(null);
    setNotice(null);
    setBusyAction('update');

    try {
      // Calculate fee based on tier
      const feeMap: Record<string, number> = {
        normal: 999,
        premium: 1199,
        deluxe: 1299,
      };
      const platformFeeBps = feeMap[listingType] || 1000;

      await marketplaceApi.updateListing(accessToken, state.listing.id, {
        ...formState,
        description: formState.description?.trim() || undefined,
        categoryId: categoryId || undefined,
        categoryGroupId: categoryGroupId || undefined,
        categorySectionId: categorySectionId || undefined,
        salesModelId: salesModelId || undefined,
        originId: originId || undefined,
        recoveryOptionId: recoveryOptionId || undefined,
        platformFeeBps,
      });

      // Upload new media if any
      if (mediaFiles.length > 0) {
        const startPos = state.listing.media?.length ?? 0;
        for (const [idx, file] of mediaFiles.entries()) {
          await marketplaceApi.uploadMedia(accessToken, state.listing.id, file, startPos + idx);
        }
        setMediaFiles([]);
      }

      // Import inventory if new items added
      if (inventoryPayload.trim() && autoDelivery) {
        await marketplaceApi.importInventoryItems(accessToken, state.listing.id, inventoryPayload.trim());
        setInventoryPayload('');
      }

      await refreshListing();
      setNotice('Anúncio atualizado com sucesso!');
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : 'Não foi possível atualizar o anúncio.';
      setError(message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleSubmitListing = async () => {
    if (!accessToken || !state.listing) {
      return;
    }
    setBusyAction('submit');
    setError(null);
    setNotice(null);
    try {
      await marketplaceApi.submitListing(accessToken, state.listing.id);
      await refreshListing();
      setNotice('Anúncio enviado para análise.');
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : 'Não foi possível enviar o anúncio.';
      setError(message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleArchiveListing = async () => {
    if (!accessToken || !state.listing) {
      return;
    }
    setBusyAction('archive');
    setError(null);
    setNotice(null);
    try {
      await marketplaceApi.archiveListing(accessToken, state.listing.id);
      await refreshListing();
      setNotice('Anúncio pausado.');
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : 'Não foi possível pausar o anúncio.';
      setError(message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleRemoveMedia = async (mediaId: string) => {
    if (!accessToken || !state.listing) {
      return;
    }
    setBusyAction('remove-media');
    setNotice(null);
    try {
      await marketplaceApi.removeMedia(accessToken, state.listing.id, mediaId);
      await refreshListing();
      setNotice('Mídia removida.');
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : 'Falha ao remover mídia.';
      setError(message);
    } finally {
      setBusyAction(null);
    }
  };

  // --- Derived Mappings ---

  const modelOptions: ModelOption[] = salesModels
    .map(m => {
      let icon = Package;
      let desc = 'O item vendido será exatamente o do título do anúncio cadastrado neste formulário.';

      if (m.slug?.includes('dinam')) {
        icon = Sparkles;
        desc = 'Anuncie vários itens; dando opções para que o cliente escolha qual item ele deseja.';
      }
      if (m.slug?.includes('serv')) {
        icon = Wrench;
        desc = 'Anuncie um serviço no qual o preço não é fixo e que dependem de orçamentos.';
      }
      return { id: m.id, name: m.name, description: desc, icon };
    })
    .sort((a, b) => {
      const rank = (value: string) => {
        const key = value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (key.includes('normal') || key === 'normal') return 1;
        if (key.includes('dinam') || key.includes('dinamico')) return 2;
        if (key.includes('serv') || key.includes('servico')) return 3;
        return 99;
      };
      return rank(a.name) - rank(b.name);
    });

  const tierOptions: Tier[] = [
    {
      id: 'normal',
      name: 'Normal',
      rate: 'Taxa de 9,99%',
      benefits: ['Anúncio Normal', 'Taxa básica de 9,99%']
    },
    {
      id: 'premium',
      name: 'Premium',
      rate: 'Taxa de 11,99%',
      recommended: true,
      benefits: ['Anúncio Premium', 'Destaque na página principal', 'Mais visibilidade', 'Taxa de 11,99%']
    },
    {
      id: 'deluxe',
      name: 'Deluxe',
      rate: 'Taxa de 12,99%',
      benefits: ['Anúncio Deluxe', 'Destaque na página principal', 'Destaque nas pesquisas', 'Máxima visibilidade', 'Taxa de 12,99%']
    },
  ];

  // --- Render ---

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

  if (state.status === 'loading') {
    return (
      <AccountShell
        breadcrumbs={[
          { label: 'Início', href: '/' },
          { label: 'Conta', href: '/conta' },
          { label: 'Meus anúncios', href: '/conta/anuncios' },
          { label: 'Editar anúncio' },
        ]}
      >
        <div className="rounded-2xl border border-slate-100 bg-meow-50 px-4 py-3 text-sm text-meow-muted">
          Carregando anúncio...
        </div>
      </AccountShell>
    );
  }

  if (state.status === 'ready' && !state.listing) {
    return (
      <AccountShell
        breadcrumbs={[
          { label: 'Início', href: '/' },
          { label: 'Conta', href: '/conta' },
          { label: 'Meus anúncios', href: '/conta/anuncios' },
          { label: 'Editar anúncio' },
        ]}
      >
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error ?? 'Anúncio não encontrado.'}
        </div>
      </AccountShell>
    );
  }

  const pageWrapperClassName = inDashboardLayout
    ? 'w-full pb-32'
    : 'min-h-screen bg-slate-50/50 pb-32 pt-6 antialiased';
  const pageContainerClassName = inDashboardLayout
    ? 'w-full'
    : 'mx-auto max-w-[1280px] px-4 lg:px-6';
  const actionBarClassName = inDashboardLayout
    ? 'relative translate-y-0 lg:left-[280px]'
    : 'relative translate-y-0';

  return (
    <div className={pageWrapperClassName}>
      <div className={pageContainerClassName}>

        {/* Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 text-slate-800">
              <Link
                href="/conta/anuncios"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft size={18} />
              </Link>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">Editar Anúncio</h1>
                <div className="mt-1 flex items-center gap-3">
                  <p className="text-base font-medium text-meow-500">ID: {state.listing?.id.slice(0, 8)}</p>
                  <Badge variant={statusTone[state.listing?.status ?? 'DRAFT']}>
                    {statusLabel[state.listing?.status ?? 'DRAFT']}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {state.listing?.status === 'PUBLISHED' && (
              <Button
                variant="danger"
                size="sm"
                onClick={handleArchiveListing}
                disabled={busyAction === 'archive'}
              >
                {busyAction === 'archive' ? 'Pausando...' : 'Pausar Anúncio'}
              </Button>
            )}
            {(state.listing?.status === 'DRAFT' || state.listing?.status === 'SUSPENDED') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSubmitListing}
                disabled={busyAction === 'submit'}
              >
                {busyAction === 'submit' ? 'Enviando...' : 'Enviar para Análise'}
              </Button>
            )}
          </div>
        </header>

        {/* Notices */}
        {error && (
          <div className="mb-8 flex items-center gap-2 rounded-2xl bg-red-50 px-6 py-4 text-sm font-bold text-red-600 animate-in fade-in slide-in-from-top-4">
            <AlertCircle size={20} /> {error}
          </div>
        )}
        {notice && (
          <div className="mb-8 flex items-center gap-2 rounded-2xl bg-emerald-50 px-6 py-4 text-sm font-bold text-emerald-600 animate-in fade-in slide-in-from-top-4">
            <Sparkles size={20} /> {notice}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">

          {/* LEFT COLUMN - FORM */}
          <div className="lg:col-span-8 min-w-0 space-y-6">
            <form className="space-y-6" onSubmit={e => e.preventDefault()}>

              {/* 1. Configuração Inicial */}
              <FormSection step="1" title="Configuração Inicial">
                <div className="grid gap-6 md:grid-cols-[repeat(3,minmax(0,1fr))]">
                  <div className="min-w-0 space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">TIPO DE PRODUTO</label>
                    <Select
                      value={productKind}
                      onChange={(e) => setProductKind(e.target.value)}
                      className="h-14 rounded-2xl border-slate-200 bg-slate-50 font-bold text-slate-700 hover:bg-slate-100 focus:border-meow-300"
                    >
                      <option value="Conta">Conta</option>
                      <option value="Gold">Gold</option>
                      <option value="Item">Item</option>
                      <option value="Serviços">Serviços</option>
                      <option value="Outros">Outros</option>
                    </Select>
                  </div>

                  <div className="min-w-0 space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">PROCEDÊNCIA</label>
                    <Select
                      value={originId || ''}
                      onChange={(e) => setOriginId(e.target.value)}
                      className="h-14 rounded-2xl border-slate-200 bg-slate-50 font-bold text-slate-700 hover:bg-slate-100 focus:border-meow-300"
                    >
                      {origins.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </Select>
                  </div>

                  <div className="min-w-0 space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">DADOS DE RECUPERAÇÃO</label>
                    <Select
                      value={recoveryOptionId || ''}
                      onChange={(e) => setRecoveryOptionId(e.target.value)}
                      className="h-14 rounded-2xl border-slate-200 bg-slate-50 font-bold text-slate-700 hover:bg-slate-100 focus:border-meow-300 truncate pr-8"
                    >
                      {recoveryOptions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </Select>
                  </div>
                </div>
              </FormSection>

              {/* 2. Categorias */}
              <FormSection step="2" title="O que estamos vendendo?">
                <div className="grid gap-6 md:grid-cols-[repeat(3,minmax(0,1fr))] md:items-stretch md:justify-items-stretch">
                  <div className="w-full min-w-0 space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">CATEGORIA</label>
                      <Input
                        value={categorySearch}
                        onChange={(event) => setCategorySearch(event.target.value)}
                        placeholder="Buscar categoria..."
                        className="block h-14 w-full min-w-0 max-w-none rounded-2xl border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.04)] placeholder:text-slate-400 hover:bg-slate-100 focus:border-meow-300"
                      />
                    <Select
                      value={categoryId || ''}
                      onChange={(e) => {
                        setCategoryId(e.target.value);
                        setCategoryGroupId('');
                        setCategorySectionId('');
                      }}
                        className="h-14 w-full max-w-none rounded-2xl border-slate-200 bg-slate-50 font-bold text-slate-700 hover:bg-slate-100 focus:border-meow-300"
                    >
                      <option value="">Selecione...</option>
                      {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </Select>
                  </div>

                  <div className="w-full min-w-0 space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">JOGO / SUBCATEGORIA</label>
                    <Select
                      value={categoryGroupId || ''}
                      onChange={(e) => {
                        setCategoryGroupId(e.target.value);
                        setCategorySectionId('');
                      }}
                      className="h-14 w-full max-w-none rounded-2xl border-slate-200 bg-slate-50 font-bold text-slate-700 hover:bg-slate-100 focus:border-meow-300"
                    >
                      <option value="">Selecione...</option>
                      {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </Select>
                  </div>

                  <div className="w-full min-w-0 space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">SEÇÃO</label>
                    <Select
                      value={categorySectionId || ''}
                      onChange={(e) => setCategorySectionId(e.target.value)}
                      className="h-14 w-full max-w-none rounded-2xl border-slate-200 bg-slate-50 font-bold text-slate-700 hover:bg-slate-100 focus:border-meow-300"
                    >
                      <option value="">Selecione...</option>
                      {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                  </div>
                </div>
              </FormSection>

              {/* 3. Detalhes */}
              <FormSection step="3" title="Detalhes do Produto">
                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">TÍTULO DO ANÚNCIO <span className="text-red-500">*</span></label>
                    <FormTitleSection
                      value={formState.title || ''}
                      onChange={val => setFormState(prev => ({ ...prev, title: val }))}
                    />
                  </div>

                  {modelOptions.length > 0 ? (
                    <ModelSelector
                      options={modelOptions}
                      selected={salesModelId}
                      onChange={id => setSalesModelId(id)}
                    />
                  ) : (
                    <div className="h-20 rounded-2xl bg-slate-50 animate-pulse" />
                  )}

                  {isDynamic ? (
                    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base font-bold text-slate-800">
                            Itens do anúncio dinâmico
                          </h3>
                          <p className="text-xs text-slate-500">
                            Crie opções para o cliente escolher a conta desejada.
                          </p>
                        </div>
                        <span className="text-xs font-bold text-slate-400">
                          Total em estoque: {dynamicStockCount}
                        </span>
                      </div>

                      <div className="mt-4 space-y-4">
                        {dynamicItems.map((item, index) => (
                          <div
                            key={item.id}
                            className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                          >
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold text-slate-800">
                                Item #{index + 1}
                              </h4>
                              {dynamicItems.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => removeDynamicItem(item.id)}
                                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                  aria-label="Remover item"
                                >
                                  <X size={14} />
                                </button>
                              ) : null}
                            </div>
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                  Título
                                </label>
                                <Input
                                  value={item.title}
                                  onChange={(event) =>
                                    updateDynamicItem(item.id, { title: event.target.value })
                                  }
                                  placeholder="Ex: Conta com 4.8k de vbucks"
                                  className="h-12 rounded-xl border-slate-200 bg-white font-semibold text-slate-700"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                  Preço
                                </label>
                                <Input
                                  value={item.price}
                                  onChange={(event) =>
                                    updateDynamicItem(item.id, { price: stripDigits(event.target.value) })
                                  }
                                  placeholder="0"
                                  className="h-12 rounded-xl border-slate-200 bg-white font-semibold text-slate-700"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                  Quantidade em estoque
                                </label>
                                <Input
                                  value={item.quantity}
                                  onChange={(event) =>
                                    updateDynamicItem(item.id, {
                                      quantity: stripDigits(event.target.value),
                                    })
                                  }
                                  placeholder="0"
                                  className="h-12 rounded-xl border-slate-200 bg-white font-semibold text-slate-700"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex justify-center">
                        <Button
                          type="button"
                          size="sm"
                          className="gap-2"
                          onClick={addDynamicItem}
                        >
                          <Plus size={14} aria-hidden />
                          Adicionar item
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-8 md:grid-cols-2">
                    {/* Price */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-400">VALOR (BRL)</label>
                      <div className="relative">
                        <Input
                          value={priceInput}
                          onChange={(e) => {
                            const nextValue = e.target.value;
                            const rawCents = parsePriceToCentsRaw(nextValue);
                            const nextCents = Math.min(rawCents, MAX_PRICE_CENTS);
                            if (rawCents > MAX_PRICE_CENTS) {
                              setPriceInput(formatCurrency(MAX_PRICE_CENTS));
                            } else {
                              setPriceInput(nextValue);
                            }
                            setFormState(prev => ({ ...prev, priceCents: nextCents }));
                          }}
                          placeholder="R$ 0,00"
                          className="h-14 rounded-xl border-slate-200 bg-slate-50 pl-4 text-xl font-bold text-slate-800 focus:border-meow-300 focus:ring-4 focus:ring-meow-red/10"
                        />
                      </div>
                    </div>

                    {/* Stock */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-400">ESTOQUE ATUAL</label>
                      <div className="h-14 rounded-xl border border-slate-200 bg-slate-50 pl-4 flex items-center text-xl font-bold text-slate-800">
                        {autoDelivery ? (isDynamic ? dynamicStockCount : inventoryCount) : 1}
                        {inventoryLoading && <span className="ml-2 text-sm font-normal text-slate-400">carregando...</span>}
                      </div>
                    </div>
                  </div>

                  {/* Auto Delivery Input */}
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6 dark:border-emerald-500/20 dark:bg-emerald-950/40">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm dark:bg-emerald-500/20 dark:text-emerald-200">
                          <Zap size={18} fill="currentColor" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-emerald-50">Entrega Automática</h4>
                          <p className="text-xs font-bold text-slate-500 dark:text-emerald-100/70">
                            O sistema entrega o produto assim que o pagamento for aprovado.
                          </p>
                        </div>
                      </div>
                      <Toggle
                        checked={autoDelivery}
                        onCheckedChange={setAutoDelivery}
                        className="data-[state=on]:bg-meow-500"
                      />
                    </div>

                    {autoDelivery && !isDynamic && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <label className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-200">ADICIONAR NOVOS ITENS AO ESTOQUE</label>
                        <Textarea
                          value={inventoryPayload}
                          onChange={e => setInventoryPayload(e.target.value)}
                          placeholder={isDynamic ? "Item #1 | Acesso...\nItem #2 | Acesso..." : "Ex: Login: usuario123 | Senha: senha123\nOu Cole aqui a Key do jogo..."}
                          className="min-h-[120px] rounded-xl border-emerald-200 bg-white font-mono text-sm focus:border-emerald-400 focus:ring-emerald-500/10 dark:border-emerald-500/40 dark:bg-emerald-950/20"
                        />
                        <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 dark:text-emerald-200">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 block dark:bg-emerald-300"></span>
                          Esses dados são criptografados e enviados apenas para o comprador após o pagamento.
                        </p>
                      </div>
                    )}
                    {autoDelivery && isDynamic ? (
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                        Os itens dinâmicos geram o estoque automaticamente.
                      </p>
                    ) : null}

                  </div>
                </div>
              </FormSection>

              {/* 4. Descrição e Imagens */}
              <FormSection step="4" title="Descrição e Imagens">
                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">DESCRIÇÃO DETALHADA</label>
                    <ListingDescriptionField
                      value={formState.description || ''}
                      onChange={val => setFormState(prev => ({ ...prev, description: val }))}
                    />
                  </div>

                  {/* Existing Media */}
                  {(state.listing?.media ?? []).length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-400">IMAGENS ATUAIS</label>
                      <div className="grid gap-3 md:grid-cols-3">
                        {(state.listing?.media ?? []).map((media) => (
                          <div
                            key={media.id}
                            className="group relative overflow-hidden rounded-2xl border border-slate-100"
                          >
                            <img src={media.url} alt={media.type} className="h-32 w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveMedia(media.id)}
                              className="absolute right-2 top-2 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold text-red-500 shadow-card hover:bg-red-50 transition-colors"
                            >
                              Remover
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">ADICIONAR NOVAS IMAGENS (MAX 5MB)</label>
                    <ImageUploader
                      files={mediaFiles}
                      onFilesChange={setMediaFiles}
                    />
                  </div>
                </div>
              </FormSection>

              {/* 5. Destaque (Separated) */}
              <AdTierSelector
                tiers={tierOptions}
                selected={listingType}
                onChange={setListingType}
                className="bg-white"
              />

              {/* Security Guarantee Box */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
                <div className="flex gap-4">
                  <div className="shrink-0 text-meow-500">
                    <div className="w-10 h-10 rounded-full bg-white border border-meow-100 flex items-center justify-center">
                      <Trophy size={20} className="text-meow-500" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      Segurança Garantida
                    </h4>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                      A <span className="font-bold">Meoww</span> atua como intermediadora. O valor pago pelo comprador fica retido conosco até você entregar o produto. Isso garante proteção total para ambas as partes.
                    </p>
                  </div>
                </div>
              </div>

            </form>

            <ActionBar
              onNext={handleUpdateListing}
              nextLabel="Salvar Alterações"
              nextDisabled={false}
              loading={busyAction === 'update'}
              className={actionBarClassName}
              leftContent={
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total à receber (aprox.)</span>
                  <span className="text-xl font-black text-meow-deep">
                    {(() => {
                      const feeMap: Record<string, number> = {
                        normal: 0.0999,
                        premium: 0.1199,
                        deluxe: 0.1299,
                      };
                      const fee = feeMap[listingType] || 0.0999;
                      const total = (formState.priceCents ?? 0) * (1 - fee);
                      return formatCurrency(total);
                    })()}
                    <span className="ml-2 text-xs font-bold text-slate-300 line-through opacity-70">
                      {formatCurrency(formState.priceCents ?? 0)}
                    </span>
                  </span>
                </div>
              }
            />
          </div>


          {/* RIGHT COLUMN - PREVIEW */}
          <div className="hidden lg:block lg:col-span-4 min-w-0 pl-4 sticky top-6">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-800">PRÉ-VISUALIZAÇÃO</h3>
            <div className="space-y-6">
              <ListingCard
                id="preview"
                title={formState.title || 'Seu Título Aparece Aqui...'}
                priceCents={(formState.priceCents ?? 0) > 0 ? (formState.priceCents ?? 0) : 0}
                currency="BRL"
                image={
                  mediaFiles.length > 0 && mediaFiles[0]
                    ? URL.createObjectURL(mediaFiles[0])
                    : state.listing?.media?.[0]?.url ?? '/assets/meoow/cat-01.png'
                }
                href="#"
                description={formState.description}
                variant={listingType === 'deluxe' ? 'red' : 'dark'}
                isAuto={autoDelivery}
                showFavorite={false}
              />

              {/* Origin & Recovery Info */}
              {(originId || recoveryOptionId) && (
                <div className="rounded-2xl bg-white p-5 border border-slate-100 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">Informações do produto</h4>
                  {originId && (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {origins.find(o => o.id === originId)?.name || 'Procedência'}
                      </span>
                    </div>
                  )}
                  {recoveryOptionId && (
                    <div className="flex items-center gap-2">
                      {recoveryOptions.find(r => r.id === recoveryOptionId)?.slug === 'nao-tem-dados' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          <AlertCircle size={12} />
                          Não possui dados de recuperação
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {recoveryOptions.find(r => r.id === recoveryOptionId)?.name || 'Dados'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Guidance Box */}
              <div className="rounded-2xl bg-white p-6 border border-slate-100 shadow-sm space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Título chamativo</h4>
                    <p className="text-xs text-slate-500 mt-1">Use palavras-chave como "Diamante", "Full Acesso", "Entrega Rápida".</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                    <ImageIcon size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Boas Imagens</h4>
                    <p className="text-xs text-slate-500 mt-1">Mostre o inventário, skins raras ou o nível da conta. Oculte nicks!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

  );
};
