'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';

import { useAuth } from '../../../components/auth/auth-provider';
import { Input } from '../../../components/ui/input';
import { CurrencyInput } from '../../../components/ui/currency-input';
import { Select } from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { Toggle } from '../../../components/ui/toggle';
import { Button } from '../../../components/ui/button';
import { ApiClientError } from '../../../lib/api-client';
import {
  marketplaceApi,
  type Listing,
  type ListingInput,
} from '../../../lib/marketplace-api';
import { usersApi, type UserProfile } from '../../../lib/users-api';
import {
  catalogPublicApi,
  type CatalogGroup,
  type CatalogSection,
  type CatalogOption,
} from '../../../lib/catalog-public-api';
import {
  fetchPublicCategories,
  type CatalogCategory,
} from '../../../lib/marketplace-public';

// Custom Components
import { FormTitleSection } from '../../../components/forms/form-title-section';
import { ModelSelector, type ModelOption } from '../../../components/forms/model-selector';
import { ImageUploader } from '../../../components/forms/image-uploader';
import { AdTierSelector, type Tier } from '../../../components/forms/ad-tier-selector';
import { ListingDescriptionField } from '../../../components/forms/listing-description-field';
import { ActionBar } from '../../../components/forms/action-bar';
import { ListingCard } from '../../../components/listings/listing-card';

// --- Types & Constants ---

const emptyListing: ListingInput = {
  categoryId: '',
  categoryGroupId: '',
  categorySectionId: '',
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

const MAX_PRICE_CENTS = 300000;
const MIN_PRICE_CENTS = 250;
const TAG_COLOR_OPTIONS = [
  { value: 'blue', label: 'Azul', className: 'border-sky-200 bg-sky-100 text-sky-700' },
  { value: 'green', label: 'Verde', className: 'border-emerald-200 bg-emerald-100 text-emerald-700' },
  { value: 'pink', label: 'Rosa claro', className: 'border-pink-200 bg-pink-100 text-pink-700' },
] as const;

type TagColorOption = (typeof TAG_COLOR_OPTIONS)[number]['value'];

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
const sanitizeTitle = (input: string) =>
  input.replace(/[^0-9A-Za-zÀ-ÖØ-öø-ÿ ]+/g, '');

type DynamicItem = {
  id: string;
  title: string;
  priceCents: number;
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

export default function Page() {
  const { user, accessToken } = useAuth();
  const router = useRouter();

  // State
  const [formState, setFormState] = useState<ListingInput>(emptyListing);
  const [autoDelivery, setAutoDelivery] = useState(true);
  const [inventoryPayload, setInventoryPayload] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);

  // Data State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [salesModels, setSalesModels] = useState<CatalogOption[]>([]);
  const [origins, setOrigins] = useState<CatalogOption[]>([]);
  const [recoveryOptions, setRecoveryOptions] = useState<CatalogOption[]>([]);
  const [groups, setGroups] = useState<CatalogGroup[]>([]);
  const [sections, setSections] = useState<CatalogSection[]>([]);

  // UI State
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [listingType, setListingType] = useState('premium');
  const [productKind, setProductKind] = useState('Conta');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [customTagEnabled, setCustomTagEnabled] = useState(false);
  const [customTagEmoji, setCustomTagEmoji] = useState('');
  const [customTagLabel, setCustomTagLabel] = useState('');
  const [customTagColor, setCustomTagColor] = useState<TagColorOption>('blue');
  const [dynamicItems, setDynamicItems] = useState<DynamicItem[]>([
    { id: `item-${Date.now()}`, title: '', priceCents: 0, quantity: '1' },
  ]);

  // --- Effects ---

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

  useEffect(() => {
    const selected = categories.find((category) => category.id === formState.categoryId);
    if (selected) {
      setCategoryQuery(selected.label);
    }
  }, [categories, formState.categoryId]);

  useEffect(() => {
    let active = true;
    if (!accessToken) {
      setProfile(null);
      setProfileLoading(false);
      return () => { active = false; };
    }
    setProfileLoading(true);
    setProfileError(null);
    usersApi
      .getProfile(accessToken)
      .then((data) => {
        if (active) {
          setProfile(data);
        }
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        setProfile(null);
        setProfileError(err instanceof Error ? err.message : 'Não foi possível carregar seus dados.');
      })
      .finally(() => {
        if (active) {
          setProfileLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [accessToken]);

  // Load Global Catalogs (Sales Models, Origins, Recovery)
  useEffect(() => {
    let active = true;
    const loadGlobals = async () => {
      // Load independent catalogs
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
    if (!formState.categoryId) {
      setGroups([]);
      return;
    }
    let active = true;
    const loadGroups = async () => {
      const groupsRes = await catalogPublicApi.listGroups(formState.categoryId);
      if (active) setGroups(groupsRes);
    };
    loadGroups().catch(() => active && setGroups([]));
    return () => { active = false; };
  }, [formState.categoryId]);

  // Load Category Sections
  useEffect(() => {
    if (!formState.categoryGroupId) {
      setSections([]);
      return;
    }
    let active = true;
    const loadSections = async () => {
      const sectsRes = await catalogPublicApi.listSections(formState.categoryGroupId);
      if (active) setSections(sectsRes);
    };
    loadSections().catch(() => active && setSections([]));
    return () => { active = false; };
  }, [formState.categoryGroupId]);

  // Defaults
  useEffect(() => {
    setFormState(prev => ({ ...prev, deliveryType: autoDelivery ? 'AUTO' : 'MANUAL' }));
  }, [autoDelivery]);

  useEffect(() => {
    if (salesModels.length > 0 && !formState.salesModelId) {
      const normal = salesModels.find(m => m.slug === 'normal') || salesModels[0];
      if (normal) {
        setFormState(prev => ({ ...prev, salesModelId: normal.id }));
      }
    }
  }, [salesModels, formState.salesModelId]);

  useEffect(() => {
    if (origins.length > 0 && !formState.originId && origins[0]) {
      setFormState(prev => ({ ...prev, originId: origins[0]!.id }));
    }
    if (recoveryOptions.length > 0 && !formState.recoveryOptionId && recoveryOptions[0]) {
      setFormState(prev => ({ ...prev, recoveryOptionId: recoveryOptions[0]!.id }));
    }
  }, [origins, recoveryOptions, formState.originId, formState.recoveryOptionId]);

  useEffect(() => {
    if (groups.length > 0 && !groups.some(g => g.id === formState.categoryGroupId) && groups[0]) {
      setFormState(prev => ({ ...prev, categoryGroupId: groups[0]!.id }));
    }
  }, [groups, formState.categoryGroupId]);

  useEffect(() => {
    if (autoDelivery) {
      setCustomTagEnabled(false);
    }
  }, [autoDelivery]);

  const normalizedNumber = profile?.addressNumber?.trim().toLowerCase() ?? '';
  const addressNumberOk =
    (normalizedNumber === 's/n' || normalizedNumber === 'sem número') ||
    Boolean(profile?.addressNumber?.trim());
  const profileMissingFields = profile ? [
    { label: 'Nome completo', valid: Boolean(profile.fullName?.trim()) },
    { label: 'CPF', valid: stripDigits(profile.cpf ?? '').length === 11 },
    { label: 'Nascimento', valid: Boolean(profile.birthDate?.trim()) },
    { label: 'CEP', valid: Boolean(profile.addressZip?.trim()) },
    { label: 'Endereço', valid: Boolean(profile.addressStreet?.trim()) },
    { label: 'Número', valid: addressNumberOk },
    { label: 'Bairro', valid: Boolean(profile.addressDistrict?.trim()) },
    { label: 'Cidade', valid: Boolean(profile.addressCity?.trim()) },
    { label: 'Estado', valid: Boolean(profile.addressState?.trim()) },
    { label: 'Pais', valid: Boolean(profile.addressCountry?.trim()) },
  ].filter((item) => !item.valid).map((item) => item.label) : [];
  const shouldBlockPublish = profileLoading || !profile || profileMissingFields.length > 0;
  const tagIncomplete =
    customTagEnabled &&
    !autoDelivery &&
    (!customTagEmoji.trim() || !customTagLabel.trim());

  // --- Handlers ---

  const handlePublish = async () => {
    if (profileLoading) return setError('Aguarde o carregamento dos seus dados.');
    if (!profile) return setError('Não foi possível verificar seus dados. Tente novamente.');
    if (profileMissingFields.length > 0) {
      return setError('Complete seus dados antes de publicar um anuncio.');
    }
    if (!termsAccepted) return setError('Aceite os termos para continuar.');
    if (!formState.title.trim()) return setError('O título é obrigatório.');
    if (!formState.categoryId) return setError('Selecione uma categoria.');
    if (formState.priceCents < MIN_PRICE_CENTS) {
      return setError('O valor deve ser de pelo menos R$ 2,50.');
    }
    if (tagIncomplete) {
      return setError('Preencha o emoji e o nome da tag.');
    }

    // Check if user has seller permission
    if (user?.role !== 'SELLER' && user?.role !== 'ADMIN') {
      return setError('Você precisa ser um vendedor verificado para publicar anúncios.');
    }

    // Inventory check
    const items = parseInventoryItems(inventoryPayload);
    if (autoDelivery && items.length === 0) return setError('Adicione itens ao estoque para entrega automática.');

    setError(null);
    setBusyAction('publish');

    try {
      // 1. Create/Update Listing
      const feeMap: Record<string, number> = {
        normal: 999,
        premium: 1199,
        deluxe: 1299,
      };
      const platformFeeBps = feeMap[listingType] || 1000;

      const payload = {
        ...formState,
        description: formState.description?.trim(),
        platformFeeBps,
      };

      const saved = listing?.id
        ? await marketplaceApi.updateListing(accessToken!, listing.id, payload)
        : await marketplaceApi.createListing(accessToken!, payload);

      setListing(saved);

      // 2. Upload Media
      if (mediaFiles.length > 0) {
        const startPos = saved.media?.length ?? 0;
        for (const [idx, file] of mediaFiles.entries()) {
          await marketplaceApi.uploadMedia(accessToken!, saved.id, file, startPos + idx);
        }
      }

      // 3. Import Inventory
      if (inventoryPayload.trim()) {
        await marketplaceApi.importInventoryItems(accessToken!, saved.id, inventoryPayload.trim());
      }

      // 4. Submit
      await marketplaceApi.submitListing(accessToken!, saved.id);

      router.push(`/anunciar/sucesso?id=${saved.id}`);
    } catch (err: any) {
      setError(err.message || 'Erro ao publicar anúncio.');
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

  const selectedModel = salesModels.find(m => m.id === formState.salesModelId);
  const inventoryCount = parseInventoryItems(inventoryPayload).length;
  const isDynamic = selectedModel?.slug?.includes('dinam');
  const dynamicInventoryPayload = useMemo(() => {
    const lines: string[] = [];
    dynamicItems.forEach((item, index) => {
      const qty = Math.max(0, Number(stripDigits(item.quantity)) || 0);
      if (!qty) {
        return;
      }
      const name = item.title.trim() || `Item ${index + 1}`;
      const priceCents = item.priceCents ?? 0;
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
      { id: `item-${Date.now()}-${Math.random().toString(16).slice(2)}`, title: '', priceCents: 0, quantity: '1' },
    ]);
  };

  useEffect(() => {
    if (!isDynamic) {
      return;
    }
    setInventoryPayload(dynamicInventoryPayload);
    if ((formState.priceCents ?? 0) <= 0 && dynamicItems.length > 0) {
      const firstPrice = parsePriceToCents(dynamicItems[0]?.price || '');
      if (firstPrice > 0) {
        setFormState((prev) => ({ ...prev, priceCents: firstPrice }));
      }
    }
  }, [dynamicInventoryPayload, dynamicItems, formState.priceCents, isDynamic]);
  const filteredCategories = useMemo(() => {
    const term = categoryQuery.trim().toLowerCase();
    if (!term) {
      return categories;
    }
    return categories.filter((category) => category.label.toLowerCase().includes(term));
  }, [categories, categoryQuery]);

  if (!user) return <div className="p-8 text-center text-slate-500">Faça login para anunciar.</div>; // Simplified auth guard

  return (
    <div className="min-h-screen bg-slate-50/50 pb-32 pt-6 antialiased">
      <div className="mx-auto max-w-[1280px] px-4 lg:px-6">

        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-800">
              <h1 className="text-3xl font-black tracking-tight text-slate-900">Anúncio</h1>
            </div>
            <p className="mt-1 text-base font-medium text-meow-500">Criar novo anúncio</p>
          </div>

        </header>

        {error && (
          <div className="mb-8 flex items-center gap-2 rounded-2xl bg-red-50 px-6 py-4 text-sm font-bold text-red-600 animate-in fade-in slide-in-from-top-4">
            <AlertCircle size={20} /> {error}
          </div>
        )}
        {user && user.role !== 'SELLER' && user.role !== 'ADMIN' && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm font-bold text-red-600">
            <AlertCircle size={18} /> Você precisa ser um vendedor verificado para publicar anúncios.
          </div>
        )}
        {profileError && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm font-bold text-amber-700">
            <AlertCircle size={18} /> {profileError}
          </div>
        )}
        {!profileLoading && profileMissingFields.length > 0 && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
            <p className="font-bold">Verifique seus dados antes de publicar.</p>
            <p className="mt-1 text-xs text-amber-700">
              Complete os campos em <Link href="/conta/meus-dados" className="font-bold underline">Meus dados</Link>.
            </p>
            <p className="mt-3 text-xs font-semibold text-amber-700">
              Pendencias: {profileMissingFields.join(', ')}.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">

          {/* LEFT COLUMN - FORM */}
          <div className="lg:col-span-8 space-y-6">
            <form className="space-y-6" onSubmit={e => e.preventDefault()}>

              {/* 1. Configuração Inicial */}
              <FormSection step="1" title="Configuração Inicial">
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
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

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">PROCEDÊNCIA</label>
                    <Select
                      value={formState.originId || ''}
                      onChange={(e) => setFormState(prev => ({ ...prev, originId: e.target.value }))}
                      className="h-14 rounded-2xl border-slate-200 bg-slate-50 font-bold text-slate-700 hover:bg-slate-100 focus:border-meow-300"
                    >
                      {origins.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">DADOS DE RECUPERAÇÃO</label>
                    <Select
                      value={formState.recoveryOptionId || ''}
                      onChange={(e) => setFormState(prev => ({ ...prev, recoveryOptionId: e.target.value }))}
                      className="h-14 rounded-2xl border-slate-200 bg-slate-50 font-bold text-slate-700 hover:bg-slate-100 focus:border-meow-300 truncate pr-8"
                    >
                      {recoveryOptions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </Select>
                  </div>
                </div>
              </FormSection>

              {/* 2. Categorias */}
              <FormSection step="2" title="O que vamos vender?">
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">CATEGORIA</label>
                    <div className="relative">
                      <Input
                        value={categoryQuery}
                        onChange={(event) => {
                          setCategoryQuery(event.target.value);
                          setCategoryOpen(true);
                        }}
                        onFocus={() => setCategoryOpen(true)}
                        onBlur={() => setTimeout(() => setCategoryOpen(false), 120)}
                        placeholder="Digite para buscar..."
                        className="h-12 rounded-2xl border-slate-200 bg-slate-50 font-semibold text-slate-700 placeholder:text-slate-400"
                      />
                      {categoryOpen ? (
                        <div className="absolute z-10 mt-2 w-full rounded-2xl border border-slate-100 bg-white p-2 shadow-[0_18px_32px_rgba(15,23,42,0.12)]">
                          {filteredCategories.length > 0 ? (
                            <div className="max-h-56 overflow-y-auto">
                              {filteredCategories.map((category) => (
                                <button
                                  type="button"
                                  key={category.id}
                                  className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    setFormState((prev) => ({
                                      ...prev,
                                      categoryId: category.id,
                                      categoryGroupId: '',
                                      categorySectionId: '',
                                    }));
                                    setCategoryQuery(category.label);
                                    setCategoryOpen(false);
                                  }}
                                >
                                  {category.label}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="px-3 py-2 text-xs text-slate-400">
                              Nenhuma categoria encontrada.
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">JOGO / SUBCATEGORIA</label>
                    <Select
                      value={formState.categoryGroupId || ''}
                      onChange={(e) => setFormState(prev => ({ ...prev, categoryGroupId: e.target.value, categorySectionId: '' }))}
                      className="h-14 rounded-2xl border-slate-200 bg-slate-50 font-bold text-slate-700 hover:bg-slate-100 focus:border-meow-300"
                    >
                      <option value="">Selecione...</option>
                      {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">SEÇÃO</label>
                    <Select
                      value={formState.categorySectionId || ''}
                      onChange={(e) => setFormState(prev => ({ ...prev, categorySectionId: e.target.value }))}
                      className="h-14 rounded-2xl border-slate-200 bg-slate-50 font-bold text-slate-700 hover:bg-slate-100 focus:border-meow-300"
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
                      selected={formState.salesModelId}
                      onChange={id => setFormState(prev => ({ ...prev, salesModelId: id }))}
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
                                    updateDynamicItem(item.id, { title: sanitizeTitle(event.target.value) })
                                  }
                                  placeholder="Ex: Conta com 4.8k de vbucks"
                                  className="h-12 rounded-xl border-slate-200 bg-white font-semibold text-slate-700"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                  Preço
                                </label>
                                <CurrencyInput
                                  valueCents={item.priceCents}
                                  onValueChange={(nextCents) =>
                                    updateDynamicItem(item.id, { priceCents: nextCents })
                                  }
                                  maxCents={MAX_PRICE_CENTS}
                                  placeholder="R$ 0,00"
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

                  <div className="grid gap-8 md:grid-cols-2 md:items-end">
                    {/* Price */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-400">VALOR (BRL)</label>
                        <span className="text-[10px] font-semibold text-slate-400">
                          Min: R$ 2,50 · Máx: R$ 3.000,00
                        </span>
                      </div>
                      <div className="relative">
                        <CurrencyInput
                          valueCents={formState.priceCents ?? 0}
                          onValueChange={(nextCents) =>
                            setFormState((prev) => ({
                              ...prev,
                              priceCents: Math.max(nextCents, 0),
                            }))
                          }
                          maxCents={MAX_PRICE_CENTS}
                          placeholder="R$ 0,00"
                          className="h-14 rounded-xl border-slate-200 bg-slate-50 pl-4 text-xl font-bold text-slate-800 focus:border-meow-300 focus:ring-4 focus:ring-meow-red/10"
                        />
                      </div>
                    </div>

                    {/* Stock */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-400">ESTOQUE</label>
                      <Input
                        value={autoDelivery ? (isDynamic ? dynamicStockCount : inventoryCount) : 1}
                        readOnly
                        className="h-14 rounded-xl border-slate-200 bg-slate-50 pl-4 text-xl font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Auto Delivery Input */}
                  <div className="rounded-2xl bg-emerald-50/50 border border-emerald-100 p-6">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                          <Zap size={16} fill="currentColor" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">Entrega Automática</h4>
                          <p className="text-xs font-bold text-slate-500">O sistema entrega o produto assim que o pagamento for aprovado.</p>
                        </div>
                      </div>
                      <Toggle
                        checked={autoDelivery}
                        onCheckedChange={setAutoDelivery}
                        className="self-start data-[state=on]:bg-meow-500 sm:self-center"
                      />
                    </div>

                    {autoDelivery && !isDynamic && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <label className="text-xs font-bold uppercase tracking-wide text-emerald-700">DADOS PARA ENTREGA (FICA OCULTO ATÉ A VENDA)</label>
                        <Textarea
                          value={inventoryPayload}
                          onChange={e => setInventoryPayload(e.target.value)}
                          placeholder={isDynamic ? "Item #1 | Acesso...\nItem #2 | Acesso..." : "Ex: Login: usuario123 | Senha: senha123\nOu Cole aqui a Key do jogo..."}
                          className="min-h-[120px] rounded-xl border-emerald-200 bg-white font-mono text-sm focus:border-emerald-400 focus:ring-emerald-500/10"
                        />
                        <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 block"></span>
                          Esses dados são criptografados e enviados apenas para o comprador após o pagamento.
                        </p>
                      </div>
                    )}
                    {autoDelivery && isDynamic ? (
                      <p className="text-xs font-semibold text-emerald-700">
                        Os itens dinâmicos geram o estoque automaticamente.
                      </p>
                    ) : null}

                  </div>

                  {/* Custom Tag */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-white shadow-sm">
                          <Sparkles size={16} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">Tag personalizada</h4>
                          <p className="text-xs font-bold text-slate-500">
                            Use uma tag com emoji e cor para destacar o anúncio.
                          </p>
                        </div>
                      </div>
                      <Toggle
                        checked={customTagEnabled}
                        onCheckedChange={setCustomTagEnabled}
                        className="self-start data-[state=on]:bg-slate-800 sm:self-center"
                        disabled={autoDelivery}
                      />
                    </div>

                    {autoDelivery ? (
                      <p className="text-xs font-semibold text-emerald-700">
                        Desative a entrega automática para usar a tag personalizada.
                      </p>
                    ) : null}

                    {customTagEnabled && !autoDelivery ? (
                      <div className="grid gap-4">
                        <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Emoji
                            <Input
                              value={customTagEmoji}
                              onChange={(event) => setCustomTagEmoji(event.target.value)}
                              placeholder="✨"
                              maxLength={3}
                              className="mt-2 h-12 rounded-xl border-slate-200 bg-white text-lg"
                              aria-invalid={tagIncomplete}
                            />
                          </label>
                          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Nome da tag
                            <Input
                              value={customTagLabel}
                              onChange={(event) =>
                                setCustomTagLabel(event.target.value.slice(0, 10))
                              }
                              placeholder="Ex: Novidade"
                              maxLength={10}
                              className="mt-2 h-12 rounded-xl border-slate-200 bg-white"
                              aria-invalid={tagIncomplete}
                            />
                          </label>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Cor da tag
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {TAG_COLOR_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setCustomTagColor(option.value)}
                                aria-pressed={customTagColor === option.value}
                                className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${customTagColor === option.value
                                    ? option.className
                                    : 'border-slate-200 bg-white text-slate-500'
                                  }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Prévias
                          </span>
                          <span
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3px] ${TAG_COLOR_OPTIONS.find((option) => option.value === customTagColor)?.className ?? ''}`}
                          >
                            {(customTagEmoji || '✨').trim()} {customTagLabel || 'Sua tag'}
                          </span>
                        </div>

                        {tagIncomplete ? (
                          <p className="text-xs font-semibold text-rose-600">
                            Preencha o emoji e o nome da tag.
                          </p>
                        ) : null}
                      </div>
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

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">IMAGENS DO PRODUTO (MAX 5MB)</label>
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

              {/* Terms */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={e => setTermsAccepted(e.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-meow-600 focus:ring-meow-500"
                  />
                  <label htmlFor="terms" className="cursor-pointer text-sm text-slate-600">
                    Declaro que li e concordo com os <Link href="/institucional/termos" className="font-bold text-meow-600 hover:underline">Termos de Uso</Link> e a <Link href="/institucional/privacidade" className="font-bold text-meow-600 hover:underline">Política de Publicação</Link>.
                  </label>
                </div>
              </div>

            </form>

            <ActionBar
              onNext={handlePublish}
              nextLabel="Publicar Anúncio"
              nextDisabled={shouldBlockPublish || tagIncomplete}
              loading={busyAction === 'publish'}
              className="relative translate-y-0" // Reset fixed pos if needed, but ActionBar handles it
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
                      const total = formState.priceCents * (1 - fee);
                      return formatCurrency(total);
                    })()}
                    <span className="ml-2 text-xs font-bold text-slate-300 line-through opacity-70">
                      {formatCurrency(formState.priceCents)}
                    </span>
                  </span>
                </div>
              }
            />
          </div>


          {/* RIGHT COLUMN - PREVIEW */}
          <div className="hidden lg:block lg:col-span-4 pl-4 sticky top-6">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-800">PRÉ-VISUALIZAÇÃO</h3>
            <div className="space-y-6">
              <ListingCard
                id="preview"
                title={formState.title || 'Seu Título Aparece Aqui...'}
                priceCents={formState.priceCents > 0 ? formState.priceCents : 0}
                currency="BRL"
                image={mediaFiles.length > 0 && mediaFiles[0] ? URL.createObjectURL(mediaFiles[0]) : '/assets/meoow/cat-01.png'}
                href="#"
                description={formState.description}
                variant={listingType === 'deluxe' ? 'red' : 'dark'}
                isAuto={autoDelivery}
                tagLabel={
                  customTagEnabled && !autoDelivery ? customTagLabel.trim() || null : null
                }
                tagEmoji={
                  customTagEnabled && !autoDelivery ? customTagEmoji.trim() || null : null
                }
                tagTone={customTagColor}
                showFavorite={false}
              />

              {/* Origin & Recovery Info */}
              {(formState.originId || formState.recoveryOptionId) && (
                <div className="rounded-2xl bg-white p-5 border border-slate-100 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">Informações do produto</h4>
                  {formState.originId && (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {origins.find(o => o.id === formState.originId)?.name || 'Procedência'}
                      </span>
                    </div>
                  )}
                  {formState.recoveryOptionId && (
                    <div className="flex items-center gap-2">
                      {recoveryOptions.find(r => r.id === formState.recoveryOptionId)?.slug === 'nao-tem-dados' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          <AlertCircle size={12} />
                          Não possui dados de recuperação
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {recoveryOptions.find(r => r.id === formState.recoveryOptionId)?.name || 'Dados'}
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
}
