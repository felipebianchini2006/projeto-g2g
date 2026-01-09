'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ApiClientError } from '../../lib/api-client';
import { fetchPublicListing, type PublicListing } from '../../lib/marketplace-public';
import { ordersApi, type CheckoutResponse } from '../../lib/orders-api';
import { useAuth } from '../auth/auth-provider';
import { useSite } from '../site-context';

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

const statusLabel: Record<string, string> = {
  CREATED: 'Criado',
  AWAITING_PAYMENT: 'Aguardando pagamento',
  PAID: 'Pago',
  IN_DELIVERY: 'Em entrega',
  DELIVERED: 'Entregue',
  COMPLETED: 'Concluido',
  CANCELLED: 'Cancelado',
  DISPUTED: 'Em disputa',
  REFUNDED: 'Reembolsado',
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
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

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
    setCopyStatus(null);
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

  const handleCopy = async () => {
    const payload = paymentState.data?.payment.copyPaste;
    if (!payload) {
      return;
    }
    try {
      await navigator.clipboard.writeText(payload);
      setCopyStatus('Codigo copiado.');
    } catch {
      setCopyStatus('Nao foi possivel copiar o codigo.');
    }
  };

  return (
    <section className="checkout-shell">
      <div className="container">
        <div className="checkout-header">
          <div>
            <h1>Checkout</h1>
            <p className="auth-helper">Confirme o pedido e gere o Pix.</p>
          </div>
          <Link className="ghost-button" href={`/anuncios/${listingId}`}>
            Voltar ao anuncio
          </Link>
        </div>

        {listingState.status === 'loading' ? (
          <div className="state-card">Carregando anuncio...</div>
        ) : null}

        {listingState.error ? (
          <div className="state-card info">{listingState.error}</div>
        ) : null}

        {!listingState.listing && listingState.status === 'ready' ? (
          <>
            <div className="state-card">Anuncio nao encontrado.</div>
            <Link className="ghost-button" href="/produtos">
              Voltar ao catalogo
            </Link>
          </>
        ) : null}

        {listingState.listing ? (
          <>
            {loading ? (
              <div className="state-card">Carregando sessao...</div>
            ) : null}

            {!loading && !user ? (
              <>
                <div className="state-card">Faca login para concluir o pedido.</div>
                <Link className="primary-button" href={`/login?next=/checkout/${listingId}`}>
                  Fazer login
                </Link>
              </>
            ) : null}

            {!loading && user ? (
              <div className="checkout-grid">
                <div className="checkout-card">
                  <div className="checkout-listing">
                    <img
                      src={
                        listingState.listing.media?.[0]?.url ?? '/assets/meoow/highlight-01.webp'
                      }
                      alt={listingState.listing.title}
                    />
                    <div>
                      <h2>{listingState.listing.title}</h2>
                      <p>{listingState.listing.description ?? 'Descricao nao informada.'}</p>
                      <span className="tag-pill tag-status">{listingState.listing.status}</span>
                    </div>
                  </div>

                  <div className="checkout-line">
                    <span className="summary-label">Preco unitario</span>
                    <strong>
                      {formatCurrency(
                        listingState.listing.priceCents,
                        listingState.listing.currency,
                      )}
                    </strong>
                  </div>

                  <label className="form-field">
                    Quantidade
                    <input
                      className="form-input"
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(event) =>
                        setQuantity(Math.max(1, Number(event.target.value || 1)))
                      }
                    />
                  </label>

                  <div className="checkout-total">
                    <span>Total</span>
                    <strong>
                      {formatCurrency(totalAmount, listingState.listing.currency)}
                    </strong>
                  </div>

                  {checkoutBlockedReason ? (
                    <div className="state-card info">{checkoutBlockedReason}</div>
                  ) : null}

                  <button
                    className="primary-button"
                    type="button"
                    onClick={handleCheckout}
                    disabled={Boolean(checkoutBlockedReason) || paymentState.status === 'loading'}
                  >
                    {paymentState.status === 'loading' ? 'Gerando Pix...' : 'Gerar Pix'}
                  </button>
                </div>

                <div className="checkout-card payment-card">
                  <h3>Pagamento Pix</h3>
                  {paymentState.status === 'idle' && !paymentState.error ? (
                    <p className="auth-helper">
                      Gere a cobranca para ver o QR code e o copia e cola.
                    </p>
                  ) : null}
                  {paymentState.status === 'loading' ? (
                    <div className="state-card">Criando cobranca...</div>
                  ) : null}
                  {paymentState.error ? (
                    <div className="state-card error">{paymentState.error}</div>
                  ) : null}

                  {paymentState.status === 'ready' && paymentState.data ? (
                    <div className="payment-details">
                      <div className="payment-meta">
                        <div>
                          <span className="summary-label">Status</span>
                          <strong>
                            {statusLabel[paymentState.data.order.status] ??
                              paymentState.data.order.status}
                          </strong>
                        </div>
                        <div>
                          <span className="summary-label">Expira em</span>
                          <strong>
                            {paymentState.data.payment.expiresAt
                              ? new Date(paymentState.data.payment.expiresAt).toLocaleString('pt-BR')
                              : 'Nao informado'}
                          </strong>
                        </div>
                      </div>

                      <div className="payment-meta">
                        <div>
                          <span className="summary-label">Txid</span>
                          <strong className="mono">{paymentState.data.payment.txid}</strong>
                        </div>
                        <div>
                          <span className="summary-label">Valor</span>
                          <strong>
                            {formatCurrency(
                              paymentState.data.payment.amountCents,
                              paymentState.data.payment.currency,
                            )}
                          </strong>
                        </div>
                      </div>

                      {paymentState.data.payment.qrCode ? (
                        <div className="pix-code mono">{paymentState.data.payment.qrCode}</div>
                      ) : null}

                      {paymentState.data.payment.copyPaste ? (
                        <div className="pix-code mono">
                          {paymentState.data.payment.copyPaste}
                        </div>
                      ) : null}

                      <div className="payment-actions">
                        <button className="ghost-button" type="button" onClick={handleCopy}>
                          Copiar codigo
                        </button>
                        <Link
                          className="primary-button"
                          href={`/dashboard/pedidos/${paymentState.data.order.id}`}
                        >
                          Ver pedido
                        </Link>
                      </div>

                      {copyStatus ? <div className="state-card success">{copyStatus}</div> : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
};
