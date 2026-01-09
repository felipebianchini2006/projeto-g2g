'use client';

import Link from 'next/link';

import { useSite } from '../site-context';

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

export const CartContent = () => {
  const { cartItems, removeFromCart } = useSite();

  const total = cartItems.reduce(
    (acc, item) => acc + item.priceCents * item.quantity,
    0,
  );

  const checkoutHref = cartItems[0] ? `/checkout/${cartItems[0].id}` : '/produtos';

  return (
    <section className="bg-white px-6 py-10">
      <div className="mx-auto w-full max-w-[1000px]">
        <div className="text-xs text-meow-muted">
          <Link href="/" className="font-semibold text-meow-deep">
            Inicio
          </Link>{' '}
          &gt; Carrinho
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-black text-meow-charcoal">Carrinho</h1>
          <Link href="/produtos" className="text-sm font-semibold text-meow-deep">
            Continuar comprando
          </Link>
        </div>

        {cartItems.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-meow-red/20 bg-meow-cream/50 px-6 py-8 text-center text-sm text-meow-muted">
            Seu carrinho esta vazio.
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-meow-red/20 bg-white p-4 shadow-[0_10px_24px_rgba(216,107,149,0.12)]"
              >
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 overflow-hidden rounded-xl bg-meow-cream">
                    <img
                      src={item.image ?? '/assets/meoow/highlight-01.webp'}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-meow-charcoal">
                      {item.title}
                    </p>
                    <p className="text-xs text-meow-muted">
                      {item.quantity} x {formatCurrency(item.priceCents, item.currency)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-meow-charcoal">
                    {formatCurrency(item.priceCents * item.quantity, item.currency)}
                  </span>
                  <button
                    type="button"
                    className="rounded-full border border-meow-red/30 px-3 py-1 text-xs font-bold text-meow-deep"
                    onClick={() => removeFromCart(item.id)}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-meow-red/20 bg-white p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
              <div className="text-sm font-semibold text-meow-muted">Total</div>
              <div className="text-2xl font-black text-meow-charcoal">
                {formatCurrency(total, cartItems[0]?.currency ?? 'BRL')}
              </div>
              <Link
                href={checkoutHref}
                className="rounded-full bg-meow-linear px-6 py-2 text-sm font-bold text-white"
              >
                Comprar
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
