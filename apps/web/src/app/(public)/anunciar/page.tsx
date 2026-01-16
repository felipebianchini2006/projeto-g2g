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
function FormSection({ title, icon: Icon, children, className = '' }: { title: string, icon?: React.ElementType, children: React.ReactNode, className?: string }) {
  return (
    <div className={`rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md md:p-8 ${className}`}>
      <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700">
            <Icon size={20} />
          </div>
        )}
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
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
  const [listingType, setListingType] = useState('diamante');

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
      setFormState(prev => ({ ...prev, salesModelId: normal.id }));
    }
  }, [salesModels, formState.salesModelId]);

  useEffect(() => {
    if (origins.length > 0 && !formState.originId) setFormState(prev => ({ ...prev, originId: origins[0].id }));
    if (recoveryOptions.length > 0 && !formState.recoveryOptionId) setFormState(prev => ({ ...prev, recoveryOptionId: recoveryOptions[0].id }));
  }, [origins, recoveryOptions, formState.originId, formState.recoveryOptionId]);

  useEffect(() => {
    if (groups.length > 0 && !groups.some(g => g.id === formState.categoryGroupId)) {
      setFormState(prev => ({ ...prev, categoryGroupId: groups[0].id }));
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
        prata: 1000,
        ouro: 1200,
        diamante: 1800,
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

      router.push('/conta/anuncios');
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
    { id: 'prata', name: 'Prata', rate: 'Taxa de 10%', benefits: ['Anúncio Padrão', 'Taxa reduzida'] },
    { id: 'ouro', name: 'Ouro', rate: 'Taxa de 12%', benefits: ['Destaque na Home', 'Mais Visibilidade'] },
    { id: 'diamante', name: 'Diamante', rate: 'Taxa de 18%', benefits: ['Anúncio Diamante', 'Destaque na página principal', 'Destaque nas pesquisas', 'Máxima visibilidade'] },
  ];

  const selectedModel = salesModels.find(m => m.id === formState.salesModelId);
  const inventoryCount = parseInventoryItems(inventoryPayload).length;
  const isDynamic = selectedModel?.slug?.includes('dinam');

  if (!user) return <div className="p-8 text-center text-slate-500">Faça login para anunciar.</div>; // Simplified auth guard

  return (
    <div className="min-h-screen bg-slate-50/50 pb-32 pt-6 antialiased">
      <div className="mx-auto max-w-[1000px] px-4 lg:px-6">

        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-800">
              <Box size={24} />
              <h1 className="text-2xl font-black tracking-tight">Anúncio</h1>
            </div>
            <p className="mt-1 text-sm font-medium text-slate-500">Status atual: <span className="text-slate-400">Rascunho</span></p>
          </div>
          {error && (
            <div className="hidden items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600 md:flex animate-in fade-in slide-in-from-right-4">
              <AlertCircle size={16} /> {error}
            </div>
          )}
        </header>

        <form className="space-y-6" onSubmit={e => e.preventDefault()}>

          {/* 1. Title */}
          <FormTitleSection
            value={formState.title}
            onChange={val => setFormState(prev => ({ ...prev, title: val }))}
          />

          {/* 2. Model */}
          {modelOptions.length > 0 ? (
            <ModelSelector
              options={modelOptions}
              selected={formState.salesModelId}
              onChange={id => setFormState(prev => ({ ...prev, salesModelId: id }))}
            />
          ) : (
            <div className="h-32 rounded-2xl border border-slate-100 bg-white p-6 text-center text-slate-400">Carregando modelos...</div>
          )}

          {/* 3. Items / Inventory (Dynamic or Manual) */}
          {isDynamic && (
            <div className="rounded-[24px] border border-meow-200 bg-meow-50/30 p-6 md:p-8">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-meow-500" />
                  <h3 className="text-lg font-bold text-slate-800">Itens do anúncio dinâmico</h3>
                </div>
              </div>

              {/* Simplified Dynamic Item Input (using textarea for payload as requested/compatible) */}
              <div className="relative">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Lista de Itens (Um por linha)</p>
                <Textarea
                  value={inventoryPayload}
                  onChange={(e) => setInventoryPayload(e.target.value)}
                  placeholder="Item #1 | Descrição do item&#10;Item #2 | Descrição do item"
                  className="min-h-[160px] rounded-2xl border-slate-200 bg-white font-mono text-sm shadow-sm focus:border-meow-300"
                />
                <div className="mt-2 flex justify-end">
                  <span className="rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-slate-500 shadow-sm border border-slate-100">
                    {inventoryCount} itens detectados
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 4. Price & Stock & Details */}
          <div className="bg-white p-6 shadow-sm rounded-[24px] border border-slate-100 md:p-8">
            <div className="grid gap-8 md:grid-cols-2">

              {/* Price */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700">Valor do anúncio</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</span>
                  <Input
                    value={priceInput}
                    onChange={(e) => {
                      setPriceInput(e.target.value);
                      setFormState(prev => ({ ...prev, priceCents: parsePriceToCents(e.target.value) }));
                    }}
                    placeholder="0,00"
                    className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-10 text-lg font-bold text-slate-800 focus:border-meow-300 focus:ring-4 focus:ring-meow-red/10"
                  />
                </div>
              </div>

              {/* Stock */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-slate-700">Quantidade em estoque</label>
                  <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1">
                    <span className="text-[10px] font-bold text-slate-400">ENTREGA AUTO</span>
                    <Toggle
                      checked={autoDelivery}
                      onCheckedChange={setAutoDelivery}
                      disabled={false}
                      className="h-5 w-9 data-[state=on]:bg-meow-500"
                    />
                  </div>
                </div>
                <Input
                  value={autoDelivery ? inventoryCount : 'Estoque Manual'}
                  readOnly
                  className="h-12 rounded-xl border-slate-200 bg-slate-100 font-bold text-slate-500"
                />
              </div>
            </div>

            {!isDynamic && autoDelivery && (
              <div className="mt-6 border-t border-slate-100 pt-6">
                <div className="flex items-center gap-2 mb-2 text-emerald-600">
                  <Zap size={16} fill="currentColor" />
                  <span className="text-xs font-bold uppercase">Conteúdo para Entrega Automática</span>
                </div>
                <Textarea
                  value={inventoryPayload}
                  onChange={e => setInventoryPayload(e.target.value)}
                  placeholder="Cole aqui o conteúdo que será entregue (login:senha, keys, links)..."
                  className="min-h-[100px] rounded-xl border-slate-200 bg-slate-50 font-mono text-sm"
                />
              </div>
            )}
          </div>

          {/* 5. Tipo de Anúncio */}
          <FormSection title="Tipo de Anúncio" icon={Box}>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Qual o tipo do anúncio?</label>
                <Select
                  value={formState.categoryId}
                  onChange={(e) => setFormState(prev => ({ ...prev, categoryId: e.target.value, categoryGroupId: '', categorySectionId: '' }))}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50 font-medium text-slate-700 hover:bg-slate-100 focus:border-meow-300"
                >
                  <option value="">Selecione</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Procedência</label>
                <Select
                  value={formState.originId}
                  onChange={(e) => setFormState(prev => ({ ...prev, originId: e.target.value }))}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50 font-medium text-slate-700 hover:bg-slate-100 focus:border-meow-300"
                >
                  <option value="">Selecione</option>
                  {origins.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Informações da conta</label>
                <Select
                  value={formState.recoveryOptionId}
                  onChange={(e) => setFormState(prev => ({ ...prev, recoveryOptionId: e.target.value }))}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50 font-medium text-slate-700 hover:bg-slate-100 focus:border-meow-300"
                >
                  <option value="">Selecione</option>
                  {recoveryOptions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </Select>
              </div>
            </div>
          </FormSection>

          {/* 6. Categoria */}
          <FormSection title="Categoria" icon={Gamepad2}>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Categoria</label>
                <Select
                  value={formState.categoryId}
                  onChange={(e) => setFormState(prev => ({ ...prev, categoryId: e.target.value, categoryGroupId: '', categorySectionId: '' }))}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50 font-medium text-slate-700 hover:bg-slate-100 focus:border-meow-300"
                >
                  <option value="">Selecione</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Subcategoria</label>
                <Select
                  value={formState.categoryGroupId}
                  onChange={(e) => setFormState(prev => ({ ...prev, categoryGroupId: e.target.value, categorySectionId: '' }))}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50 font-medium text-slate-700 hover:bg-slate-100 focus:border-meow-300"
                >
                  <option value="">Selecione</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Seção</label>
                <Select
                  value={formState.categorySectionId}
                  onChange={(e) => setFormState(prev => ({ ...prev, categorySectionId: e.target.value }))}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50 font-medium text-slate-700 hover:bg-slate-100 focus:border-meow-300"
                >
                  <option value="">Selecione</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </div>
            </div>
          </FormSection>

          {/* 7. Description */}
          <ListingDescriptionField
            value={formState.description}
            onChange={val => setFormState(prev => ({ ...prev, description: val }))}
          />

          {/* 8. Images */}
          <ImageUploader
            files={mediaFiles}
            onFilesChange={setMediaFiles}
          />

          {/* 9. Ad Tier */}
          <AdTierSelector
            tiers={tierOptions}
            selected={listingType}
            onChange={setListingType}
          />

          {/* Terms Checkbox */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-meow-50">
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsAccepted}
                  onChange={e => setTermsAccepted(e.target.checked)}
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-slate-300 bg-white checked:border-meow-500 checked:bg-meow-500 transition-all"
                />
                <div className="pointer-events-none absolute h-5 w-5 opacity-0 peer-checked:opacity-100 text-white flex items-center justify-center">
                  <Box size={14} fill="currentColor" />
                </div>
              </div>
              <label htmlFor="terms" className="cursor-pointer text-sm text-slate-600 leading-relaxed">
                Declaro que li e estou de acordo com os <Link href="/termos" className="font-bold text-meow-600 hover:underline">Termos de Uso</Link> e a <Link href="/politica" className="font-bold text-meow-600 hover:underline">Política de Anúncios</Link> da Meoww. Entendo que meu anúncio passará por uma análise de qualidade.
              </label>
            </div>
          </div>
        </form>

        {/* Floating Action Bar */}
        <ActionBar
          onNext={handlePublish}
          nextLabel="Publicar Anúncio"
          loading={busyAction === 'publish'}
          leftContent={
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total à receber (aprox.)</span>
              <span className="text-xl font-black text-meow-deep">
                {(() => {
                  const feeMap: Record<string, number> = {
                    prata: 0.10,
                    ouro: 0.12,
                    diamante: 0.18,
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
    </div>
  );
}
