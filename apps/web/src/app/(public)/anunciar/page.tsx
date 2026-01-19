'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Crown,
  Gamepad2,
  LayoutGrid,
  Package,
  Sparkles,
  Trophy,
  Wrench,
  AlertCircle,
  Zap,
  Image as ImageIcon,
} from 'lucide-react';

import { useAuth } from '../../../components/auth/auth-provider';
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

const parsePriceToCents = (value: string) => {
  const digits = value.replace(/[^0-9]/g, '');
  return digits ? Number(digits) : 0;
};

const formatCurrency = (cents: number) => {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const parseInventoryItems = (payload: string) =>
  payload
    .split(/[\n,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);

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
  const [priceInput, setPriceInput] = useState('');
  const [autoDelivery, setAutoDelivery] = useState(true);
  const [inventoryPayload, setInventoryPayload] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);

  // Data State
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

  // --- Handlers ---

  const handlePublish = async () => {
    if (!termsAccepted) return setError('Aceite os termos para continuar.');
    if (!formState.title.trim()) return setError('O título é obrigatório.');
    if (!formState.categoryId) return setError('Selecione uma categoria.');
    if (formState.priceCents <= 0) return setError('O valor deve ser maior que zero.');

    // Inventory check
    const items = parseInventoryItems(inventoryPayload);
    if (autoDelivery && items.length === 0) return setError('Adicione itens ao estoque para entrega automática.');

    setError(null);
    setBusyAction('publish');

    try {
      // 1. Create/Update Listing
      const feeMap: Record<string, number> = {
        padrao: 1000,
        premium: 1150,
        deluxe: 1250,
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

  const modelOptions: ModelOption[] = salesModels.map(m => {
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
  });

  const tierOptions: Tier[] = [
    {
      id: 'padrao',
      name: 'Padrão',
      rate: '10% taxa',
      benefits: ['Exposição padrão', 'Suporte padrão']
    },
    {
      id: 'premium',
      name: 'Premium',
      rate: '11.50% taxa',
      recommended: true,
      benefits: ['Exposição Alta', 'Destaque na Home', 'Suporte Prioritário']
    },
    {
      id: 'deluxe',
      name: 'Deluxe',
      rate: '12.50% taxa',
      benefits: ['Exposição Máxima', 'Topo da Categoria', 'Email Marketing']
    },
  ];

  const selectedModel = salesModels.find(m => m.id === formState.salesModelId);
  const inventoryCount = parseInventoryItems(inventoryPayload).length;
  const isDynamic = selectedModel?.slug?.includes('dinam');

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
                    <Select
                      value={formState.categoryId || ''}
                      onChange={(e) => setFormState(prev => ({ ...prev, categoryId: e.target.value, categoryGroupId: '', categorySectionId: '' }))}
                      className="h-14 rounded-2xl border-slate-200 bg-slate-50 font-bold text-slate-700 hover:bg-slate-100 focus:border-meow-300"
                    >
                      <option value="">Selecione...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </Select>
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

                  <div className="grid gap-8 md:grid-cols-2">
                    {/* Price */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-400">VALOR (BRL)</label>
                      <div className="relative">
                        <Input
                          value={priceInput}
                          onChange={(e) => {
                            setPriceInput(e.target.value);
                            setFormState(prev => ({ ...prev, priceCents: parsePriceToCents(e.target.value) }));
                          }}
                          placeholder="R$ 0,00"
                          className="h-14 rounded-xl border-slate-200 bg-slate-50 pl-4 text-xl font-bold text-slate-800 focus:border-meow-300 focus:ring-4 focus:ring-meow-red/10"
                        />
                      </div>
                    </div>

                    {/* Stock */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-400">ESTOQUE</label>
                      <Input
                        value={autoDelivery ? (isDynamic ? inventoryCount : 1) : 1}
                        readOnly
                        className="h-14 rounded-xl border-slate-200 bg-slate-50 pl-4 text-xl font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Auto Delivery Input */}
                  <div className="rounded-2xl bg-emerald-50/50 border border-emerald-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-sm">
                          <Zap size={16} fill="currentColor" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">Entrega Automática</h4>
                          <p className="text-xs text-slate-500 font-bold">O sistema entrega o produto assim que o pagamento for aprovado.</p>
                        </div>
                      </div>
                      <Toggle
                        checked={autoDelivery}
                        onCheckedChange={setAutoDelivery}
                        className="data-[state=on]:bg-meow-500"
                      />
                    </div>

                    {autoDelivery && (
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
              loading={busyAction === 'publish'}
              className="relative translate-y-0" // Reset fixed pos if needed, but ActionBar handles it
              leftContent={
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total à receber (aprox.)</span>
                  <span className="text-xl font-black text-meow-deep">
                    {(() => {
                      const feeMap: Record<string, number> = {
                        padrao: 0.10,
                        premium: 0.115,
                        deluxe: 0.125,
                      };
                      const fee = feeMap[listingType] || 0.10;
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
              />

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
