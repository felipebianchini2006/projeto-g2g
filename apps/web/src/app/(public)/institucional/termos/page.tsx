import Link from 'next/link';

export default function Page() {
  return (
    <section className="bg-white px-6 py-12">
      <div className="mx-auto w-full max-w-[960px]">
        <div className="text-xs text-meow-muted">
          <Link href="/" className="font-semibold text-meow-deep">
            Inicio
          </Link>{' '}
          &gt; Institucional &gt; Termos de uso
        </div>
        <h1 className="mt-6 text-2xl font-black text-meow-charcoal">Termos de uso</h1>
        <p className="mt-3 text-sm text-meow-muted">
          Este documento trara as regras de uso, responsabilidades de compradores
          e vendedores, e politicas da plataforma.
        </p>
        <p className="mt-4 text-sm text-meow-muted">
          Placeholder: o usuario concorda em fornecer informacoes corretas e seguir
          as politicas de seguranca da Meoww Games.
        </p>
      </div>
    </section>
  );
}
