import Link from 'next/link';

export default function Page() {
  return (
    <section className="bg-white px-6 py-12">
      <div className="mx-auto w-full max-w-[960px]">
        <div className="text-xs text-meow-muted">
          <Link href="/" className="font-semibold text-meow-deep">
            Inicio
          </Link>{' '}
          &gt; Institucional &gt; Politica de privacidade
        </div>
        <h1 className="mt-6 text-2xl font-black text-meow-charcoal">
          Politica de privacidade
        </h1>
        <p className="mt-3 text-sm text-meow-muted">
          Este conteúdo será atualizado com a politica completa de privacidade,
          incluindo uso de dados, cookies e direitos dos usuarios.
        </p>
        <p className="mt-4 text-sm text-meow-muted">
          Placeholder: a Meoww Games trata dados pessoais para autenticar usuarios,
          processar pagamentos e melhorar a experiência.
        </p>
      </div>
    </section>
  );
}
