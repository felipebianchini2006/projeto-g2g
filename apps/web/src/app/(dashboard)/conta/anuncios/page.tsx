'use client';

import Link from 'next/link';

export default function Page() {
  return (
    <section className="bg-white px-6 py-10">
      <div className="mx-auto w-full max-w-[980px]">
        <div className="rounded-2xl border border-meow-red/20 bg-white p-6 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
          <h1 className="text-xl font-black text-meow-charcoal">Meus anuncios</h1>
          <p className="mt-2 text-sm text-meow-muted">
            Esta area sera atualizada com o novo layout do /conta.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/anunciar"
              className="rounded-full bg-meow-linear px-5 py-2 text-sm font-bold text-white"
            >
              Criar anuncio
            </Link>
            <Link
              href="/conta"
              className="rounded-full border border-meow-red/30 px-5 py-2 text-sm font-bold text-meow-deep"
            >
              Voltar para conta
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
