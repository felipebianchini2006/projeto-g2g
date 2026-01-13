import Link from 'next/link';

export default function Page() {
  return (
    <section className="bg-white px-6 py-12">
      <div className="mx-auto w-full max-w-[960px]">
        <div className="text-xs text-meow-muted">
          <Link href="/" className="font-semibold text-meow-deep">
            Inicio
          </Link>{' '}
          &gt; Institucional &gt; Sobre nos
        </div>
        <h1 className="mt-6 text-2xl font-black text-meow-charcoal">Sobre nos</h1>
        <p className="mt-3 text-sm text-meow-muted">
          Texto institucional em construcao. Aqui vamos contar a historia da Meoww
          Games, a missão da plataforma e o compromisso com compradores e vendedores.
        </p>
        <p className="mt-4 text-sm text-meow-muted">
          Este conteúdo será atualizado com a versão final aprovada pelo time.
        </p>
      </div>
    </section>
  );
}
