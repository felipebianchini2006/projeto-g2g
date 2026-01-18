'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Flag, Heart, ShoppingBag, ShoppingCart, Star, X } from 'lucide-react';

import { ApiClientError } from '../../lib/api-client';
import {
  listingQuestionsApi,
  type ListingQuestion,
} from '../../lib/listing-questions-api';
import {
  fetchPublicListing,
  fetchPublicListings,
  type PublicListing,
} from '../../lib/marketplace-public';
import {
  publicReviewsApi,
  type PublicReview,
  type ReviewDistribution,
} from '../../lib/public-reviews-api';
import { publicProfilesApi, type PublicProfile } from '../../lib/public-profiles-api';
import { ordersApi, type ReviewEligibilityResponse } from '../../lib/orders-api';
import { reportsApi, type ReportReason } from '../../lib/reports-api';
import { useAuth } from '../auth/auth-provider';
import { useSite } from '../site-context';
import { Badge } from '../ui/badge';
import { Button, buttonVariants } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { HomeListingCard } from '../listings/home-listing-card';

type ListingDetailState = {
  status: 'loading' | 'ready';
  listing: PublicListing | null;
  source: 'api' | 'fallback';
  error?: string;
};

type ListingQuestionsState = {
  status: 'loading' | 'ready';
  items: ListingQuestion[];
  total: number;
  error?: string;
};

type ReviewsState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: PublicReview[];
  total: number;
  ratingAverage: number;
  distribution: ReviewDistribution | null;
  error?: string;
};

type ReviewEligibilityState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data: ReviewEligibilityResponse | null;
  error?: string;
};

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

export const ListingDetailContent = ({ listingId }: { listingId: string }) => {
  const { addToCart, isFavorite, toggleFavorite } = useSite();
  const { accessToken, user } = useAuth();
  const [sellerProfile, setSellerProfile] = useState<PublicProfile | null>(null);
  const [state, setState] = useState<ListingDetailState>({
    status: 'loading',
    listing: null,
    source: 'api',
  });
  const [relatedListings, setRelatedListings] = useState<PublicListing[]>([]);
  const [questionsState, setQuestionsState] = useState<ListingQuestionsState>({
    status: 'loading',
    items: [],
    total: 0,
  });
  const [reviewsState, setReviewsState] = useState<ReviewsState>({
    status: 'idle',
    items: [],
    total: 0,
    ratingAverage: 0,
    distribution: null,
  });
  const [eligibilityState, setEligibilityState] = useState<ReviewEligibilityState>({
    status: 'idle',
    data: null,
  });
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSending, setReviewSending] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState('descricao');
  const [questionDraft, setQuestionDraft] = useState('');
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [questionSending, setQuestionSending] = useState(false);
  const questionRef = useRef<HTMLTextAreaElement | null>(null);
  const [activeMedia, setActiveMedia] = useState<string | null>(null);
  const [selectedEdition, setSelectedEdition] = useState<'standard' | 'deluxe'>(
    'standard',
  );
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('SCAM');
  const [reportMessage, setReportMessage] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);


  // Resposta do vendedor
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [answerBusy, setAnswerBusy] = useState(false);

  const router = useRouter();
  useEffect(() => {
    let active = true;
    const loadListing = async () => {
      const response = await fetchPublicListing(listingId);
      if (!active) {
        return;
      }
      setState({
        status: 'ready',
        listing: response.listing,
        source: response.source,
        error: response.error,
      });
      const fallbackImage = '/assets/meoow/highlight-01.webp';
      const nextMedia = response.listing?.media?.[0]?.url ?? fallbackImage;
      setActiveMedia(nextMedia);

      if (response.listing?.sellerId) {
        publicProfilesApi.getProfile(response.listing.sellerId)
          .then((profile) => setSellerProfile(profile))
          .catch(() => {
            // Silently fail for seller profile if needed, or log
          });
      }

      if (response.listing?.categorySlug) {
        fetchPublicListings({ category: response.listing.categorySlug, take: 5 })
          .then((res) => {
            if (!active) return;
            const filtered = res.listings.filter((item) => item.id !== listingId).slice(0, 4);
            setRelatedListings(filtered);
          })
          .catch(() => { });
      }
    };
    loadListing().catch(() => {
      if (active) {
        setState((prev) => ({
          ...prev,
          status: 'ready',
          error: 'Não foi possível carregar o anúncio.',
        }));
      }
    });
    return () => {
      active = false;
    };
  }, [listingId]);

  useEffect(() => {
    let active = true;
    setQuestionsState({ status: 'loading', items: [], total: 0 });
    const loadQuestions = async () => {
      try {
        const response = await listingQuestionsApi.listPublic(listingId);
        if (!active) {
          return;
        }
        setQuestionsState({
          status: 'ready',
          items: response.items ?? [],
          total: response.total ?? response.items.length,
        });
      } catch (error) {
        if (!active) {
          return;
        }
        const message =
          error instanceof ApiClientError
            ? error.message
            : 'Nao foi possivel carregar as duvidas.';
        setQuestionsState({ status: 'ready', items: [], total: 0, error: message });
      }
    };
    loadQuestions();
    return () => {
      active = false;
    };
  }, [listingId]);

  useEffect(() => {
    setReviewSubmitted(false);
    setReviewComment('');
    setReviewRating(5);
    setReviewError(null);
  }, [listingId]);

  useEffect(() => {
    if (activeTab !== 'avaliacoes') {
      return;
    }
    const sellerId = state.listing?.sellerId;
    const listingKey = state.listing?.id;
    if (!sellerId || !listingKey) {
      return;
    }
    let active = true;
    setReviewsState((prev) => ({ ...prev, status: 'loading', error: undefined }));
    publicReviewsApi
      .listSellerReviews(sellerId, 0, 10, listingKey)
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
          error: error.message || 'Não foi possível carregar as avaliações.',
        });
      });
    return () => {
      active = false;
    };
  }, [activeTab, state.listing?.id, state.listing?.sellerId]);

  useEffect(() => {
    if (activeTab !== 'avaliacoes') {
      return;
    }
    if (!accessToken || !state.listing?.id) {
      setEligibilityState({ status: 'idle', data: null });
      return;
    }
    let active = true;
    setEligibilityState({ status: 'loading', data: null });
    ordersApi
      .getReviewEligibility(accessToken, state.listing.id)
      .then((response) => {
        if (!active) return;
        setEligibilityState({ status: 'ready', data: response });
      })
      .catch((error: Error) => {
        if (!active) return;
        setEligibilityState({
          status: 'error',
          data: null,
          error: error.message || 'Não foi possível verificar sua avaliação.',
        });
      });
    return () => {
      active = false;
    };
  }, [accessToken, activeTab, state.listing?.id]);

  if (state.status === 'loading') {
    return (
      <section className="listing-detail">
        <div className="container">
          <div className="state-card">Carregando anúncio...</div>
        </div>
      </section>
    );
  }

  if (!state.listing) {
    return (
      <section className="listing-detail">
        <div className="container">
          <div className="state-card">Anúncio não encontrado.</div>
          <Link className="ghost-button" href="/produtos">
            Voltar ao catalogo
          </Link>
        </div>
      </section>
    );
  }

  const listing = state.listing;
  const categoryLabel = listing.categoryLabel ?? listing.categorySlug ?? 'Marketplace';
  const favoriteActive = isFavorite(listing.id);
  const reviewsLabel = `Avaliações (${reviewsState.total})`;
  const tabs = [
    { id: 'descricao', label: 'Descrição' },
    { id: 'avaliacoes', label: reviewsLabel },
    { id: 'duvidas', label: 'Dúvidas' },
  ] as const;
  const fallbackImage = '/assets/meoow/highlight-01.webp';
  const mediaItems =
    listing.media && listing.media.length > 0
      ? listing.media.map((media) => ({
        id: media.id,
        url: media.url,
        type: media.type,
      }))
      : [{ id: 'fallback', url: fallbackImage, type: 'IMAGE' }];
  const thumbnailItems = mediaItems.slice(0, 4);
  const remainingCount = Math.max(0, mediaItems.length - thumbnailItems.length);
  const editionDeltaCents = 1000;
  const editionLabel = selectedEdition === 'deluxe' ? 'Deluxe (+1k V)' : 'Padrao';
  const priceCents =
    selectedEdition === 'deluxe'
      ? listing.priceCents + editionDeltaCents
      : listing.priceCents;
  const oldPriceCents =
    typeof listing.oldPriceCents === 'number'
      ? listing.oldPriceCents +
      (selectedEdition === 'deluxe' ? editionDeltaCents : 0)
      : null;
  const discountPercent =
    oldPriceCents && oldPriceCents > priceCents
      ? Math.round((1 - priceCents / oldPriceCents) * 100)
      : null;
  const questionCount = questionsState.total || questionsState.items.length;
  const canAskQuestion = Boolean(accessToken);
  const reviewEligibility = eligibilityState.data;
  const canReview = Boolean(reviewEligibility?.canReview && reviewEligibility.orderId);
  const reviewOrderId = reviewEligibility?.orderId ?? null;

  const resolveInitials = (value?: string | null) => {
    if (!value) {
      return 'MC';
    }
    const parts = value.trim().split(' ').filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  };

  const resolveAvatarTone = (value: string) => {
    const tones = ['bg-sky-100 text-sky-600', 'bg-emerald-100 text-emerald-600', 'bg-rose-100 text-rose-600'];
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash * 31 + value.charCodeAt(index)) % tones.length;
    }
    return tones[hash];
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) {
      return '';
    }
    return new Date(value).toLocaleString('pt-BR');
  };

  const handleSubmitQuestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = questionDraft.trim();
    if (!text || !accessToken) {
      return;
    }
    setQuestionSending(true);
    setQuestionError(null);
    try {
      const created = await listingQuestionsApi.createQuestion(accessToken, listingId, text);
      setQuestionsState((prev) => ({
        ...prev,
        items: [created, ...prev.items],
        total: prev.total + 1,
      }));
      setQuestionDraft('');
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Nao foi possivel enviar sua pergunta.';
      setQuestionError(message);
    } finally {
      setQuestionSending(false);
    }
  };

  const handleSubmitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !reviewOrderId) {
      return;
    }
    const comment = reviewComment.trim();
    if (comment.length < 5) {
      setReviewError('Escreva um comentario com pelo menos 5 caracteres.');
      return;
    }
    setReviewSending(true);
    setReviewError(null);
    try {
      await ordersApi.createReview(accessToken, reviewOrderId, {
        rating: reviewRating,
        comment,
      });
      setReviewSubmitted(true);
      setReviewComment('');
      if (listing.sellerId && listing.id) {
        const response = await publicReviewsApi.listSellerReviews(
          listing.sellerId,
          0,
          10,
          listing.id,
        );
        setReviewsState({
          status: 'ready',
          items: response.items,
          total: response.total,
          ratingAverage: response.ratingAverage,
          distribution: response.distribution,
        });
      }
      const eligibility = await ordersApi.getReviewEligibility(accessToken, listing.id);
      setEligibilityState({ status: 'ready', data: eligibility });
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Nao foi possivel enviar sua avaliacao.';
      setReviewError(message);
    } finally {
      setReviewSending(false);
    }
  };

  const focusQuestion = () => {
    if (questionRef.current) {
      questionRef.current.focus();
      questionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleOpenReportModal = () => {
    if (!accessToken) {
      router.push(`/login?redirect=/anuncios/${listingId}`);
      return;
    }
    setReportModalOpen(true);
    setReportSuccess(false);
    setReportError(null);
  };

  const handleSubmitReport = async () => {
    if (!accessToken) return;
    setReportSending(true);
    setReportError(null);
    try {
      await reportsApi.createReport(accessToken, listingId, {
        reason: reportReason,
        message: reportMessage.trim() || undefined,
      });
      setReportSuccess(true);
      setReportMessage('');
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Não foi possível enviar a denúncia.';
      setReportError(message);
    } finally {
      setReportSending(false);
    }
  };

  const reasonOptions: { value: ReportReason; label: string }[] = [
    { value: 'SCAM', label: 'Golpe / Fraude' },
    { value: 'PROHIBITED_CONTENT', label: 'Conteúdo Proibido' },
    { value: 'MISLEADING_DESCRIPTION', label: 'Descrição Enganosa' },
    { value: 'DUPLICATE', label: 'Anúncio Duplicado' },
    { value: 'OTHER', label: 'Outro' },
  ];

  const isSeller = state.listing && user?.id === state.listing.sellerId;

  const handleSendAnswer = async (questionId: string) => {
    if (!accessToken || !answerText.trim()) return;
    setAnswerBusy(true);
    try {
      const updated = await listingQuestionsApi.answerQuestion(accessToken, questionId, answerText);
      setQuestionsState((prev) => ({
        ...prev,
        items: prev.items.map((q) => (q.id === questionId ? updated : q)),
      }));
      setAnsweringId(null);
      setAnswerText('');
    } catch (error) {
      // Opcional: tratar erro global ou toast
      console.error(error);
    } finally {
      setAnswerBusy(false);
    }
  };

  return (
    <section className="bg-meow-50/60 pb-16 pt-10">
      <div className="mx-auto w-full max-w-[1200px] px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="font-semibold">
            <Link href="/" className="text-slate-500 hover:text-meow-deep">
              Inicio
            </Link>{' '}
            &gt;{' '}
            <Link href="/categoria" className="text-slate-500 hover:text-meow-deep">
              {categoryLabel}
            </Link>{' '}
            &gt; <span className="text-slate-500">{listing.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenReportModal}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <Flag size={12} />
              Denunciar
            </button>
            <Link
              href="/produtos"
              className="rounded-full border border-meow-200 bg-white px-4 py-2 text-xs font-bold text-meow-deep"
            >
              Voltar ao catalogo
            </Link>
          </div>
        </div>

        {state.error ? (
          <div className="mt-4 rounded-2xl border border-meow-200 bg-white px-4 py-3 text-sm text-meow-muted shadow-card">
            {state.error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
            <div className="relative rounded-[24px] bg-slate-50 p-6">
              <Badge
                variant="pink"
                className="absolute left-6 top-6 bg-[#f7a8c3] text-[10px] font-black uppercase text-white"
              >
                Exclusivo
              </Badge>
              <button
                type="button"
                className="absolute right-6 top-6 grid h-10 w-10 place-items-center rounded-full bg-white text-meow-deep shadow-card"
                onClick={() =>
                  toggleFavorite({
                    id: listing.id,
                    title: listing.title,
                    priceCents: listing.priceCents,
                    currency: listing.currency,
                    image: listing.media?.[0]?.url ?? null,
                  })
                }
                aria-pressed={favoriteActive}
              >
                <Heart size={18} fill={favoriteActive ? 'currentColor' : 'none'} />
              </button>
              <div className="mt-10 flex min-h-[320px] items-center justify-center">
                <img
                  src={activeMedia ?? fallbackImage}
                  alt={listing.title}
                  className="max-h-[280px] object-contain drop-shadow-2xl"
                />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {thumbnailItems.map((media) => (
                <button
                  key={media.id}
                  type="button"
                  className={`grid h-20 w-20 place-items-center rounded-2xl border bg-slate-50 ${activeMedia === media.url
                    ? 'border-meow-300 shadow-cute'
                    : 'border-slate-100'
                    }`}
                  onClick={() => setActiveMedia(media.url)}
                >
                  <img src={media.url} alt={media.type} className="h-14 w-14 object-cover" />
                </button>
              ))}
              {remainingCount > 0 ? (
                <div className="grid h-20 w-20 place-items-center rounded-2xl border border-slate-100 bg-white text-sm font-bold text-meow-muted">
                  +{remainingCount}
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
              <h1 className="text-2xl font-black text-meow-charcoal">{listing.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-meow-muted">
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={`star-${index}`} size={16} fill="currentColor" />
                  ))}
                </div>
                <span className="text-xs font-semibold text-slate-500">5.0 (42)</span>
                {listing.deliveryType === 'AUTO' ? (
                  <Badge variant="success" className="bg-emerald-100 text-emerald-700">
                    Entrega automática
                  </Badge>
                ) : null}
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold text-slate-500">Escolha a Edição:</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[
                    { id: 'standard', label: 'Padrao' },
                    { id: 'deluxe', label: 'Deluxe (+1k V)' },
                  ].map((edition) => {
                    const isActive = selectedEdition === edition.id;
                    return (
                      <button
                        key={edition.id}
                        type="button"
                        onClick={() =>
                          setSelectedEdition(edition.id as 'standard' | 'deluxe')
                        }
                        className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${isActive
                          ? 'border-meow-300 bg-meow-100/70 text-meow-deep'
                          : 'border-slate-100 bg-white text-meow-charcoal hover:border-meow-200'
                          }`}
                      >
                        <span className="block text-sm font-bold">{edition.label}</span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {edition.id === 'deluxe'
                            ? 'Itens bonus para colecionar.'
                            : 'Conteúdo base incluso.'}
                        </span>
                        <span className="mt-3 block text-sm font-bold text-meow-300">
                          {formatCurrency(
                            edition.id === 'deluxe'
                              ? listing.priceCents + editionDeltaCents
                              : listing.priceCents,
                            listing.currency,
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
                  {oldPriceCents ? (
                    <span className="line-through">
                      De {formatCurrency(oldPriceCents, listing.currency)}
                    </span>
                  ) : null}
                  {discountPercent ? (
                    <Badge variant="success" className="text-[9px]">
                      -{discountPercent}%
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-2 text-3xl font-black text-meow-300">
                  {formatCurrency(priceCents, listing.currency)}
                </div>
                <p className="mt-1 text-xs text-slate-500">{editionLabel}</p>
              </div>

              <div className="mt-6 grid gap-3">
                <Link
                  className={buttonVariants({
                    variant: 'primary',
                    size: 'lg',
                    className: 'w-full gap-2 text-xs sm:text-sm',
                  })}
                  href={`/checkout/${listing.id}?variant=${selectedEdition}`}
                >
                  <ShoppingBag size={18} aria-hidden />
                  COMPRAR AGORA
                </Link>
                <button
                  type="button"
                  className={buttonVariants({
                    variant: 'secondary',
                    size: 'lg',
                    className: 'w-full gap-2 text-xs sm:text-sm',
                  })}
                  onClick={() =>
                    addToCart({
                      id: listing.id,
                      title: `${listing.title} - ${editionLabel}`,
                      priceCents,
                      currency: listing.currency,
                      image: listing.media?.[0]?.url ?? null,
                    })
                  }
                >
                  <ShoppingCart size={18} aria-hidden />
                  Adicionar ao Carrinho
                </button>
              </div>
            </div>

            {sellerProfile ? (
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold ${sellerProfile.avatarUrl ? '' : resolveAvatarTone(sellerProfile.displayName)
                    }`}>
                    {sellerProfile.avatarUrl ? (
                      <img
                        src={sellerProfile.avatarUrl}
                        alt={sellerProfile.displayName}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      resolveInitials(sellerProfile.displayName)
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-base font-bold text-meow-charcoal">
                      {sellerProfile.displayName}
                    </p>
                    <Link
                      href={`/perfil/${sellerProfile.id}`}
                      className="truncate text-xs text-meow-muted hover:text-meow-deep hover:underline"
                    >
                      @{sellerProfile.handle}
                    </Link>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-slate-50 bg-slate-50/50 px-4 py-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-xs font-bold text-meow-charcoal">
                      <Star size={12} className="text-amber-400" fill="currentColor" />
                      {sellerProfile.stats.ratingAverage.toFixed(1)}
                    </div>
                    <p className="text-[10px] text-slate-400">Avaliação</p>
                  </div>
                  <div className="h-6 w-px bg-slate-200" />
                  <div className="text-center">
                    <p className="text-xs font-bold text-meow-charcoal">
                      {sellerProfile.stats.salesCount}
                    </p>
                    <p className="text-[10px] text-slate-400">Vendas</p>
                  </div>
                  <div className="h-6 w-px bg-slate-200" />
                  <div className="text-center">
                    <p className="text-xs font-bold text-meow-charcoal">
                      {sellerProfile.stats.reviewsCount}
                    </p>
                    <p className="text-[10px] text-slate-400">Reviews</p>
                  </div>
                </div>

                <Link
                  href={`/perfil/${sellerProfile.id}`}
                  className="mt-4 block w-full rounded-full border border-meow-red/20 bg-white py-2 text-center text-xs font-bold text-meow-deep hover:bg-meow-50"
                >
                  Ver perfil completo
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="gap-2">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="descricao">
              <p>{listing.description ?? 'Descrição não informada.'}</p>
            </TabsContent>
            <TabsContent value="avaliacoes">
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-meow-charcoal">Avalie este produto</h3>
                      <p className="text-xs text-slate-400">
                        Conte como foi sua experiencia com o vendedor.
                      </p>
                    </div>
                    {!accessToken ? (
                      <Link
                        href="/login"
                        className="rounded-full border border-meow-200 bg-white px-4 py-2 text-xs font-bold text-meow-deep"
                      >
                        Entre para avaliar
                      </Link>
                    ) : null}
                  </div>

                  {!accessToken ? (
                    <div className="mt-4 rounded-2xl border border-meow-200 bg-meow-50 px-4 py-4 text-sm text-meow-muted">
                      Entre na sua conta para avaliar este vendedor.
                    </div>
                  ) : eligibilityState.status === 'loading' ? (
                    <div className="mt-4 text-xs text-slate-400">
                      Verificando se voce pode avaliar...
                    </div>
                  ) : reviewSubmitted ? (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                      Obrigado! Sua avaliacao foi enviada.
                    </div>
                  ) : canReview ? (
                    <form className="mt-4 space-y-4" onSubmit={handleSubmitReview}>
                      <div className="flex items-center gap-2 text-amber-400">
                        {Array.from({ length: 5 }).map((_, index) => {
                          const value = index + 1;
                          const isActive = reviewRating >= value;
                          return (
                            <button
                              key={`rating-${value}`}
                              type="button"
                              onClick={() => setReviewRating(value)}
                              className="rounded-full p-1 transition hover:bg-amber-50"
                              aria-label={`Nota ${value}`}
                            >
                              <Star size={18} fill={isActive ? 'currentColor' : 'none'} />
                            </button>
                          );
                        })}
                      </div>
                      <Textarea
                        rows={4}
                        placeholder="Escreva sua avaliacao..."
                        value={reviewComment}
                        onChange={(event) => setReviewComment(event.target.value)}
                      />
                      {reviewError ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                          {reviewError}
                        </div>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                          disabled={reviewSending || reviewComment.trim().length < 5}
                        >
                          {reviewSending ? 'Enviando...' : 'Enviar avaliacao'}
                        </Button>
                        <span className="text-xs text-slate-400">
                          Sua avaliacao fica vinculada ao vendedor.
                        </span>
                      </div>
                    </form>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-meow-muted">
                      <p>{reviewEligibility?.reason ?? 'Voce nao pode avaliar este produto.'}</p>
                      <Link
                        href="/conta/pedidos"
                        className="mt-3 inline-flex rounded-full bg-meow-linear px-4 py-2 text-xs font-bold text-white"
                      >
                        Ver meus pedidos
                      </Link>
                    </div>
                  )}
                </div>

                {reviewsState.status === 'loading' ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={`review-skeleton-${index}`}
                        className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-3 w-32" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {reviewsState.status === 'error' ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {reviewsState.error || 'Nao foi possivel carregar as avaliacoes.'}
                  </div>
                ) : null}

                {reviewsState.status === 'ready' && reviewsState.total === 0 ? (
                  <div className="rounded-2xl border border-slate-100 bg-meow-50 px-5 py-4 text-sm text-meow-muted">
                    Nenhuma avaliacao encontrada para este produto.
                  </div>
                ) : null}

                {reviewsState.status === 'ready' && reviewsState.total > 0 ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
                      <div className="flex flex-wrap items-center gap-4">
                        <div>
                          <div className="text-3xl font-black text-meow-charcoal">
                            {reviewsState.ratingAverage.toFixed(1)}
                          </div>
                          <div className="mt-2 flex items-center gap-1 text-amber-400">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <Star key={`avg-star-${index}`} size={16} fill="currentColor" />
                            ))}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500">
                          Baseado em {reviewsState.total} avaliacao
                          {reviewsState.total === 1 ? '' : 'es'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {reviewsState.items.map((review) => (
                        <div
                          key={review.id}
                          className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
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
                                    <Star key={`review-star-${review.id}-${index}`} size={12} />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <span className="text-xs text-meow-muted">
                              {formatDateTime(review.createdAt)}
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
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </TabsContent>
            <TabsContent value="duvidas">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-meow-charcoal">Dúvidas</h3>
                    <p className="text-xs text-slate-400">
                      {questionCount} pergunta{questionCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  {!canAskQuestion ? (
                    <Link
                      href="/login"
                      className="rounded-full border border-meow-200 bg-white px-4 py-2 text-xs font-bold text-meow-deep"
                    >
                      Entre para perguntar
                    </Link>
                  ) : null}
                </div>

                {questionsState.error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {questionsState.error}
                  </div>
                ) : null}

                {questionsState.status === 'loading' ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={`question-skeleton-${index}`}
                        className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-3 w-40" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {questionsState.status === 'ready' && questionsState.items.length === 0 ? (
                  <div className="rounded-2xl border border-slate-100 bg-meow-50 px-5 py-4 text-sm text-meow-muted">
                    <p>Nenhuma dúvida ainda. Seja o primeiro a perguntar.</p>
                    {canAskQuestion ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="mt-3"
                        onClick={focusQuestion}
                      >
                        Escrever pergunta
                      </Button>
                    ) : (
                      <Link
                        href="/login"
                        className="mt-3 inline-flex rounded-full bg-meow-linear px-4 py-2 text-xs font-bold text-white"
                      >
                        Entre para perguntar
                      </Link>
                    )}
                  </div>
                ) : null}

                {questionsState.items.map((question) => {
                  const authorName =
                    question.askedBy?.fullName ??
                    question.askedBy?.email ??
                    'Comprador';
                  const initials = resolveInitials(authorName);
                  const avatarTone = resolveAvatarTone(question.askedBy?.id ?? question.id);
                  return (
                    <div
                      key={question.id}
                      className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_10px_22px_rgba(15,23,42,0.04)]"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-xs font-black ${avatarTone}`}
                        >
                          {question.askedBy?.avatarUrl ? (
                            <img
                              src={question.askedBy.avatarUrl}
                              alt={authorName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            initials
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <span className="font-semibold text-slate-600">{authorName}</span>
                            <span>•</span>
                            <span>{formatDateTime(question.createdAt)}</span>
                          </div>
                          <p className="mt-2 text-sm text-meow-charcoal">
                            {question.question}
                          </p>

                          {question.answer ? (
                            <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
                              <div className="mb-1 flex items-center gap-2 text-xs font-bold text-meow-deep">
                                <span>Resposta do Vendedor</span>
                                <span className="text-[10px] font-normal text-slate-400">
                                  • {formatDateTime(question.answeredAt)}
                                </span>
                              </div>
                              <p>{question.answer}</p>
                            </div>
                          ) : (
                            <div className="mt-2">
                              {isSeller ? (
                                <>
                                  {answeringId === question.id ? (
                                    <div className="mt-3 space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
                                      <Textarea
                                        value={answerText}
                                        onChange={(e) => setAnswerText(e.target.value)}
                                        placeholder="Digite sua resposta..."
                                        rows={2}
                                        className="bg-white"
                                      />
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() => handleSendAnswer(question.id)}
                                          disabled={answerBusy || !answerText.trim()}
                                        >
                                          {answerBusy ? 'Enviando...' : 'Enviar Resposta'}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setAnsweringId(null);
                                            setAnswerText('');
                                          }}
                                          disabled={answerBusy}
                                        >
                                          Cancelar
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setAnsweringId(question.id);
                                        setAnswerText('');
                                      }}
                                      className="text-xs font-bold text-meow-deep hover:underline"
                                    >
                                      Responder pergunta
                                    </button>
                                  )}
                                </>
                              ) : (
                                <p className="mt-4 text-xs font-semibold text-amber-500">
                                  Aguardando resposta do vendedor...
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="rounded-2xl border border-slate-100 bg-white p-5">
                  <h4 className="text-sm font-bold text-meow-charcoal">
                    Envie sua pergunta
                  </h4>
                  {!canAskQuestion ? (
                    <div className="mt-3 rounded-2xl border border-meow-200 bg-meow-50 px-4 py-4 text-sm text-meow-muted">
                      <p>Entre na sua conta para perguntar ao vendedor.</p>
                      <Link
                        href="/login"
                        className="mt-3 inline-flex rounded-full bg-meow-linear px-4 py-2 text-xs font-bold text-white"
                      >
                        Entre para perguntar
                      </Link>
                    </div>
                  ) : (
                    <form className="mt-3 space-y-3" onSubmit={handleSubmitQuestion}>
                      <Textarea
                        ref={questionRef}
                        rows={4}
                        placeholder="Escreva sua dúvida..."
                        value={questionDraft}
                        onChange={(event) => setQuestionDraft(event.target.value)}
                      />
                      {questionError ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                          {questionError}
                        </div>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                          disabled={questionSending || questionDraft.trim().length === 0}
                        >
                          {questionSending ? 'Enviando...' : 'Enviar pergunta'}
                        </Button>
                        <span className="text-xs text-slate-400">
                          Respostas aparecem aqui assim que o vendedor responder.
                        </span>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {
        relatedListings.length > 0 ? (
          <div className="mx-auto mt-12 w-full max-w-[1200px] px-6">
            <h2 className="text-2xl font-black text-meow-charcoal mb-6">Produtos Relacionados</h2>
            <div className="flex flex-wrap gap-6 justify-center lg:justify-start">
              {relatedListings.map((item) => (
                <HomeListingCard
                  key={item.id}
                  listing={item}
                  image={item.media?.[0]?.url ?? '/assets/meoow/highlight-01.webp'}
                  href={`/anuncios/${item.id}`}
                />
              ))}
            </div>
          </div>
        ) : null
      }

      {/* Report Modal */}
      {
        reportModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-meow-charcoal">Denunciar Anúncio</h3>
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              {reportSuccess ? (
                <div className="mt-4">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                    Denúncia enviada com sucesso! Nossa equipe irá analisar.
                  </div>
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="mt-4 w-full rounded-full bg-meow-linear px-4 py-2 text-sm font-bold text-white"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <>
                  <p className="mt-2 text-sm text-slate-500">
                    Informe o motivo da denúncia. Analisaremos e tomaremos as medidas necessárias.
                  </p>

                  <div className="mt-4 space-y-4">
                    <label className="block">
                      <span className="text-sm font-semibold text-meow-charcoal">Motivo</span>
                      <select
                        className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value as ReportReason)}
                      >
                        {reasonOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-semibold text-meow-charcoal">
                        Detalhes (opcional)
                      </span>
                      <Textarea
                        rows={4}
                        placeholder="Descreva o problema com mais detalhes..."
                        value={reportMessage}
                        onChange={(e) => setReportMessage(e.target.value)}
                        className="mt-1"
                      />
                    </label>

                    {reportError ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                        {reportError}
                      </div>
                    ) : null}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setReportModalOpen(false)}
                        className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitReport}
                        disabled={reportSending}
                        className="flex-1 rounded-full bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        {reportSending ? 'Enviando...' : 'Enviar Denúncia'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null
      }
    </section >
  );
};
