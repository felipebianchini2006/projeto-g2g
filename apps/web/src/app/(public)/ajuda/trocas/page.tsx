import Link from 'next/link';

export default function Page() {
  return (
    <section className="bg-white px-6 py-12">
      <div className="mx-auto w-full max-w-[960px]">
        <div className="text-xs text-meow-muted">
          <Link href="/" className="font-semibold text-meow-deep">
            Inicio
          </Link>{' '}
          &gt; Ajuda &gt; Trocas e devolucoes
        </div>
        <h1 className="mt-6 text-2xl font-black text-meow-charcoal">
          Trocas e devolucoes
        </h1>
        <p className="mt-3 text-sm text-meow-muted">
          Produtos digitais possuem regras especificas. Caso haja problema na
          entrega, use o chat do pedido e, se necessario, abra disputa.
        </p>
        <ul className="mt-4 grid gap-2 text-sm text-meow-muted">
          <li>Pedidos com entrega automatica sao liberados apos pagamento.</li>
          <li>Para entrega manual, aguarde o prazo combinado com o vendedor.</li>
          <li>Em caso de divergencia, abra disputa em ate 7 dias.</li>
        </ul>
      </div>
    </section>
  );
}
