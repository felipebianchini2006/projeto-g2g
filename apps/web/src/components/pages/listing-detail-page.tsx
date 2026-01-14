'use client';

import Link from 'next/link';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Heart, ShoppingBag, ShoppingCart, Star } from 'lucide-react';

import { ApiClientError } from '../../lib/api-client';
import {
  listingQuestionsApi,
  type ListingQuestion,
} from '../../lib/listing-questions-api';
import { fetchPublicListing, type PublicListing } from '../../lib/marketplace-public';
import { useAuth } from '../auth/auth-provider';
import { useSite } from '../site-context';
import { Badge } from '../ui/badge';
import { Button, buttonVariants } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';

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

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

export const ListingDetailContent = ({ listingId }: { listingId: string }) => {
  const { addToCart, isFavorite, toggleFavorite } = useSite();
  const { user, accessToken } = useAuth();
  const [state, setState] = useState<ListingDetailState>({
    status: 'loading',
    listing: null,
    source: 'api',
  });
  const [questionsState, setQuestionsState] = useState<ListingQuestionsState>({
    status: 'loading',
    items: [],
    total: 0,
  });
  const [questionDraft, setQuestionDraft] = useState('');
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [questionSending, setQuestionSending] = useState(false);
  const questionRef = useRef<HTMLTextAreaElement | null>(null);
  const [activeMedia, setActiveMedia] = useState<string | null>(null);
  const [selectedEdition, setSelectedEdition] = useState<'standard' | 'deluxe'>(
    'standard',
  );
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
  const tabs = [
    { id: 'descricao', label: 'Descrição' },
    { id: 'avaliacoes', label: 'Avaliações (42)' },
    { id: 'duvidas', label: 'Duvidas' },
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

  const focusQuestion = () => {
    if (questionRef.current) {
      questionRef.current.focus();
      questionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
          <Link
            href="/produtos"
            className="rounded-full border border-meow-200 bg-white px-4 py-2 text-xs font-bold text-meow-deep"
          >
            Voltar ao catalogo
          </Link>
        </div>

        {state.error ? (
          <div className="mt-4 rounded-2xl border border-meow-200 bg-white px-4 py-3 text-sm text-meow-muted shadow-card">
            {state.error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-card">
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
                  className={`grid h-20 w-20 place-items-center rounded-2xl border bg-slate-50 ${
                    activeMedia === media.url
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

          <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-card">
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
                      className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                        isActive
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
        </div>

        <div className="mt-10 rounded-[28px] border border-slate-100 bg-white p-6 shadow-card">
          <Tabs defaultValue="descricao">
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
              <p>Em breve.</p>
            </TabsContent>
            <TabsContent value="duvidas">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-meow-charcoal">Duvidas</h3>
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
                    <p>Nenhuma duvida ainda. Seja o primeiro a perguntar.</p>
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
                            <div className="mt-4 rounded-2xl border border-pink-100 bg-gradient-to-r from-[#f78fb3]/15 to-[#f04f7a]/15 px-4 py-3 text-sm text-meow-charcoal">
                              <p className="text-[11px] font-bold uppercase text-pink-500">
                                Resposta do vendedor
                              </p>
                              <p className="mt-2">{question.answer}</p>
                              {question.answeredAt ? (
                                <p className="mt-2 text-[11px] font-semibold text-pink-400">
                                  {formatDateTime(question.answeredAt)}
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <p className="mt-4 text-xs font-semibold text-amber-500">
                              Aguardando resposta do vendedor...
                            </p>
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
                        placeholder="Escreva sua duvida..."
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
    </section>
  );
};
