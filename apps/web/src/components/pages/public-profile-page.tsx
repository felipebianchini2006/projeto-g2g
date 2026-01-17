
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  Copy,
  Image as ImageIcon,
  CheckCircle,
  Crown,
  Heart,
  MessageSquare,
  MessageCircle,
  MoreHorizontal,
  ShieldCheck,
  Star,
  Trophy,
  UserPlus,
  Zap,
  BadgeCheck,
  X,
  Trash2,
  Flag,
} from 'lucide-react';

import { communityApi } from '../../lib/community-api';
import { directChatApi } from '../../lib/direct-chat-api';
import {
  publicCommunityApi,
  type CommunityCommentPublic,
  type CommunityPostPublic,
} from '../../lib/public-community-api';
import { publicProfilesApi, type PublicProfile } from '../../lib/public-profiles-api';
import {
  publicReviewsApi,
  type PublicReview,
  type ReviewDistribution,
} from '../../lib/public-reviews-api';
import { fetchPublicListings, type PublicListing } from '../../lib/marketplace-public';
import { usersApi } from '../../lib/users-api';
import { useAuth } from '../auth/auth-provider';
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
  canFollow: boolean;
  isOwner: boolean;
  followLoading: boolean;
  isFollowing: boolean;
  onToggleFollow: () => void;
  canChat: boolean;
  chatLoading: boolean;
  onChat: () => void;
};

type ProfileTabsProps = {
  activeTab: string;
  onChange: (tab: string) => void;
  communityCount?: number;
};

type TrustSealsCardProps = {
  trustSeals: PublicProfile['trustSeals'];
};

type PerformanceCardProps = {};

type MedalsCardProps = {};

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

type PostsState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: CommunityPostPublic[];
  total: number;
  error?: string;
};

type CommentsState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: CommunityCommentPublic[];
  total: number;
  error?: string;
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
  canFollow,
  isOwner,
  followLoading,
  isFollowing,
  onToggleFollow,
  canChat,
  chatLoading,
  onChat,
}: ProfileHeaderCardProps) => (
  <Card className="-mt-16 rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
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
        {canFollow ? (
          <Button
            size="sm"
            className="rounded-full gap-2"
            disabled={followLoading}
            onClick={onToggleFollow}
          >
            <UserPlus size={14} aria-hidden />
            {isFollowing ? 'Seguindo' : 'Seguir'}
          </Button>
        ) : !isOwner ? (
          <Link
            href="/login"
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-meow-charcoal"
          >
            Entrar para seguir
          </Link>
        ) : null}
        {canChat ? (
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full gap-2"
            disabled={chatLoading}
            onClick={onChat}
          >
            <MessageCircle size={14} aria-hidden />
            {chatLoading ? 'Abrindo...' : 'Chat'}
          </Button>
        ) : !isOwner ? (
          <Link
            href="/login"
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-meow-charcoal"
          >
            Entrar para conversar
          </Link>
        ) : null}
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
        { key: 'avaliacoes', label: 'Avaliações' },
      ].map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-bold transition ${activeTab === tab.key
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

const PerformanceCard = ({ }: PerformanceCardProps) => (
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
    </div>
  </Card>
);

const MedalsCard = ({ }: MedalsCardProps) => (
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
const getDominantColor = (imageUrl: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        resolve(`rgb(${r}, ${g}, ${b})`);
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
  });
};

export const PublicProfileContent = ({ profileId }: { profileId: string }) => {
  const { user, accessToken } = useAuth();

  const handleDeletePost = async (postId: string) => {
    if (!accessToken) return;
    if (!confirm('Tem certeza que deseja apagar este post?')) return;
    try {
      await communityApi.deletePost(accessToken, postId);
      setPostsState(prev => ({
        ...prev,
        items: prev.items.filter(p => p.id !== postId)
      }));
    } catch (err) {
      alert('Erro ao apagar post');
    }
  };

  const handleReportPost = async (postId: string) => {
    if (!accessToken) {
      alert('Faça login para denunciar.');
      return;
    }
    const reason = prompt('Qual o motivo da denúncia?');
    if (!reason) return;
    try {
      await communityApi.reportPost(accessToken, postId, reason);
      alert('Post denunciado com sucesso. Obrigado por ajudar a manter a comunidade segura.');
    } catch (err) {
      console.error(err);
      alert('Erro ao denunciar.');
    }
  };
  const router = useRouter();
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
  const [composerLoading, setComposerLoading] = useState(false);
  const [composerImageUrl, setComposerImageUrl] = useState<string | null>(null);
  const [composerImageUploading, setComposerImageUploading] = useState(false);
  const [composerImageError, setComposerImageError] = useState<string | null>(null);
  const composerImageInputRef = useRef<HTMLInputElement | null>(null);
  const [postsState, setPostsState] = useState<PostsState>({
    status: 'idle',
    items: [],
    total: 0,
  });
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [likeLoading, setLikeLoading] = useState<Record<string, boolean>>({});
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [commentsState, setCommentsState] = useState<CommentsState>({
    status: 'idle',
    items: [],
    total: 0,
  });
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [reviewsState, setReviewsState] = useState<ReviewsState>({
    status: 'loading',
    items: [],
    total: 0,
    ratingAverage: 0,
    distribution: null,
  });
  const [followState, setFollowState] = useState<{
    status: 'idle' | 'loading' | 'ready';
    following: boolean;
  }>({ status: 'idle', following: false });
  const [chatLoading, setChatLoading] = useState(false);
  const [brandColor, setBrandColor] = useState<string | null>(null);

  useEffect(() => {
    if (profileState.profile?.avatarUrl) {
      getDominantColor(profileState.profile.avatarUrl).then((color) => {
        if (color) {
          setBrandColor(color);
        }
      });
    } else {
      setBrandColor(null);
    }
  }, [profileState.profile?.avatarUrl]);

  useEffect(() => {
    let active = true;
    setProfileState({ status: 'loading', profile: null });
    // ... existing code ...
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
          error: error.message || 'Não foi possível carregar o perfil.',
        });
      });
    return () => {
      active = false;
    };
  }, [profileId]);

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
          <div className="h-32 rounded-3xl bg-rose-100" />
          <SkeletonProfile />
        </div>
      </section>
    );
  }

  if (profileState.status === 'error' || !profileState.profile) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-rose-200 bg-rose-50 px-6 py-6 text-sm text-rose-600">
          {profileState.error || 'Não foi possível carregar o perfil.'}
        </div>
      </section>
    );
  }

  const profile = profileState.profile!;
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
      ? 'Perfil público do cliente na Meoww.'
      : 'Especialista em contas de jogos, entregas rápidas e suporte dedicado.';
  const isOwner = user?.id === profileId;
  const canFollow = Boolean(accessToken && user && !isOwner);
  const canChat = Boolean(accessToken && user && !isOwner);
  const canCompose =
    Boolean(user && accessToken) &&
    (isOwner || user?.role === 'ADMIN') &&
    (user?.role === 'SELLER' || user?.role === 'ADMIN');
  const canInteract = Boolean(accessToken);
  const activePost =
    activePostId ? postsState.items.find((post) => post.id === activePostId) ?? null : null;
  const communityCount = postsState.status === 'ready' ? postsState.total : 0;

  const handleComposerImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !accessToken) {
      return;
    }
    setComposerImageUploading(true);
    setComposerImageError(null);
    try {
      const response = await communityApi.uploadPostImage(accessToken, file);
      setComposerImageUrl(response.url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Nao foi possivel enviar a imagem.';
      setComposerImageError(message);
    } finally {
      setComposerImageUploading(false);
      event.target.value = '';
    }
  };



  return (
    <section className="bg-gradient-to-b from-rose-100/60 via-white to-white px-6 py-12">
      <div className="mx-auto w-full max-w-[1200px] space-y-6">
        <div className="relative">
          <div
            className={`h-32 rounded-3xl transition-colors duration-200 ${brandColor ? '' : 'bg-[#ff6b95]'}`}
            style={brandColor ? { backgroundColor: brandColor } : undefined}
          >
            <div className="h-full w-full rounded-3xl bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.4),_transparent_60%)]" />
          </div>
          <ProfileHeaderCard
            profile={{ ...profile, handle: handleLabel }}
            yearLabel={yearLabel}
            ratingLabel={ratingLabel}
            salesLabel={salesLabel}
            viewsLabel={viewsLabel}
            canFollow={canFollow}
            isOwner={Boolean(isOwner)}
            followLoading={followState.status === 'loading'}
            isFollowing={followState.following}
            onToggleFollow={async () => {
              if (!accessToken || !canFollow) {
                return;
              }
              setFollowState((prev) => ({ ...prev, status: 'loading' }));
              try {
                const response = await usersApi.toggleFollow(accessToken, profileId);
                setFollowState({ status: 'ready', following: response.following });
              } catch {
                setFollowState((prev) => ({ ...prev, status: 'ready' }));
              }
            }}
            canChat={canChat}
            chatLoading={chatLoading}
            onChat={async () => {
              if (!accessToken || !canChat) {
                return;
              }
              if (chatLoading) {
                return;
              }
              setChatLoading(true);
              try {
                const response = await directChatApi.createThread(accessToken, profileId);
                router.push(`/conta/mensagens/${response.id}`);
              } finally {
                setChatLoading(false);
              }
            }}
          />
        </div>

        {showTabs ? (
          <ProfileTabs
            activeTab={activeTab}
            onChange={setActiveTab}
            communityCount={communityCount}
          />
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
                <PerformanceCard />
                <MedalsCard />
              </>
            ) : null}

            <TrustSealsCard trustSeals={profile.trustSeals} />
          </div>

          <div className="space-y-4">
            {!showTabs ? (
              <Card className="rounded-[24px] border border-slate-100 p-6 shadow-card">
                <h3 className="text-base font-bold text-meow-charcoal">Avaliações recebidas</h3>
                <p className="mt-2 text-sm text-meow-muted">
                  Este perfil ainda não possui avaliações públicas.
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
                        className={`rounded-full px-4 py-2 text-xs font-bold transition ${isActive
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
                {canCompose ? (
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
                            <button
                              type="button"
                              className="rounded-full bg-slate-100 p-2"
                              onClick={() => composerImageInputRef.current?.click()}
                              disabled={composerImageUploading}
                              aria-label="Adicionar imagem"
                            >
                              <ImageIcon size={16} aria-hidden />
                            </button>
                            <input
                              ref={composerImageInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleComposerImageChange}
                            />
                          </div>
                          <Button
                            size="sm"
                            className="rounded-full"
                            type="button"
                            disabled={
                              composerLoading ||
                              composerImageUploading ||
                              !composerText.trim()
                            }
                            onClick={async () => {
                              if (!accessToken) return;
                              const content = composerText.trim();
                              if (!content) return;
                              try {
                                setComposerLoading(true);
                                await communityApi.createPost(accessToken, {
                                  content,
                                  imageUrl: composerImageUrl ?? undefined,
                                });
                                setComposerText('');
                                setComposerImageUrl(null);
                                const response = await publicCommunityApi.listUserPosts(profileId, {
                                  take: 10,
                                });
                                setPostsState({
                                  status: 'ready',
                                  items: response.items,
                                  total: response.total,
                                });
                              } catch (error) {
                                const message =
                                  error instanceof Error
                                    ? error.message
                                    : 'Não foi possível publicar.';
                                setPostsState((prev) => ({
                                  ...prev,
                                  status: 'error',
                                  error: message,
                                }));
                              } finally {
                                setComposerLoading(false);
                              }
                            }}
                          >
                            {composerLoading ? 'Publicando...' : 'Postar'}
                          </Button>
                        </div>
                        {composerImageUploading ? (
                          <p className="text-xs text-meow-muted">Enviando imagem...</p>
                        ) : null}
                        {composerImageError ? (
                          <p className="text-xs font-semibold text-rose-500">
                            {composerImageError}
                          </p>
                        ) : null}
                        {composerImageUrl ? (
                          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                            <img
                              src={composerImageUrl}
                              alt="Preview da imagem do post"
                              className="h-48 w-full object-cover"
                            />
                            <button
                              type="button"
                              className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-slate-500 shadow-sm"
                              onClick={() => setComposerImageUrl(null)}
                              aria-label="Remover imagem"
                            >
                              <X size={14} aria-hidden />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                ) : null}

                {postsState.status === 'loading' ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-40 rounded-[24px] border border-slate-100 bg-slate-50"
                      />
                    ))}
                  </div>
                ) : null}

                {postsState.status === 'error' ? (
                  <Card className="rounded-[24px] border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600 shadow-card">
                    {postsState.error || 'Não foi possível carregar os posts.'}
                  </Card>
                ) : null}

                {postsState.status === 'ready' && postsState.items.length === 0 ? (
                  <Card className="rounded-[24px] border border-slate-100 p-6 text-sm text-meow-muted shadow-card">
                    Nenhuma atualizacao publicada ainda.
                  </Card>
                ) : null}

                {postsState.status === 'ready'
                  ? postsState.items.map((post) => (
                    <Card
                      key={post.id}
                      className="relative overflow-hidden rounded-[24px] border border-slate-100 p-5 shadow-card"
                    >
                      <span className="absolute left-0 top-0 h-full w-1 bg-rose-500" />
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 overflow-hidden rounded-full bg-meow-100">
                            {post.author.avatarUrl ? (
                              <img
                                src={post.author.avatarUrl}
                                alt={post.author.displayName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="grid h-full w-full place-items-center text-sm font-bold text-slate-400">
                                {post.author.displayName.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 text-sm font-semibold text-meow-charcoal">
                              {post.author.displayName}
                              {post.pinned ? (
                                <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-bold text-pink-600">
                                  FIXADO
                                </span>
                              ) : null}
                            </div>
                            <p className="text-xs text-meow-muted">
                              {formatRelativeTime(post.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {(user?.role === 'ADMIN' || user?.id === post.author.id) && (
                            <button
                              type="button"
                              onClick={() => handleDeletePost(post.id)}
                              className="rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-red-500"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleReportPost(post.id)}
                            className="rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-yellow-500"
                            title="Denunciar"
                          >
                            <Flag size={16} />
                          </button>
                        </div>
                      </div>
                      {post.title ? (
                        <h3 className="mt-4 text-sm font-bold text-pink-600">{post.title}</h3>
                      ) : null}
                      <p className="mt-2 text-sm text-meow-muted">{post.content}</p>
                      {post.imageUrl ? (
                        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                          <img
                            src={post.imageUrl}
                            alt="Imagem do post"
                            className="h-64 w-full object-cover"
                          />
                        </div>
                      ) : null}
                      {post.couponCode ? (
                        <Card className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 shadow-none">
                          <div className="flex items-center justify-between text-sm">
                            <div>
                              <p className="text-xs text-meow-muted">CUPOM ATIVO</p>
                              <p className="text-base font-bold text-meow-charcoal">
                                {post.couponCode}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 text-xs font-bold text-pink-500"
                              onClick={() => {
                                navigator.clipboard?.writeText(post.couponCode ?? '');
                                setCopiedPostId(post.id);
                                setTimeout(() => setCopiedPostId(null), 2000);
                              }}
                            >
                              <Copy size={14} aria-hidden />
                              {copiedPostId === post.id ? 'Copiado' : 'Copiar'}
                            </button>
                          </div>
                        </Card>
                      ) : null}
                      <div className="mt-4 flex flex-wrap items-center gap-6 text-xs text-meow-muted">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1"
                          disabled={!canInteract || likeLoading[post.id]}
                          onClick={async () => {
                            if (!accessToken) return;
                            if (likeLoading[post.id]) return;
                            setLikeLoading((prev) => ({ ...prev, [post.id]: true }));
                            try {
                              const response = await communityApi.toggleLike(accessToken, post.id);
                              setPostsState((prev) => ({
                                ...prev,
                                items: prev.items.map((item) =>
                                  item.id === post.id
                                    ? {
                                      ...item,
                                      stats: { ...item.stats, likes: response.likes },
                                    }
                                    : item,
                                ),
                              }));
                            } finally {
                              setLikeLoading((prev) => ({ ...prev, [post.id]: false }));
                            }
                          }}
                        >
                          <Heart size={12} aria-hidden />
                          {post.stats.likes}
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1"
                          onClick={() => setActivePostId(post.id)}
                        >
                          <MessageSquare size={12} aria-hidden />
                          {post.stats.comments}
                        </button>
                        <span className="inline-flex items-center gap-1">
                          <Zap size={12} aria-hidden />
                          0
                        </span>
                      </div>
                    </Card>
                  ))
                  : null}

                {activePost ? (
                  <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
                    <button
                      type="button"
                      className="absolute inset-0 bg-slate-900/40"
                      onClick={() => setActivePostId(null)}
                      aria-label="Fechar comentários"
                    />
                    <Card className="relative w-full max-w-xl rounded-[24px] border border-slate-100 bg-white p-5 shadow-card">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-bold text-meow-charcoal">Comentários</h3>
                          <p className="text-xs text-meow-muted">{activePost.author.displayName}</p>
                        </div>
                        <button
                          type="button"
                          className="rounded-full bg-slate-100 p-2 text-meow-muted"
                          onClick={() => setActivePostId(null)}
                          aria-label="Fechar"
                        >
                          <X size={14} aria-hidden />
                        </button>
                      </div>

                      <div className="mt-4 space-y-3">
                        {commentsState.status === 'loading' ? (
                          <div className="space-y-3">
                            {Array.from({ length: 3 }).map((_, index) => (
                              <div
                                key={index}
                                className="h-16 rounded-2xl border border-slate-100 bg-slate-50"
                              />
                            ))}
                          </div>
                        ) : null}

                        {commentsState.status === 'error' ? (
                          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                            {commentsState.error || 'Não foi possível carregar os comentários.'}
                          </div>
                        ) : null}

                        {commentsState.status === 'ready' && commentsState.items.length === 0 ? (
                          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-meow-muted">
                            Nenhum comentário por enquanto.
                          </div>
                        ) : null}

                        {commentsState.status === 'ready'
                          ? commentsState.items.map((comment) => (
                            <div
                              key={comment.id}
                              className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3"
                            >
                              <div className="h-8 w-8 overflow-hidden rounded-full bg-white">
                                {comment.user.avatarUrl ? (
                                  <img
                                    src={comment.user.avatarUrl}
                                    alt={comment.user.displayName}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="grid h-full w-full place-items-center text-[10px] font-bold text-slate-400">
                                    {comment.user.displayName.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-meow-charcoal">
                                  {comment.user.displayName}
                                </p>
                                <p className="text-xs text-meow-muted">{comment.content}</p>
                              </div>
                            </div>
                          ))
                          : null}
                      </div>

                      <div className="mt-4">
                        {canInteract ? (
                          <div className="flex items-center gap-2">
                            <input
                              className="h-10 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs text-meow-charcoal outline-none"
                              placeholder="Escreva um comentário..."
                              value={commentText}
                              onChange={(event) => setCommentText(event.target.value)}
                            />
                            <Button
                              size="sm"
                              className="rounded-full"
                              disabled={commentLoading || !commentText.trim()}
                              onClick={async () => {
                                if (!accessToken || !activePostId) return;
                                const content = commentText.trim();
                                if (!content) return;
                                try {
                                  setCommentLoading(true);
                                  const response = await communityApi.createComment(
                                    accessToken,
                                    activePostId,
                                    content,
                                  );
                                  setCommentsState((prev) => ({
                                    ...prev,
                                    status: 'ready',
                                    items: [...prev.items, response.comment],
                                    total: response.comments,
                                  }));
                                  setPostsState((prev) => ({
                                    ...prev,
                                    items: prev.items.map((item) =>
                                      item.id === activePostId
                                        ? {
                                          ...item,
                                          stats: { ...item.stats, comments: response.comments },
                                        }
                                        : item,
                                    ),
                                  }));
                                  setCommentText('');
                                } finally {
                                  setCommentLoading(false);
                                }
                              }}
                            >
                              {commentLoading ? 'Enviando...' : 'Enviar'}
                            </Button>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-meow-muted">
                            Faca login para comentar.
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                ) : null}
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
                    {reviewsState.error || 'Não foi possível carregar as avaliações.'}
                  </Card>
                ) : null}

                {reviewsState.status === 'ready' && reviewsState.total === 0 ? (
                  <Card className="rounded-[24px] border border-slate-100 p-6 text-sm text-meow-muted shadow-card">
                    Nenhuma avaliação encontrada.
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
                            Baseado em {reviewsState.total} avaliações
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
                          key={`${review.buyer.displayName}-${review.createdAt}`}
                          className="rounded-[24px] border border-slate-100 p-5 shadow-card"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 overflow-hidden rounded-full bg-meow-100">
                                {review.buyer.avatarUrl ? (
                                  <img
                                    src={review.buyer.avatarUrl}
                                    alt={review.buyer.displayName}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="grid h-full w-full place-items-center text-sm font-bold text-slate-400">
                                    {review.buyer.displayName.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-meow-charcoal">
                                  {review.buyer.displayName}
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
                              <strong className="text-meow-charcoal">
                                {review.productTitle ?? 'Produto'}
                              </strong>
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
