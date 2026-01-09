'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../../../components/auth/auth-provider';
import { ApiClientError } from '../../../lib/api-client';
import {
  marketplaceApi,
  type Listing,
  type ListingInput,
} from '../../../lib/marketplace-api';

const steps = ['Conta', 'Anuncio', 'Imagens', 'Resumo'] as const;

const emptyListing: ListingInput = {
  categoryId: '',
  title: '',
  description: '',
  priceCents: 0,
  currency: 'BRL',
  deliveryType: 'AUTO',
  deliverySlaHours: 24,
  refundPolicy: 'Reembolso disponivel enquanto o pedido estiver em aberto.',
};

export default function Page() {
  const { user, accessToken, logout } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [formState, setFormState] = useState<ListingInput>(emptyListing);
  const [listing, setListing] = useState<Listing | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const handleContinue = async () => {
    setError(null);
    setNotice(null);

    if (step === 1) {
      if (!accessToken) {
        setError('Sessao expirada.');
        return;
      }
      setBusyAction('create');
      try {
        const created = await marketplaceApi.createListing(accessToken, {
          ...formState,
          description: formState.description?.trim() || undefined,
        });
        setListing(created);
        setStep(2);
      } catch (error) {
        const message =
          error instanceof ApiClientError
            ? error.message
            : 'Nao foi possivel criar o anuncio.';
        setError(message);
      } finally {
        setBusyAction(null);
      }
      return;
    }

    if (step < steps.length - 1) {
      setStep((prev) => prev + 1);
    }
  };

  const handleUpload = async () => {
    if (!listing || !accessToken || !mediaFile) {
      setError('Selecione uma imagem.');
      return;
    }
    setBusyAction('upload');
    setError(null);
    setNotice(null);
    try {
      await marketplaceApi.uploadMedia(accessToken, listing.id, mediaFile, 0);
      const updated = await marketplaceApi.getSellerListing(accessToken, listing.id);
      setListing(updated);
      setNotice('Imagem enviada com sucesso.');
      setMediaFile(null);
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Nao foi possivel enviar a imagem.';
      setError(message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleSubmitListing = async () => {
    if (!listing || !accessToken) {
      return;
    }
    setBusyAction('submit');
    setError(null);
    setNotice(null);
    try {
      const updated = await marketplaceApi.submitListing(accessToken, listing.id);
      setListing(updated);
      setNotice('Anuncio enviado para aprovacao.');
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Nao foi possivel enviar para aprovacao.';
      setError(message);
    } finally {
      setBusyAction(null);
    }
  };

  if (!user) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-white px-6 py-16">
        <div className="w-full max-w-xl rounded-2xl border border-meow-red/20 bg-white p-8 text-center shadow-meow">
          <h1 className="text-2xl font-black text-meow-charcoal">Criar anuncio</h1>
          <p className="mt-2 text-sm text-meow-muted">
            Entre com sua conta para anunciar.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-meow-linear px-6 py-2 text-sm font-bold text-white"
          >
            Fazer login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-white px-6 py-10">
      <div className="mx-auto w-full max-w-[980px]">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-meow-muted">
          <Link href="/" className="font-semibold text-meow-deep">
            Voltar ao site
          </Link>
          <img src="/assets/meoow/logo.png" alt="Meoww" className="h-10" />
        </div>

        <div className="mt-8 flex flex-col items-center gap-6">
          <div className="relative flex w-full max-w-[620px] items-center justify-between">
            <div className="absolute left-0 right-0 top-4 h-px bg-meow-red/20" />
            {steps.map((label, index) => (
              <div key={label} className="relative z-10 flex flex-col items-center gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    index <= step
                      ? 'bg-meow-deep text-white'
                      : 'bg-meow-cream text-meow-muted'
                  }`}
                >
                  {index + 1}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    index === step ? 'text-meow-charcoal' : 'text-meow-muted'
                  }`}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-meow-red/20 bg-white p-8 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">
              {error}
            </div>
          ) : null}
          {notice ? (
            <div className="mb-4 rounded-xl border border-meow-red/20 bg-meow-cream/70 px-4 py-2 text-xs font-semibold text-meow-muted">
              {notice}
            </div>
          ) : null}

          {step === 0 ? (
            <div className="grid gap-6">
              <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-sm">
                <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
                  <div className="space-y-3">
                    <h2 className="text-lg font-black text-meow-charcoal">Conta Meoww</h2>
                    <p className="text-sm text-meow-muted">
                      Ola, {user.email}! Clique no botao abaixo para continuar.
                    </p>
                    <button
                      className="rounded-full bg-meow-linear px-6 py-2 text-sm font-bold text-white"
                      type="button"
                      onClick={handleContinue}
                    >
                      Continuar
                    </button>
                  </div>

                  <div className="hidden h-20 w-px bg-meow-red/20 md:block" />

                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-meow-charcoal">
                      Voce nao e o(a) {user.email}?
                    </h3>
                    <p className="text-sm text-meow-muted">
                      Entre com outro usuario apertando o botao abaixo.
                    </p>
                    <button
                      className="rounded-full border border-meow-red/30 bg-meow-gold/30 px-6 py-2 text-sm font-bold text-meow-charcoal"
                      type="button"
                      onClick={async () => {
                        await logout();
                        router.push('/login');
                      }}
                    >
                      Sair
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-4">
              <h2 className="text-lg font-black text-meow-charcoal">Detalhes do anuncio</h2>
              <label className="grid gap-2 text-sm font-semibold">
                Categoria (ID)
                <input
                  className="rounded-xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm outline-none"
                  value={formState.categoryId}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, categoryId: event.target.value }))
                  }
                  placeholder="UUID da categoria"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Titulo
                <input
                  className="rounded-xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm outline-none"
                  value={formState.title}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Nome do anuncio"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Descricao
                <textarea
                  className="rounded-xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm outline-none"
                  rows={4}
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold">
                  Preco (centavos)
                  <input
                    className="rounded-xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm outline-none"
                    type="number"
                    min={1}
                    value={formState.priceCents}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        priceCents: Number(event.target.value || 0),
                      }))
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  Moeda
                  <input
                    className="rounded-xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm outline-none"
                    value={formState.currency}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, currency: event.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold">
                  Tipo de entrega
                  <select
                    className="rounded-xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm outline-none"
                    value={formState.deliveryType}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        deliveryType: event.target.value as ListingInput['deliveryType'],
                      }))
                    }
                  >
                    <option value="AUTO">AUTO</option>
                    <option value="MANUAL">MANUAL</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  SLA (horas)
                  <input
                    className="rounded-xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm outline-none"
                    type="number"
                    min={1}
                    max={720}
                    value={formState.deliverySlaHours}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        deliverySlaHours: Number(event.target.value || 0),
                      }))
                    }
                  />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-semibold">
                Politica de reembolso
                <textarea
                  className="rounded-xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm outline-none"
                  rows={3}
                  value={formState.refundPolicy}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, refundPolicy: event.target.value }))
                  }
                />
              </label>
              <button
                className="mt-2 rounded-full bg-meow-linear px-6 py-2 text-sm font-bold text-white"
                type="button"
                onClick={handleContinue}
                disabled={busyAction === 'create'}
              >
                {busyAction === 'create' ? 'Salvando...' : 'Continuar'}
              </button>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-4">
              <h2 className="text-lg font-black text-meow-charcoal">Imagens</h2>
              <p className="text-sm text-meow-muted">
                Adicione pelo menos uma imagem para destacar seu anuncio.
              </p>
              <input
                type="file"
                onChange={(event) => setMediaFile(event.target.files?.[0] ?? null)}
              />
              <button
                className="rounded-full border border-meow-red/30 px-6 py-2 text-sm font-bold text-meow-deep"
                type="button"
                onClick={handleUpload}
                disabled={busyAction === 'upload'}
              >
                {busyAction === 'upload' ? 'Enviando...' : 'Enviar imagem'}
              </button>
              <button
                className="rounded-full bg-meow-linear px-6 py-2 text-sm font-bold text-white"
                type="button"
                onClick={handleContinue}
              >
                Continuar
              </button>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-4">
              <h2 className="text-lg font-black text-meow-charcoal">Resumo</h2>
              <div className="rounded-xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm">
                <p className="font-semibold">{listing?.title ?? formState.title}</p>
                <p className="text-xs text-meow-muted">
                  {listing?.description ?? formState.description}
                </p>
                <p className="mt-2 text-xs text-meow-muted">
                  Preco: {formState.priceCents} {formState.currency}
                </p>
              </div>
              <button
                className="rounded-full bg-meow-linear px-6 py-2 text-sm font-bold text-white"
                type="button"
                onClick={handleSubmitListing}
                disabled={busyAction === 'submit'}
              >
                {busyAction === 'submit' ? 'Enviando...' : 'Enviar para aprovacao'}
              </button>
              <Link
                href="/conta"
                className="text-center text-xs font-semibold text-meow-deep"
              >
                Voltar ao site
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
