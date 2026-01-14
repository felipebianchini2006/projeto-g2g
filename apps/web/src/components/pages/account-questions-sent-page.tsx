'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Search, ShoppingBag, Trash2 } from 'lucide-react';

import { ApiClientError } from '../../lib/api-client';
import {
  listingQuestionsApi,
  type ListingQuestion,
} from '../../lib/listing-questions-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';
import { Badge } from '../ui/badge';
import { buttonVariants } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

type QuestionsState = {
  status: 'loading' | 'ready';
  questions: ListingQuestion[];
  error?: string;
};

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '';
  }
  return new Date(value).toLocaleString('pt-BR');
};

const normalize = (value: string) => value.toLowerCase();

export const AccountQuestionsSentPage = () => {
  const { user, accessToken, loading } = useAuth();
  const [state, setState] = useState<QuestionsState>({
    status: 'loading',
    questions: [],
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    let active = true;
    const loadQuestions = async () => {
      try {
        const questions = await listingQuestionsApi.listSent(accessToken);
        if (!active) {
          return;
        }
        setState({ status: 'ready', questions });
      } catch (error) {
        if (!active) {
          return;
        }
        const message =
          error instanceof ApiClientError
            ? error.message
            : 'Nao foi possivel carregar as perguntas.';
        setState({ status: 'ready', questions: [], error: message });
      }
    };
    loadQuestions();
    return () => {
      active = false;
    };
  }, [accessToken]);

  const sortedQuestions = useMemo(
    () =>
      [...state.questions].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [state.questions],
  );

  const filteredQuestions = useMemo(() => {
    const trimmed = searchValue.trim();
    const query = trimmed ? normalize(trimmed) : '';
    const byTab = sortedQuestions.filter((question) => {
      if (activeTab === 'answered') {
        return Boolean(question.answer);
      }
      if (activeTab === 'pending') {
        return !question.answer;
      }
      return true;
    });
    if (!query) {
      return byTab;
    }
    return byTab.filter((question) => {
      const listing = question.listing;
      const seller = listing?.seller;
      const haystack = [
        question.question,
        question.answer,
        listing?.title,
        seller?.fullName,
        seller?.email,
      ]
        .filter(Boolean)
        .map((value) => normalize(String(value)))
        .join(' ');
      return haystack.includes(query);
    });
  }, [activeTab, searchValue, sortedQuestions]);

  const handleDelete = async (questionId: string) => {
    if (!accessToken) {
      return;
    }
    setActionBusy(questionId);
    setNotice(null);
    try {
      await listingQuestionsApi.deleteQuestion(accessToken, questionId);
      setState((prev) => ({
        ...prev,
        questions: prev.questions.filter((question) => question.id !== questionId),
      }));
      setNotice('Pergunta removida.');
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Nao foi possivel remover a pergunta.';
      setNotice(message);
    } finally {
      setActionBusy(null);
    }
  };

  if (loading) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm text-meow-muted">
          Carregando sessao...
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-xl border border-slate-200 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">Entre para acessar suas perguntas.</p>
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

  return (
    <AccountShell
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Conta', href: '/conta' },
        { label: 'Minhas perguntas' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-meow-charcoal">Minhas perguntas</h1>
            <Badge variant="pink">{state.questions.length}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Buscar perguntas..."
              className="pl-10"
            />
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="gap-2">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="answered">Respondidas</TabsTrigger>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {state.error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        ) : null}

        {notice ? (
          <div className="rounded-xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm text-meow-muted">
            {notice}
          </div>
        ) : null}

        {state.status === 'loading' ? (
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`questions-loading-${index}`}
                className="h-32 rounded-xl border border-slate-100 bg-slate-50/80 animate-pulse"
              />
            ))}
          </div>
        ) : null}

        {state.status === 'ready' && filteredQuestions.length === 0 ? (
          <Card className="border border-slate-100 p-6 text-center">
            <p className="text-sm text-meow-muted">Nenhuma pergunta encontrada.</p>
            <Link
              href="/produtos"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-meow-linear px-5 py-2 text-xs font-bold text-white"
            >
              <ShoppingBag size={14} aria-hidden />
              Explorar anuncios
            </Link>
          </Card>
        ) : null}

        <div className="grid gap-4">
          {filteredQuestions.map((question) => {
            const listing = question.listing;
            const listingTitle = listing?.title ?? 'Anuncio';
            const seller =
              listing?.seller?.fullName ??
              listing?.seller?.email ??
              'Vendedor do anuncio';
            const mediaUrl =
              listing?.media?.[0]?.url ?? '/assets/meoow/highlight-02.webp';
            const answered = Boolean(question.answer);
            const priceLabel =
              typeof listing?.priceCents === 'number'
                ? formatCurrency(listing.priceCents, listing.currency ?? 'BRL')
                : 'Preco indisponivel';

            return (
              <Card key={question.id} className="border border-slate-100 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex flex-1 items-start gap-4">
                    <div className="h-16 w-16 overflow-hidden rounded-xl bg-slate-100">
                      <img
                        src={mediaUrl}
                        alt={listingTitle}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-meow-charcoal">
                        {listingTitle}
                      </p>
                      <p className="text-xs text-slate-400">Vendedor: {seller}</p>
                      <p className="text-sm font-bold text-meow-charcoal">
                        {priceLabel}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={answered ? 'success' : 'warning'}>
                      {answered ? 'Respondida' : 'Pendente'}
                    </Badge>
                    {!answered ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(question.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-red-200 hover:text-red-500"
                        aria-label="Remover pergunta"
                        disabled={actionBusy === question.id}
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-meow-charcoal">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                      <span>Sua pergunta</span>
                      <span>{formatDateTime(question.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm text-meow-charcoal">
                      {question.question}
                    </p>
                  </div>

                  {answered ? (
                    <div className="rounded-xl border border-meow-red/20 bg-meow-red/10 px-4 py-3 text-sm text-meow-charcoal">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-meow-deep">
                        <span>Resposta do vendedor</span>
                        <span>{formatDateTime(question.answeredAt)}</span>
                      </div>
                      <p className="mt-2 text-sm text-meow-charcoal">{question.answer}</p>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-amber-500">
                      Aguardando resposta do vendedor...
                    </p>
                  )}
                </div>

                {listing?.id ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Link
                      href={`/anuncios/${listing.id}`}
                      className={buttonVariants({ size: 'sm' })}
                    >
                      Comprar agora
                    </Link>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      </div>
    </AccountShell>
  );
};
