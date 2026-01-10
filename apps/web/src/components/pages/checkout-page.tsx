'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ApiClientError } from '../../lib/api-client';
import { fetchPublicListing, type PublicListing } from '../../lib/marketplace-public';
import { ordersApi, type CheckoutResponse } from '../../lib/orders-api';
import { useAuth } from '../auth/auth-provider';
import { useSite } from '../site-context';
import { Badge } from '../ui/badge';
import { buttonVariants } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';

type ListingState = {
  status: 'loading' | 'ready';
  listing: PublicListing | null;
  source: 'api' | 'fallback' | 'cart';
  error?: string;
};

type PaymentState = {
  status: 'idle' | 'loading' | 'ready';
  data?: CheckoutResponse;
  error?: string;
};

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

export const CheckoutContent = ({ listingId }: { listingId: string }) => {
  const { user, accessToken, loading } = useAuth();
  const router = useRouter();
  const { cartItems } = useSite();
  const [listingState, setListingState] = useState<ListingState>({
    status: 'loading',
    listing: null,
    source: 'api',
  });
  const [paymentState, setPaymentState] = useState<PaymentState>({ status: 'idle' });
  const [quantity, setQuantity] = useState(1);
  const [manualOrderStatus, setManualOrderStatus] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadListing = async () => {
      const response = await fetchPublicListing(listingId);
      if (!active) {
        return;
      }
      if (!response.listing) {
        const cartItem = cartItems.find((item) => item.id === listingId);
        if (cartItem) {
          setListingState({
            status: 'ready',
            listing: {
              id: cartItem.id,
              title: cartItem.title,
              description: 'Item adicionado ao carrinho.',
              priceCents: cartItem.priceCents,
              currency: cartItem.currency,
              status: 'PUBLISHED',
              deliveryType: 'MANUAL',
              media: cartItem.image
                ? [{ id: `cart-${cartItem.id}`, url: cartItem.image, type: 'IMAGE', position: 0 }]
                : [],
            },
            source: 'cart',
          });
          return;
        }
      }
      setListingState({
        status: 'ready',
        listing: response.listing,
        source: response.source,
        error: response.error,
      });
    };
    loadListing().catch(() => {
      if (!active) {
        return;
      }
      const cartItem = cartItems.find((item) => item.id === listingId);
      if (cartItem) {
        setListingState({
          status: 'ready',
          listing: {
            id: cartItem.id,
            title: cartItem.title,
            description: 'Item adicionado ao carrinho.',
            priceCents: cartItem.priceCents,
            currency: cartItem.currency,
            status: 'PUBLISHED',
            deliveryType: 'MANUAL',
            media: cartItem.image
              ? [{ id: `cart-${cartItem.id}`, url: cartItem.image, type: 'IMAGE', position: 0 }]
              : [],
          },
          source: 'cart',
        });
        return;
      }
      setListingState((prev) => ({
        ...prev,
        status: 'ready',
        error: 'Nao foi possivel carregar o anuncio.',
      }));
    });
    return () => {
      active = false;
    };
  }, [listingId, cartItems]);

  const totalAmount = useMemo(() => {
    if (!listingState.listing) {
      return 0;
    }
    return listingState.listing.priceCents * quantity;
  }, [listingState.listing, quantity]);

  const checkoutBlockedReason = useMemo(() => {
    if (!listingState.listing) {
      return 'Anuncio indisponivel.';
    }
    if (listingState.source === 'fallback') {
      return 'Checkout indisponivel no modo offline.';
    }
    if (listingState.listing.status !== 'PUBLISHED') {
      return 'Anuncio nao esta publicado.';
    }
    if (quantity < 1) {
      return 'Informe a quantidade.';
    }
    return null;
  }, [listingState, quantity]);

  const handleCheckout = async () => {
    if (!accessToken || !listingState.listing || checkoutBlockedReason) {
      return;
    }
    setPaymentState({ status: 'loading' });
    try {
      const data = await ordersApi.checkout(accessToken, listingId, quantity);
      setPaymentState({ status: 'ready', data });
      router.push(`/conta/pedidos/${data.order.id}/pagamentos`);
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Nao foi possivel iniciar o pagamento.';
      setPaymentState({ status: 'idle', error: message });
    }
  };

  const handleCreateOrder = async () => {
    if (!accessToken || !listingState.listing || checkoutBlockedReason) {
      return;
    }
    setManualOrderStatus(null);
    try {
      const order = await ordersApi.createOrder(accessToken, listingId, quantity);
      setManualOrderStatus('Pedido criado. Acompanhe na sua conta.');
      router.push(`/conta/pedidos/${order.id}`);
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Nao foi possivel criar o pedido.';
      setManualOrderStatus(message);
    }
  };

  const listingImage =
    listingState.listing?.media?.[0]?.url ?? '/assets/meoow/highlight-01.webp';

  return (
    <section className="bg-meow-50/60 px-4 py-10">
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-meow-charcoal">Checkout</h1>
            <p className="text-sm text-meow-muted">Confirme o pedido e gere o Pix.</p>
          </div>
          <Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} href={`/anuncios/${listingId}`}>
            Voltar ao anuncio
          </Link>
        </div>

        {listingState.status === 'loading' ? (
          <div className="mt-6 rounded-2xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
            Carregando anuncio...
          </div>
        ) : null}

        {listingState.error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {listingState.error}
          </div>
        ) : null}

        {!listingState.listing && listingState.status === 'ready' ? (
          <div className="mt-6 rounded-2xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
            Anuncio nao encontrado.
          </div>
        ) : null}

        {listingState.listing ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="rounded-[28px] border border-slate-100 p-6 shadow-card">
              <div className="flex flex-wrap items-center gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-2xl bg-slate-100">
                  <img src={listingImage} alt={listingState.listing.title} className="h-full w-full object-cover" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-meow-charcoal">
                    {listingState.listing.title}
                  </h2>
                  <p className="text-sm text-meow-muted">
                    {listingState.listing.description ?? 'Descricao nao informada.'}
                  </p>
                  <Badge variant="pink" className="mt-2">
                    {statusLabel[listingState.listing.status] ?? listingState.listing.status}
                  </Badge>
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                <div className="flex items-center justify-between text-sm text-meow-muted">
                  <span>Preco unitario</span>
                  <strong className="text-meow-charcoal">
                    {formatCurrency(
                      listingState.listing.priceCents,
                      listingState.listing.currency,
                    )}
                  </strong>
                </div>

                <label className="grid gap-2 text-xs font-semibold text-meow-muted">
                  Quantidade
                  <Input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(Math.max(1, Number(event.target.value || 1)))
                    }
                  />
                </label>

                <div className="flex items-center justify-between text-sm text-meow-muted">
                  <span>Total</span>
                  <strong className="text-lg text-meow-charcoal">
                    {formatCurrency(totalAmount, listingState.listing.currency)}
                  </strong>
                </div>

                {checkoutBlockedReason ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {checkoutBlockedReason}
                  </div>
                ) : null}
              </div>

              {!loading && !user ? (
                <div className="mt-6 rounded-xl border border-meow-red/20 bg-meow-50 px-4 py-3 text-sm text-meow-muted">
                  Faca login para concluir o pedido.
                </div>
              ) : null}

              {!loading && user ? (
                <div className="mt-6 grid gap-3">
                  <button
                    className={buttonVariants({ variant: 'primary' })}
                    type="button"
                    onClick={handleCheckout}
                    disabled={Boolean(checkoutBlockedReason) || paymentState.status === 'loading'}
                  >
                    {paymentState.status === 'loading' ? 'Gerando Pix...' : 'Gerar Pix'}
                  </button>
                  <button
                    className={buttonVariants({ variant: 'secondary' })}
                    type="button"
                    onClick={handleCreateOrder}
                    disabled={Boolean(checkoutBlockedReason)}
                  >
                    Criar pedido sem Pix
                  </button>
                </div>
              ) : null}

              {manualOrderStatus ? (
                <div className="mt-4 rounded-xl border border-meow-red/20 bg-meow-50 px-4 py-3 text-sm text-meow-muted">
                  {manualOrderStatus}
                </div>
              ) : null}
            </Card>

            <Card className="rounded-[28px] border border-slate-100 p-6 shadow-card">
              <h3 className="text-base font-bold text-meow-charcoal">Pagamento Pix</h3>
              <p className="mt-2 text-sm text-meow-muted">
                Clique em "Gerar Pix" para abrir o pagamento e seguir para o QR code.
              </p>
              {paymentState.error ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {paymentState.error}
                </div>
              ) : null}
              {paymentState.status === 'loading' ? (
                <div className="mt-4 rounded-xl border border-meow-red/20 bg-meow-50 px-4 py-3 text-sm text-meow-muted">
                  Gerando cobranca...
                </div>
              ) : null}
              {paymentState.status === 'ready' && paymentState.data ? (
                <div className="mt-4 rounded-xl border border-meow-red/20 bg-meow-cream/60 px-4 py-3 text-sm text-meow-muted">
                  Pedido #{paymentState.data.order.id.slice(0, 8).toUpperCase()} criado. Abrindo pagamento...
                </div>
              ) : null}
            </Card>
          </div>
        ) : null}
      </div>
    </section>
  );
};
