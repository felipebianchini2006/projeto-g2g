import Link from 'next/link';

export default function Page() {
  return (
    <section className="bg-white px-6 py-12">
      <div className="mx-auto w-full max-w-[960px]">
        <div className="text-xs text-meow-muted">
          <Link href="/" className="font-semibold text-meow-deep">
            Inicio
          </Link>{' '}
          &gt; Institucional &gt; Contato
        </div>
        <h1 className="mt-6 text-2xl font-black text-meow-charcoal">Contato</h1>
        <p className="mt-3 text-sm text-meow-muted">
          Este espaco tera os canais oficiais de suporte, horario de atendimento e
          formularios de contato. Em breve adicionaremos os dados oficiais.
        </p>
        <div className="mt-6 rounded-2xl border border-meow-red/20 bg-meow-cream/60 px-5 py-4 text-sm text-meow-muted">
          Placeholder: suporte@meoww.games | (11) 0000-0000
        </div>
      </div>
    </section>
  );
}
