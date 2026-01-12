
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Copy,
  Image as ImageIcon,
  CheckCircle,
  Crown,
  Heart,
  MessageSquare,
  MessageCircle,
  MoreHorizontal,
  Smile,
  ShieldCheck,
  Star,
  Trophy,
  UserPlus,
  Zap,
  BadgeCheck,
} from 'lucide-react';

import { publicProfilesApi, type PublicProfile } from '../../lib/public-profiles-api';
import {
  publicReviewsApi,
  type PublicReview,
  type ReviewDistribution,
} from '../../lib/public-reviews-api';
import { fetchPublicListings, type PublicListing } from '../../lib/marketplace-public';
import { StoreListingCard } from '../profile/store-listing-card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

type ProfileHeaderCardProps = {
  profile: PublicProfile;
  yearLabel: string;
  ratingLabel: string;
  salesLabel: string | null;
  viewsLabel: string | null;
};

type ProfileTabsProps = {
  activeTab: string;
  onChange: (tab: string) => void;
  communityCount?: number;
};

type TrustSealsCardProps = {
  trustSeals: PublicProfile['trustSeals'];
};

type PerformanceCardProps = {
  levelLabel: string;
};

type MedalsCardProps = {
  levelLabel: string;
};

type SkeletonProfileProps = {
  sidebarOnly?: boolean;
};

type ReviewsState = {
  status: 'loading' | 'ready' | 'error';
  items: PublicReview[];
  total: number;
  ratingAverage: number;
  distribution: ReviewDistribution | null;
  error?: string;
};

type CommunityPost = {
  id: string;
  author: string;
  time: string;
  title?: string;
  content: string;
  coupon?: string;
  pinned?: boolean;
  likes: number;
  comments: number;
  reposts: number;
};

const formatRelativeTime = (value: string) => {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `Ha ${minutes || 1} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Ha ${hours} horas`;
  const days = Math.floor(hours / 24);
  return `Ha ${days} dias`;
};

const initialPosts: CommunityPost[] = [
  {
    id: 'post-1',
    author: 'Vexy Store',
    time: 'Ha 2 horas',
    title: 'PROMOCAO RELAMPAGO!',
    content:
      'Acabamos de repor o estoque de contas Unranked de LoL. Quem comprar nas proximas 2 horas ganha um brinde surpresa na entrega!',
    coupon: 'VEXY10OFF',
    pinned: true,
    likes: 124,
    comments: 12,
    reposts: 5,
  },
];

const categoryPills = [
  { label: 'Todos', value: 'todos' },
  { label: 'League of Legends', value: 'league-of-legends' },
  { label: 'Valorant', value: 'valorant' },
  { label: 'Steam', value: 'steam' },
];
const ProfileHeaderCard = ({
  profile,
  yearLabel,
  ratingLabel,
  salesLabel,
  viewsLabel,
}: ProfileHeaderCardProps) => (
  <Card className="-mt-16 rounded-[28px] border border-slate-100 bg-white p-6 shadow-card">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 overflow-hidden rounded-[24px] bg-slate-100">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-2xl font-bold text-slate-400">
              {profile.displayName.slice(0, 2).toUpperCase()}
            </div>
          )}
          {profile.isOnline ? (
            <span className="absolute bottom-2 right-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              Online
            </span>
          ) : null}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black text-meow-charcoal">{profile.displayName}</h1>
            {profile.isVerified ? <Badge variant="info">Verificado</Badge> : null}
            {profile.isPremium ? <Badge variant="warning">Premium</Badge> : null}
          </div>
          <p className="text-sm text-meow-muted">
            {profile.handle} - Membro desde {yearLabel}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-meow-charcoal">
              <Star size={16} className="text-amber-400" aria-hidden />
              <span className="font-semibold">{ratingLabel}</span>
              <span className="text-xs text-meow-muted">Reputacao</span>
            </div>
            {salesLabel ? (
              <div className="text-meow-charcoal">
                <span className="font-semibold">{salesLabel}</span>{' '}
                <span className="text-xs text-meow-muted">Vendas</span>
              </div>
            ) : null}
            {viewsLabel ? (
              <div className="text-meow-charcoal">
                <span className="font-semibold">{viewsLabel}</span>{' '}
                <span className="text-xs text-meow-muted">Views</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" className="rounded-full gap-2">
          <UserPlus size={14} aria-hidden />
          Seguir
        </Button>
        <Button variant="secondary" size="sm" className="rounded-full gap-2">
          <MessageCircle size={14} aria-hidden />
          Chat
        </Button>
        <Button variant="secondary" size="icon" className="rounded-full">
          <MoreHorizontal size={16} aria-hidden />
        </Button>
      </div>
    </div>
  </Card>
);

const ProfileTabs = ({ activeTab, onChange, communityCount = 2 }: ProfileTabsProps) => (
  <div className="rounded-[20px] border border-slate-100 bg-white p-2 shadow-card">
    <div className="grid gap-2 sm:grid-cols-3">
      {[
        { key: 'produtos', label: 'Produtos' },
        { key: 'comunidade', label: 'Comunidade', badge: communityCount },
        { key: 'avaliacoes', label: 'Avaliacoes' },
      ].map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-bold transition ${
            activeTab === tab.key
              ? 'border border-rose-200 bg-rose-50 text-rose-600'
              : 'border border-transparent bg-slate-50 text-meow-muted hover:bg-slate-100'
          }`}
        >
          {tab.label}
          {tab.badge ? (
            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
              {tab.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  </div>
);

const TrustSealsCard = ({ trustSeals }: TrustSealsCardProps) => (
  <Card className="rounded-[24px] border border-slate-100 p-5 shadow-card">
    <div className="flex items-center gap-2 text-sm font-bold uppercase text-meow-muted">
      <ShieldCheck size={16} aria-hidden />
      Selos de confianca
    </div>
    <div className="mt-4 space-y-3">
      {[
        { label: 'Identidade (CPF)', active: trustSeals.cpfVerified, icon: <BadgeCheck size={16} /> },
        { label: 'E-mail', active: trustSeals.emailVerified, icon: <CheckCircle size={16} /> },
        { label: 'Telefone (+55)', active: trustSeals.phoneVerified, icon: <ShieldCheck size={16} /> },
      ].map((seal) => (
        <div
          key={seal.label}
          className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm text-meow-charcoal"
        >
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-meow-deep">
              {seal.icon}
            </span>
            {seal.label}
          </div>
          <CheckCircle
            size={16}
            className={seal.active ? 'text-emerald-500' : 'text-slate-300'}
            aria-hidden
          />
        </div>
      ))}
    </div>
  </Card>
);

const PerformanceCard = ({ levelLabel }: PerformanceCardProps) => (
  <Card className="rounded-[24px] border border-slate-100 p-5 shadow-card">
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-bold uppercase text-meow-muted">Performance</h2>
      <Trophy size={16} className="text-meow-deep" aria-hidden />
    </div>
    <div className="mt-4 space-y-3 text-xs text-meow-muted">
      <div>
        <div className="flex items-center justify-between">
          <span>Tempo de resposta</span>
          <span className="font-semibold text-emerald-600">~5 min</span>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
          <div className="h-2 w-[88%] rounded-full bg-emerald-400" />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <span>Entrega no prazo</span>
          <span className="font-semibold text-pink-500">99,8%</span>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
          <div className="h-2 w-[95%] rounded-full bg-pink-400" />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <span>Nivel de vendedor</span>
          <span className="font-semibold text-purple-500">{levelLabel}</span>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
          <div className="h-2 w-[70%] rounded-full bg-purple-400" />
        </div>
      </div>
    </div>
  </Card>
);

const MedalsCard = ({ levelLabel }: MedalsCardProps) => (
  <Card className="rounded-[24px] border border-slate-100 p-5 shadow-card">
    <h2 className="text-sm font-bold uppercase text-meow-muted">Medalhas</h2>
    <div className="mt-4 grid grid-cols-4 gap-3">
      {[
        { icon: <Trophy size={18} aria-hidden />, tone: 'bg-amber-50 text-amber-500' },
        { icon: <ShieldCheck size={18} aria-hidden />, tone: 'bg-blue-50 text-blue-500' },
        { icon: <Zap size={18} aria-hidden />, tone: 'bg-emerald-50 text-emerald-500' },
        { icon: <Crown size={18} aria-hidden />, tone: 'bg-purple-50 text-purple-500' },
        { icon: <Star size={18} aria-hidden />, tone: 'bg-rose-50 text-rose-500' },
      ].map((badge, index) => (
        <div
          key={`${badge.tone}-${index}`}
          className={`grid h-12 w-12 place-items-center rounded-2xl ${badge.tone}`}
          aria-label={levelLabel}
        >
          {badge.icon}
        </div>
      ))}
    </div>
  </Card>
);

const SkeletonProfile = ({ sidebarOnly }: SkeletonProfileProps) => (
  <div className={`grid gap-6 ${sidebarOnly ? '' : 'lg:grid-cols-[320px_minmax(0,1fr)]'}`}>
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-36 rounded-[24px] border border-slate-100 bg-slate-50" />
      ))}
    </div>
    {!sidebarOnly ? (
      <div className="space-y-4">
        <div className="h-14 rounded-[20px] border border-slate-100 bg-slate-50" />
        <div className="h-64 rounded-[24px] border border-slate-100 bg-slate-50" />
      </div>
    ) : null}
  </div>
);
export const PublicProfileContent = ({ profileId }: { profileId: string }) => {
  const [profileState, setProfileState] = useState<{
    status: 'loading' | 'ready' | 'error';
    profile: PublicProfile | null;
    error?: string;
  }>({ status: 'loading', profile: null });
  const [activeTab, setActiveTab] = useState('produtos');
  const [activeCategory, setActiveCategory] = useState('todos');
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [listingsStatus, setListingsStatus] = useState<'loading' | 'ready'>('loading');
  const [composerText, setComposerText] = useState('');
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts);
  const [reviewsState, setReviewsState] = useState<ReviewsState>({
    status: 'loading',
    items: [],
    total: 0,
    ratingAverage: 0,
    distribution: null,
  });

  useEffect(() => {
    let active = true;
    setProfileState({ status: 'loading', profile: null });
    publicProfilesApi
      .getProfile(profileId)
      .then((profile) => {
        if (!active) return;
        setProfileState({ status: 'ready', profile });
      })
      .catch((error: Error) => {
        if (!active) return;
        setProfileState({
          status: 'error',
          profile: null,
          error: error.message || 'Nao foi possivel carregar o perfil.',
        });
      });
    return () => {
      active = false;
    };
  }, [profileId]);

  useEffect(() => {
    if (profileState.profile?.role === 'USER' || !profileState.profile?.id) {
      return;
    }
    let active = true;
    setListingsStatus('loading');
    const categoryFilter = activeCategory === 'todos' ? undefined : activeCategory;
    fetchPublicListings({
      take: 9,
      seller: profileState.profile.id,
      category: categoryFilter,
    })
      .then((response) => {
        if (!active) return;
        const normalized = categoryFilter
          ? response.listings.filter((listing) => {
              const slug = listing.categorySlug ?? '';
              const label = listing.categoryLabel ?? '';
              const normalizedLabel = label.toLowerCase().replace(/\s+/g, '-');
              return slug === categoryFilter || normalizedLabel === categoryFilter;
            })
          : response.listings;
        setListings(normalized);
        setListingsStatus('ready');
      })
      .catch(() => {
        if (!active) return;
        setListings([]);
        setListingsStatus('ready');
      });
    return () => {
      active = false;
    };
  }, [activeCategory, profileState.profile?.id, profileState.profile?.role]);

  useEffect(() => {
    if (activeTab !== 'avaliacoes' || profileState.profile?.role === 'USER') {
      return;
    }
    if (!profileState.profile?.id) {
      return;
    }
    let active = true;
    setReviewsState((prev) => ({ ...prev, status: 'loading', error: undefined }));
    publicReviewsApi
      .listSellerReviews(profileState.profile.id, 0, 10)
      .then((response) => {
        if (!active) return;
        setReviewsState({
          status: 'ready',
          items: response.items,
          total: response.total,
          ratingAverage: response.ratingAverage,
          distribution: response.distribution,
        });
      })
      .catch((error: Error) => {
        if (!active) return;
        setReviewsState({
          status: 'error',
          items: [],
          total: 0,
          ratingAverage: 0,
          distribution: null,
          error: error.message || 'Nao foi possivel carregar as avaliacoes.',
        });
      });
    return () => {
      active = false;
    };
  }, [activeTab, profileState.profile?.id, profileState.profile?.role]);

  const showTabs = profileState.profile?.role !== 'USER';

  const handleLabel = useMemo(() => {
    if (!profileState.profile) return '@-';
    const handle = profileState.profile.handle;
    return handle.startsWith('@') ? handle : `@${handle}`;
  }, [profileState.profile]);

  if (profileState.status === 'loading') {
    return (
      <section className="bg-gradient-to-b from-rose-100/60 via-white to-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] space-y-6">
          <div className="h-32 rounded-[32px] bg-rose-100" />
          <SkeletonProfile />
        </div>
      </section>
    );
  }

  if (profileState.status === 'error' || !profileState.profile) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-rose-200 bg-rose-50 px-6 py-6 text-sm text-rose-600">
          {profileState.error || 'Nao foi possivel carregar o perfil.'}
        </div>
      </section>
    );
  }

  const profile = profileState.profile;
  const yearLabel = new Date(profile.createdAt).getFullYear().toString();
  const ratingLabel = profile.stats.ratingAverage.toFixed(1);
  const formatCompact = (value: number) =>
    new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(
      value,
    );
  const salesLabel = profile.role === 'USER' ? null : formatCompact(profile.stats.salesCount);
  const viewsLabel =
    profile.role === 'USER'
      ? null
      : profile.stats.viewsCount
        ? formatCompact(profile.stats.viewsCount)
        : '-';
  const aboutTitle = profile.role === 'USER' ? 'Sobre o perfil' : 'Sobre a loja';
  const aboutText = profile.bio
    ? profile.bio
    : profile.role === 'USER'
      ? 'Perfil publico do cliente na Meoww.'
      : 'Especialista em contas de jogos, entregas rapidas e suporte dedicado.';

  return (
    <section className="bg-gradient-to-b from-rose-100/60 via-white to-white px-6 py-12">
      <div className="mx-auto w-full max-w-[1200px] space-y-6">
        <div className="relative">
          <div className="h-32 rounded-[32px] bg-gradient-to-r from-rose-500 to-fuchsia-500">
            <div className="h-full w-full rounded-[32px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.4),_transparent_60%)]" />
          </div>
          <ProfileHeaderCard
            profile={{ ...profile, handle: handleLabel }}
            yearLabel={yearLabel}
            ratingLabel={ratingLabel}
            salesLabel={salesLabel}
            viewsLabel={viewsLabel}
          />
        </div>

        {showTabs ? (
          <ProfileTabs activeTab={activeTab} onChange={setActiveTab} communityCount={2} />
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4">
            <Card className="rounded-[24px] border border-slate-100 p-5 shadow-card">
              <h2 className="text-sm font-bold uppercase text-meow-muted">{aboutTitle}</h2>
              <p className="mt-3 text-sm text-meow-muted">{aboutText}</p>
              {profile.role !== 'USER' ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {['LoL', 'Valorant', 'Fortnite', 'Steam'].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-meow-50 px-3 py-1 text-xs font-semibold text-meow-deep"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </Card>

            {profile.role !== 'USER' ? (
              <>
                <PerformanceCard levelLabel="Lvl. 42" />
                <MedalsCard levelLabel="Lvl. 42" />
              </>
            ) : null}

            <TrustSealsCard trustSeals={profile.trustSeals} />
          </div>

          <div className="space-y-4">
            {!showTabs ? (
              <Card className="rounded-[24px] border border-slate-100 p-6 shadow-card">
                <h3 className="text-base font-bold text-meow-charcoal">Avaliacoes recebidas</h3>
                <p className="mt-2 text-sm text-meow-muted">
                  Este perfil ainda nao possui avaliacoes publicas.
                </p>
              </Card>
            ) : null}

            {showTabs && activeTab === 'produtos' ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {categoryPills.map((pill) => {
                    const isActive = activeCategory === pill.value;
                    return (
                      <button
                        key={pill.value}
                        type="button"
                        onClick={() => setActiveCategory(pill.value)}
                        className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                          isActive
                            ? 'bg-rose-500 text-white shadow-cute'
                            : 'border border-slate-200 bg-white text-meow-muted hover:border-slate-300'
                        }`}
                      >
                        {pill.label}
                      </button>
                    );
                  })}
                </div>

                {listingsStatus === 'loading' ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-60 rounded-[22px] border border-slate-100 bg-slate-50"
                      />
                    ))}
                  </div>
                ) : null}

                {listingsStatus === 'ready' && listings.length === 0 ? (
                  <Card className="rounded-[24px] border border-slate-100 p-6 text-sm text-meow-muted shadow-card">
                    Nenhum produto encontrado.
                  </Card>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {listings.map((listing) => (
                    <StoreListingCard
                      key={listing.id}
                      id={listing.id}
                      title={listing.title}
                      image={listing.media?.[0]?.url ?? '/assets/meoow/highlight-01.webp'}
                      badge={listing.categoryLabel ?? listing.categorySlug ?? 'Produto'}
                      isAuto={listing.deliveryType === 'AUTO'}
                      href={`/anuncios/${listing.id}`}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            {showTabs && activeTab === 'comunidade' ? (
              <div className="space-y-4">
                <Card className="rounded-[24px] border border-slate-100 p-4 shadow-card">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-full bg-meow-100">
                      {profile.avatarUrl ? (
                        <img
                          src={profile.avatarUrl}
                          alt={profile.displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-sm font-bold text-slate-400">
                          {profile.displayName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <textarea
                        className="h-16 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-meow-charcoal outline-none"
                        placeholder="Postar atualizacao para os seguidores..."
                        value={composerText}
                        onChange={(event) => setComposerText(event.target.value)}
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-meow-muted">
                          <button type="button" className="rounded-full bg-slate-100 p-2">
                            <ImageIcon size={16} aria-hidden />
                          </button>
                          <button type="button" className="rounded-full bg-slate-100 p-2">
                            <Smile size={16} aria-hidden />
                          </button>
                        </div>
                        <Button
                          size="sm"
                          className="rounded-full"
                          type="button"
                          onClick={() => {
                            const content = composerText.trim();
                            if (!content) return;
                            setPosts((prev) => [
                              {
                                id: `post-${Date.now()}`,
                                author: profile.displayName,
                                time: 'Agora',
                                content,
                                likes: 0,
                                comments: 0,
                                reposts: 0,
                              },
                              ...prev,
                            ]);
                            setComposerText('');
                          }}
                        >
                          Postar
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

                {posts.map((post) => (
                  <Card
                    key={post.id}
                    className="relative overflow-hidden rounded-[24px] border border-slate-100 p-5 shadow-card"
                  >
                    <span className="absolute left-0 top-0 h-full w-1 bg-rose-500" />
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-meow-100">
                        {profile.avatarUrl ? (
                          <img
                            src={profile.avatarUrl}
                            alt={post.author}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-sm font-bold text-slate-400">
                            {post.author.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-meow-charcoal">
                          {post.author}
                          {post.pinned ? (
                            <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-bold text-pink-600">
                              FIXADO
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-meow-muted">{post.time}</p>
                      </div>
                    </div>
                    {post.title ? (
                      <h3 className="mt-4 text-sm font-bold text-pink-600">{post.title}</h3>
                    ) : null}
                    <p className="mt-2 text-sm text-meow-muted">{post.content}</p>
                    {post.coupon ? (
                      <Card className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 shadow-none">
                        <div className="flex items-center justify-between text-sm">
                          <div>
                            <p className="text-xs text-meow-muted">CUPOM ATIVO</p>
                            <p className="text-base font-bold text-meow-charcoal">{post.coupon}</p>
                          </div>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 text-xs font-bold text-pink-500"
                            onClick={() => navigator.clipboard?.writeText(post.coupon ?? '')}
                          >
                            <Copy size={14} aria-hidden />
                            Copiar
                          </button>
                        </div>
                      </Card>
                    ) : null}
                    <div className="mt-4 flex items-center gap-6 text-xs text-meow-muted">
                      <span className="inline-flex items-center gap-1">
                        <Heart size={12} aria-hidden />
                        {post.likes}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare size={12} aria-hidden />
                        {post.comments}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Zap size={12} aria-hidden />
                        {post.reposts}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            ) : null}

            {showTabs && activeTab === 'avaliacoes' ? (
              <div className="space-y-4">
                {reviewsState.status === 'loading' ? (
                  <div className="space-y-4">
                    <div className="h-36 rounded-[24px] border border-slate-100 bg-rose-50" />
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-32 rounded-[24px] border border-slate-100 bg-slate-50"
                      />
                    ))}
                  </div>
                ) : null}

                {reviewsState.status === 'error' ? (
                  <Card className="rounded-[24px] border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600 shadow-card">
                    {reviewsState.error || 'Nao foi possivel carregar as avaliacoes.'}
                  </Card>
                ) : null}

                {reviewsState.status === 'ready' && reviewsState.total === 0 ? (
                  <Card className="rounded-[24px] border border-slate-100 p-6 text-sm text-meow-muted shadow-card">
                    Nenhuma avaliacao encontrada.
                  </Card>
                ) : null}

                {reviewsState.status === 'ready' && reviewsState.total > 0 ? (
                  <>
                    <Card className="rounded-[24px] border border-slate-100 bg-gradient-to-r from-rose-500 to-pink-500 p-6 text-white shadow-card">
                      <div className="grid gap-6 md:grid-cols-[200px_minmax(0,1fr)]">
                        <div>
                          <div className="text-4xl font-black">
                            {reviewsState.ratingAverage.toFixed(1)}
                          </div>
                          <div className="mt-2 flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <Star key={index} size={16} className="text-amber-200" aria-hidden />
                            ))}
                          </div>
                          <p className="mt-2 text-xs text-white/80">
                            Baseado em {reviewsState.total} avaliacoes
                          </p>
                        </div>
                        <div className="space-y-2">
                          {[5, 4, 3, 2, 1].map((stars) => {
                            const distribution = reviewsState.distribution;
                            const count = distribution ? distribution[stars as 1 | 2 | 3 | 4 | 5] : 0;
                            const percent = reviewsState.total
                              ? Math.round((count / reviewsState.total) * 100)
                              : 0;
                            return (
                              <div
                                key={stars}
                                className="flex items-center gap-2 text-xs text-white/90"
                              >
                                <span className="w-4 text-right">{stars}</span>
                                <Star size={12} className="text-amber-200" aria-hidden />
                                <div className="h-2 flex-1 rounded-full bg-white/20">
                                  <div
                                    className="h-2 rounded-full bg-white"
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </Card>

                    <div className="space-y-4">
                      {reviewsState.items.map((review) => (
                        <Card
                          key={`${review.buyerDisplayName}-${review.createdAt}`}
                          className="rounded-[24px] border border-slate-100 p-5 shadow-card"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 overflow-hidden rounded-full bg-meow-100">
                                {review.buyerAvatarUrl ? (
                                  <img
                                    src={review.buyerAvatarUrl}
                                    alt={review.buyerDisplayName}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="grid h-full w-full place-items-center text-sm font-bold text-slate-400">
                                    {review.buyerDisplayName.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-meow-charcoal">
                                  {review.buyerDisplayName}
                                </p>
                                <div className="flex items-center gap-1 text-xs text-amber-400">
                                  {Array.from({ length: review.rating }).map((_, index) => (
                                    <Star key={index} size={12} aria-hidden />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <span className="text-xs text-meow-muted">
                              {formatRelativeTime(review.createdAt)}
                            </span>
                          </div>
                          <p className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-meow-muted">
                            {review.comment}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                            {review.verifiedPurchase ? (
                              <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-600">
                                COMPRA VERIFICADA
                              </span>
                            ) : null}
                            <span className="text-meow-muted">
                              PRODUTO:{' '}
                              <strong className="text-meow-charcoal">{review.productTitle}</strong>
                            </span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="text-center text-xs text-meow-muted">
          <Link href="/produtos" className="font-semibold text-meow-deep">
            Ver loja completa
          </Link>
        </div>
      </div>
    </section>
  );
};
