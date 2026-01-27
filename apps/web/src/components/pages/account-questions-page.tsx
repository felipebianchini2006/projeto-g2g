'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api-client';
import {
  listingQuestionsApi,
  type ListingQuestion,
} from '../../lib/listing-questions-api';
import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Textarea } from '../ui/textarea';

type QuestionsState = {
  status: 'loading' | 'ready';
  questions: ListingQuestion[];
  error?: string;
};

type AccountQuestionsContentProps = {
  scope: 'sent' | 'received';
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '';
  }
  return new Date(value).toLocaleString('pt-BR');
};

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

export const AccountQuestionsContent = ({ scope }: AccountQuestionsContentProps) => {
  const { user, accessToken, loading } = useAuth();
  const [state, setState] = useState<QuestionsState>({
    status: 'loading',
    questions: [],
  });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const accessAllowed =
    scope === 'received' ? user?.role === 'SELLER' || user?.role === 'ADMIN' : true;

  useEffect(() => {
    if (!accessToken || !accessAllowed) {
      return;
    }
    let active = true;
    const loadQuestions = async () => {
      try {
        const questions =
          scope === 'received'
            ? await listingQuestionsApi.listReceived(accessToken)
            : await listingQuestionsApi.listSent(accessToken);
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
            : 'Não foi possível carregar as perguntas.';
        setState({ status: 'ready', questions: [], error: message });
      }
    };
    loadQuestions();
    return () => {
      active = false;
    };
  }, [accessAllowed, accessToken, scope]);

  const sortedQuestions = useMemo(
    () =>
      [...state.questions].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [state.questions],
  );

  const handleAnswer = async (questionId: string) => {
    if (!accessToken) {
      return;
    }
    const answer = drafts[questionId]?.trim();
    if (!answer) {
      return;
    }
    setActionBusy(questionId);
    setNotice(null);
    try {
      const updated = await listingQuestionsApi.answerQuestion(
        accessToken,
        questionId,
        answer,
      );
      setState((prev) => ({
        ...prev,
        questions: prev.questions.map((question) =>
          question.id === questionId ? { ...question, ...updated } : question,
        ),
      }));
      setDrafts((prev) => ({ ...prev, [questionId]: '' }));
      setNotice('Resposta enviada.');
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Não foi possível responder a pergunta.';
      setNotice(message);
    } finally {
      setActionBusy(null);
    }
  };

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
          : 'Não foi possível remover a pergunta.';
      setNotice(message);
    } finally {
      setActionBusy(null);
    }
  };

  if (loading) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-4 text-sm text-meow-muted">
          Carregando sessao...
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
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

  if (!accessAllowed) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">
            Seu perfil não possui acesso as perguntas recebidas.
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

  const title = scope === 'received' ? 'Perguntas recebidas' : 'Perguntas enviadas';
  const subtitle =
    scope === 'received'
      ? 'Responda as duvidas dos compradores.'
      : 'Acompanhe as respostas dos vendedores.';

  return (
    <AccountShell
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Conta', href: '/conta' },
        { label: title },
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-meow-charcoal">{title}</h1>
          <p className="text-sm text-meow-muted">{subtitle}</p>
        </div>

        {state.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        ) : null}

        {notice ? (
          <div className="rounded-2xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm text-meow-muted">
            {notice}
          </div>
        ) : null}

        {state.status === 'loading' ? (
          <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`questions-loading-${index}`}
                className="h-20 rounded-2xl border border-slate-100 bg-meow-50/70"
              />
            ))}
          </div>
        ) : null}

        {state.status === 'ready' && sortedQuestions.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-meow-50 px-4 py-3 text-sm text-meow-muted">
            {scope === 'received'
              ? 'Nenhuma pergunta recebida ate agora.'
              : 'Você ainda não enviou perguntas.'}
          </div>
        ) : null}

        <div className="grid gap-4">
          {sortedQuestions.map((question) => {
            const listingTitle = question.listing?.title ?? 'Anuncio';
            const mediaUrl =
              question.listing?.media?.[0]?.url ?? '/assets/meoow/highlight-02.webp';
            const authorName =
              question.askedBy?.fullName ?? question.askedBy?.email ?? 'Comprador';
            const initials = resolveInitials(authorName);
            const avatarTone = resolveAvatarTone(question.askedBy?.id ?? question.id);
            const answered = Boolean(question.answer);

            return (
              <Card
                key={question.id}
                className="rounded-[26px] border border-slate-100 p-5 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex flex-1 items-start gap-4">
                    <div className="h-14 w-14 overflow-hidden rounded-2xl bg-slate-100">
                      <img
                        src={mediaUrl}
                        alt={listingTitle}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-meow-charcoal">
                        {listingTitle}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDateTime(question.createdAt)}
                      </p>
                      <p className="text-sm text-meow-charcoal">{question.question}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant={answered ? 'success' : 'warning'}>
                      {answered ? 'Respondida' : 'Aguardando'}
                    </Badge>
                    {scope === 'sent' && !answered ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={actionBusy === question.id}
                        onClick={() => handleDelete(question.id)}
                      >
                        {actionBusy === question.id ? 'Removendo...' : 'Excluir'}
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-start gap-4">
                  <div className="flex items-center gap-3">
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
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Perguntou</p>
                      <p className="text-sm font-bold text-meow-charcoal">{authorName}</p>
                    </div>
                  </div>
                </div>

                {answered ? (
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
                ) : scope === 'received' ? (
                  <div className="mt-4 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.4px] text-slate-400">
                      Responder pergunta
                    </p>
                    <Textarea
                      rows={3}
                      placeholder="Digite a resposta..."
                      value={drafts[question.id] ?? ''}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [question.id]: event.target.value,
                        }))
                      }
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={
                        actionBusy === question.id || !(drafts[question.id]?.trim().length)
                      }
                      onClick={() => handleAnswer(question.id)}
                    >
                      {actionBusy === question.id ? 'Enviando...' : 'Enviar resposta'}
                    </Button>
                  </div>
                ) : (
                  <p className="mt-4 text-xs font-semibold text-amber-500">
                    Aguardando resposta do vendedor...
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </AccountShell>
  );
};
