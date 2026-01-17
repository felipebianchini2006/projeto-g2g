'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Barcode,
  CheckCircle2,
  Copy,
  CreditCard,
  Crown,
  Download,
  Gem,
  Lock,
  Package,
  QrCode,
  Star,
} from 'lucide-react';

import { ApiClientError } from '../../lib/api-client';
import {
  fetchPublicListing,
  type PublicListing,
  validateCoupon,
  type CouponValidationResponse,
} from '../../lib/marketplace-public';
import { ordersApi, type CheckoutResponse, type Order } from '../../lib/orders-api';
import { paymentsApi, type PixPayment } from '../../lib/payments-api';
import { useAuth } from '../auth/auth-provider';
import { useSite } from '../site-context';
import { Badge } from '../ui/badge';
import { buttonVariants } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

const REFERRAL_COOKIE = 'g2g_ref_partner';

const readCookieValue = (name: string) => {
  if (typeof document === 'undefined') {
    return null;
  }
  const entry = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  if (!entry) {
    return null;
  }
  return decodeURIComponent(entry.split('=')[1] ?? '').trim() || null;
};

const resolveQrImage = (value?: string | null) => {
  if (!value) {
    return null;
  }
  if (value.startsWith('data:image') || value.startsWith('http')) {
    return value;
  }
  return null;
};

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

type CheckoutStep = 'produto' | 'pagamento' | 'confirmacao';

type PackageOption = {
  id: 'standard' | 'premium' | 'ultimate';
  label: string;
  description: string;
  deltaCents: number;
  highlight?: string;
};

const packageOptions: PackageOption[] = [
  {
    id: 'standard',
    label: 'Padrão',
    description: 'Preço normal',
    deltaCents: 0,
  },
  {
    id: 'premium',
    label: 'Premium',
    description: 'Suporte prioritário',
    deltaCents: 0,
  },
];

const stepConfig = [
  { id: 'produto', label: 'PRODUTO', icon: Package },
  { id: 'pagamento', label: 'PAGAMENTO', icon: CreditCard },
  { id: 'confirmacao', label: 'CONFIRMAÇÃO', icon: CheckCircle2 },
] as const;

export const CheckoutContent = ({ listingId }: { listingId: string }) => {
  const { user, accessToken, loading } = useAuth();
  const { cartItems } = useSite();
  const [listingState, setListingState] = useState<ListingState>({
    status: 'loading',
    listing: null,
    source: 'api',
  });
  const [paymentState, setPaymentState] = useState<PaymentState>({ status: 'idle' });
  const [step, setStep] = useState<CheckoutStep>('produto');
  const [quantity] = useState(1);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponData, setCouponData] = useState<CouponValidationResponse | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageOption>(
    packageOptions[1] ?? packageOptions[0]!,
  );
  const [referralSlug, setReferralSlug] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [pixPayment, setPixPayment] = useState<PixPayment | null>(null);
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
        error: 'Não foi possível carregar o anúncio.',
      }));
    });
    return () => {
      active = false;
    };
  }, [listingId, cartItems]);

  useEffect(() => {
    setReferralSlug(readCookieValue(REFERRAL_COOKIE));
  }, []);

  useEffect(() => {
    setCouponError(null);
  }, [couponCode]);

  useEffect(() => {
    if (!accessToken || !order || step !== 'pagamento') {
      return;
    }
    let active = true;
    const poll = async () => {
      try {
        const data = await ordersApi.getOrder(accessToken, order.id);
        if (!active) {
          return;
        }
        setOrder(data);
        if (['PAID', 'IN_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(data.status)) {
          setStep('confirmacao');
        }
      } catch {
        // Ignore polling errors.
      }
    };
    poll();
    const intervalId = setInterval(poll, 8000);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [accessToken, order, step]);

  const listing = listingState.listing;
  const listingImage = listing?.media?.[0]?.url ?? '/assets/meoow/highlight-01.webp';
  const sellerLabel = 'Marketplace';
  const selectedPriceCents = (listing?.priceCents ?? 0) + selectedPackage.deltaCents;
  const oldPriceCents =
    listing?.oldPriceCents && listing.oldPriceCents > 0
      ? listing.oldPriceCents + selectedPackage.deltaCents
      : null;
  const discountPercent =
    oldPriceCents && oldPriceCents > selectedPriceCents
      ? Math.round((1 - selectedPriceCents / oldPriceCents) * 100)
      : null;

  const serviceFeeCents =
    selectedPackage.id === 'premium'
      ? Math.round((listing?.priceCents ?? 0) * 0.2)
      : 1500;
  const subtotalCents = selectedPriceCents * quantity + serviceFeeCents;

  let couponDiscountValue = 0;
  if (couponData) {
    if (couponData.discountBps) {
      couponDiscountValue = Math.round(subtotalCents * (couponData.discountBps / 10000));
    } else if (couponData.discountCents) {
      couponDiscountValue = couponData.discountCents;
    }
  }

  const subtotalAfterCoupon = Math.max(subtotalCents - couponDiscountValue, 0);
  const pixDiscountCents = Math.round(subtotalAfterCoupon * 0.05);
  const estimatedTotalCents = Math.max(subtotalAfterCoupon - pixDiscountCents, 0);

  const checkoutBlockedReason = useMemo(() => {
    if (!listing) {
      return 'Anúncio indisponivel.';
    }
    if (listingState.source === 'fallback') {
      return 'Checkout indisponivel no modo offline.';
    }
    if (listing.status !== 'PUBLISHED') {
      return 'Anúncio não esta publicado.';
    }
    return null;
  }, [listing, listingState.source]);

  const activePayment = paymentState.data?.payment ?? pixPayment;
  const qrImage = resolveQrImage(activePayment?.qrCode ?? null);

  const handleApplyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) {
      setCouponError('Digite um cupom valido.');
      return;
    }
    const result = await validateCoupon(code);
    if (result.error || (!result.discountBps && !result.discountCents)) {
      setCouponError(result.error ?? 'Cupom inválido');
      setAppliedCoupon(null);
      setCouponData(null);
      return;
    }
    setAppliedCoupon(result.code);
    setCouponData(result);
    setCouponError(null);
  };

  const handleCheckout = async () => {
    if (!accessToken || !listing || checkoutBlockedReason) {
      return;
    }
    setPaymentState({ status: 'loading' });
    try {
      const data = await ordersApi.checkout(accessToken, listingId, quantity, {
        couponCode: appliedCoupon ?? undefined,
        referralSlug: referralSlug ?? undefined,
      });
      setPaymentState({ status: 'ready', data });
      setOrder(data.order);
      setStep('pagamento');
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível iniciar o pagamento.';
      try {
        const createdOrder = await ordersApi.createOrder(accessToken, listingId, quantity, {
          couponCode: appliedCoupon ?? undefined,
          referralSlug: referralSlug ?? undefined,
        });
        const pix = await paymentsApi.createPix(accessToken, createdOrder.id);
        setOrder(createdOrder);
        setPixPayment(pix);
        setPaymentState({ status: 'ready', error: message });
        setStep('pagamento');
      } catch (fallbackError) {
        const fallbackMessage =
          fallbackError instanceof ApiClientError
            ? fallbackError.message
            : fallbackError instanceof Error
              ? fallbackError.message
              : message;
        setPaymentState({ status: 'idle', error: fallbackMessage });
      }
    }
  };

  const handleCopyPix = async () => {
    if (!activePayment?.copyPaste) {
      return;
    }
    try {
      await navigator.clipboard.writeText(activePayment.copyPaste);
      setCopyStatus('Copiado!');
    } catch {
      setCopyStatus('Não foi possível copiar.');
    }
  };

  const handleCreatePix = async () => {
    if (!accessToken || !order) {
      return;
    }
    try {
      const pix = await paymentsApi.createPix(accessToken, order.id);
      setPixPayment(pix);
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível gerar o Pix.';
      setPaymentState({ status: 'ready', error: message });
    }
  };

  const stepIndex = stepConfig.findIndex((item) => item.id === step);

  return (
    <section className="bg-meow-50/60 px-4 py-10">
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-meow-charcoal">Checkout</h1>
            <p className="text-sm text-meow-muted">
              Escolha o pacote, pague e acompanhe a entrega.
            </p>
          </div>
          <Link
            className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            href={`/anuncios/${listingId}`}
          >
            Voltar ao anúncio
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow-card">
          <div className="relative flex items-center justify-between">
            <span className="absolute left-6 right-6 top-1/2 h-px -translate-y-1/2 bg-slate-200" />
            {stepConfig.map((item, index) => {
              const isActive = index <= stepIndex;
              const Icon = item.icon;
              return (
                <div key={item.id} className="relative z-10 flex flex-1 flex-col items-center gap-2">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold ${isActive
                      ? 'border-meow-300 bg-meow-300 text-white'
                      : 'border-slate-200 bg-white text-slate-400'
                      }`}
                  >
                    <Icon size={18} aria-hidden />
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {listingState.status === 'loading' ? (
          <div className="mt-6 rounded-2xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
            Carregando anúncio...
          </div>
        ) : null}

        {listingState.error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {listingState.error}
          </div>
        ) : null}

        {!listing && listingState.status === 'ready' ? (
          <div className="mt-6 rounded-2xl border border-meow-red/20 bg-white px-4 py-3 text-sm text-meow-muted">
            Anúncio não encontrado.
          </div>
        ) : null}

        {listing ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              {step === 'produto' ? (
                <>
                  <Card className="rounded-2xl border border-slate-100 p-6 shadow-card">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                        <Download size={20} aria-hidden />
                      </span>
                      <div>
                        <h2 className="text-base font-bold text-meow-charcoal">
                          Produto Digital
                        </h2>
                        <p className="mt-1 text-sm text-meow-muted">
                          Você recebera os dados de acesso (Email/Senha) imediatamente
                          após a confirmação do pagamento. Entrega automática 24/7.
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="rounded-2xl border border-slate-100 p-6 shadow-card">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                        <Crown size={20} aria-hidden />
                      </span>
                      <div>
                        <h2 className="text-base font-bold text-meow-charcoal">
                          Escolha seu Pacote
                        </h2>
                        <p className="text-sm text-meow-muted">
                          Selecione a edição ideal para você.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      {packageOptions.map((option) => {
                        const isActive = selectedPackage.id === option.id;
                        const optionPrice = (listing.priceCents ?? 0) + option.deltaCents;
                        const optionOldPrice =
                          listing.oldPriceCents && listing.oldPriceCents > 0
                            ? listing.oldPriceCents + option.deltaCents
                            : null;
                        const optionDiscount =
                          optionOldPrice && optionOldPrice > optionPrice
                            ? Math.round((1 - optionPrice / optionOldPrice) * 100)
                            : null;
                        const isPremium = option.id === 'premium';
                        const starColorClass = isPremium ? 'text-yellow-400' : 'text-blue-500';

                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setSelectedPackage(option)}
                            className={`rounded-2xl border p-4 text-left transition ${isActive
                              ? 'border-meow-300 bg-meow-100/60 shadow-cute'
                              : 'border-transparent bg-white hover:border-meow-200'
                              }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 ${starColorClass}`}>
                                  <Star size={18} fill="currentColor" />
                                </span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold text-meow-charcoal">
                                      {option.label}
                                    </h3>
                                    {option.highlight ? (
                                      <Badge variant="warning" className="text-[9px]">
                                        {option.highlight}
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <p className="text-xs text-meow-muted">
                                    {option.description}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                              <div className="flex flex-col">
                                {optionOldPrice ? (
                                  <span className="text-[10px] text-slate-400 line-through">
                                    {formatCurrency(optionOldPrice, listing.currency)}
                                  </span>
                                ) : null}
                                <p className="text-lg font-black text-meow-300">
                                  {formatCurrency(optionPrice, listing.currency)}
                                </p>
                              </div>

                              {optionDiscount ? (
                                <Badge variant="success" className="text-[9px]">
                                  -{optionDiscount}%
                                </Badge>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                </>
              ) : null}

              {step === 'pagamento' ? (
                <>
                  <Card className="rounded-2xl border border-slate-100 p-6 shadow-card">
                    <h2 className="text-base font-bold text-meow-charcoal">
                      Método de pagamento
                    </h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {[
                        { id: 'pix', label: 'Pix', helper: '-5% OFF', active: true, icon: QrCode },
                        {
                          id: 'card',
                          label: 'Cartao',
                          helper: 'Ate 12x',
                          active: false,
                          icon: CreditCard,
                        },
                        {
                          id: 'boleto',
                          label: 'Boleto',
                          helper: '+2 dias',
                          active: false,
                          icon: Barcode,
                        },
                      ].map((method) => {
                        const Icon = method.icon;
                        return (
                          <div
                            key={method.id}
                            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${method.active
                              ? 'border-meow-300 bg-meow-100/60 text-meow-deep'
                              : 'border-slate-100 bg-slate-50 text-slate-400'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500">
                                  <Icon size={16} aria-hidden />
                                </span>
                                {method.label}
                              </span>
                              {method.active ? (
                                <Badge variant="success" className="text-[9px]">
                                  {method.helper}
                                </Badge>
                              ) : (
                                <span className="text-[10px] font-bold uppercase">Em breve</span>
                              )}
                            </div>
                            <p className="mt-2 text-xs text-slate-500">{method.helper}</p>
                          </div>
                        )
                      })}
                    </div>
                  </Card>

                  <Card className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 shadow-card">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                        <QrCode size={20} aria-hidden />
                      </span>
                      <div>
                        <h2 className="text-base font-bold text-meow-charcoal">
                          Pix - Pagamento rápido
                        </h2>
                        <p className="text-sm text-meow-muted">
                          5% de desconto aplicado no Pix.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-dashed border-emerald-300 bg-white p-4">
                      {qrImage ? (
                        <img src={qrImage} alt="QR Code Pix" className="mx-auto h-44 w-44" />
                      ) : null}
                      {activePayment?.qrCode && !qrImage ? (
                        <p className="text-xs text-meow-muted">{activePayment.qrCode}</p>
                      ) : null}
                      {!activePayment ? (
                        <p className="text-sm text-meow-muted">
                          Gere o Pix para visualizar o QR Code.
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-meow-muted">Valor</p>
                        <p className="text-lg font-black text-meow-charcoal">
                          {order
                            ? formatCurrency(order.totalAmountCents, order.currency)
                            : formatCurrency(estimatedTotalCents, listing.currency)}
                        </p>
                        <span className="text-[11px] font-bold uppercase text-emerald-600">
                          5% de desconto aplicado
                        </span>
                      </div>
                      <button
                        type="button"
                        className={buttonVariants({
                          variant: 'primary',
                          size: 'sm',
                          className: 'gap-2 bg-emerald-500 hover:bg-emerald-600',
                        })}
                        onClick={handleCopyPix}
                        disabled={!activePayment?.copyPaste}
                      >
                        <Copy size={14} aria-hidden />
                        Copiar Codigo Pix
                      </button>
                    </div>

                    {copyStatus ? (
                      <div className="mt-2 text-xs font-semibold text-meow-muted">
                        {copyStatus}
                      </div>
                    ) : null}

                    {paymentState.error ? (
                      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                        {paymentState.error}
                      </div>
                    ) : null}

                    {!activePayment && accessToken ? (
                      <button
                        type="button"
                        className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                        onClick={handleCreatePix}
                      >
                        Gerar Pix
                      </button>
                    ) : null}
                  </Card>
                </>
              ) : null}

              {step === 'confirmacao' ? (
                <Card className="rounded-2xl border border-slate-100 p-6 text-center shadow-card">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 size={28} aria-hidden />
                  </div>
                  <h2 className="mt-4 text-xl font-black text-meow-charcoal">
                    Pagamento confirmado!
                  </h2>
                  <p className="mt-2 text-sm text-meow-muted">
                    Você pode acompanhar a entrega em Minhas Compras.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    {order ? (
                      <Link
                        href={`/conta/pedidos/${order.id}`}
                        className={buttonVariants({ variant: 'primary' })}
                      >
                        Ver pedido
                      </Link>
                    ) : null}
                    <Link
                      href="/"
                      className={buttonVariants({ variant: 'secondary' })}
                    >
                      Voltar para Home
                    </Link>
                  </div>
                </Card>
              ) : null}
            </div>

            <div>
              <Card className="rounded-2xl border border-slate-100 p-6 shadow-card">
                <h3 className="text-base font-bold text-meow-charcoal">Resumo</h3>
                <div className="mt-4 flex items-center gap-4">
                  <div className="h-16 w-16 overflow-hidden rounded-2xl bg-slate-100">
                    <img src={listingImage} alt={listing.title} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-meow-charcoal">
                      {listing.title}
                    </p>
                    <p className="text-xs text-meow-muted">Vendedor: {sellerLabel}</p>
                    <Badge variant="success" className="mt-2 text-[9px]">
                      Verificado
                    </Badge>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 text-sm text-meow-muted">
                  <div className="flex items-center justify-between">
                    <span>{selectedPackage.label}</span>
                    <strong className="text-meow-charcoal">
                      {formatCurrency(selectedPriceCents, listing.currency)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Taxa de Servico</span>
                    <strong className="text-meow-charcoal">
                      {formatCurrency(serviceFeeCents, listing.currency)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Desconto Pix (5%)</span>
                    <strong className="text-emerald-600">
                      -{formatCurrency(pixDiscountCents, listing.currency)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-base font-bold text-meow-300">
                    <span>Total a pagar</span>
                    <span>
                      {order
                        ? formatCurrency(order.totalAmountCents, order.currency)
                        : formatCurrency(estimatedTotalCents, listing.currency)}
                    </span>
                  </div>
                  <p className="mt-2 text-[10px] text-center text-meow-muted">
                    O valor do produto e somado a uma taxa operacional de 0,95 centavos
                  </p>
                </div>

                <div className="mt-5">
                  <label className="text-xs font-semibold uppercase text-meow-muted">
                    Cupom
                  </label>
                  <div className="mt-2 flex gap-2">
                    <Input
                      placeholder="Digite o cupom"
                      value={couponCode}
                      onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                      readOnly={step !== 'produto'}
                    />
                    <button
                      type="button"
                      className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                      onClick={handleApplyCoupon}
                      disabled={step !== 'produto'}
                    >
                      Aplicar
                    </button>
                  </div>
                  {couponError ? (
                    <p className="mt-2 text-xs text-red-500">{couponError}</p>
                  ) : null}
                  {appliedCoupon ? (
                    <p className="mt-2 text-xs text-emerald-600">
                      Cupom {appliedCoupon} aplicado.
                    </p>
                  ) : null}
                  {couponDiscountValue > 0 ? (
                    <p className="mt-1 text-xs text-emerald-600 font-bold">
                      Desconto: -{formatCurrency(couponDiscountValue, listing.currency)}
                    </p>
                  ) : null}
                </div>

                {checkoutBlockedReason ? (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {checkoutBlockedReason}
                  </div>
                ) : null}

                {!loading && !user ? (
                  <div className="mt-4 rounded-xl border border-meow-red/20 bg-meow-50 px-4 py-3 text-sm text-meow-muted">
                    Faca login para concluir o pedido.
                  </div>
                ) : null}

                {!loading && user && step === 'produto' ? (
                  <div className="mt-5">
                    <button
                      className={buttonVariants({
                        variant: 'primary',
                        className: 'w-full gap-2 bg-emerald-500 hover:bg-emerald-600',
                      })}
                      type="button"
                      onClick={handleCheckout}
                      disabled={Boolean(checkoutBlockedReason) || paymentState.status === 'loading'}
                    >
                      <CheckCircle2 size={16} aria-hidden />
                      {paymentState.status === 'loading'
                        ? 'Gerando Pix...'
                        : 'Finalizar Compra'}
                    </button>
                  </div>
                ) : null}

                {step === 'pagamento' ? (
                  <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-meow-muted">
                    <Lock size={14} aria-hidden />
                    COMPRA 100% SEGURA
                  </div>
                ) : null}
              </Card>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};
