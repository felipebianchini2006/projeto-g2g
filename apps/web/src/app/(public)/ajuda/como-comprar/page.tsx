import Link from 'next/link';

export default function Page() {
  return (
    <section className="bg-white px-6 py-12">
      <div className="mx-auto w-full max-w-[960px]">
        <div className="text-xs text-meow-muted">
          <Link href="/" className="font-semibold text-meow-deep">
            Inicio
          </Link>{' '}
          &gt; Ajuda &gt; Como comprar
        </div>
        <h1 className="mt-6 text-2xl font-black text-meow-charcoal">Como comprar</h1>
        <ol className="mt-4 grid gap-3 text-sm text-meow-muted">
          <li>1. Busque por anuncios na pagina inicial ou em Categorias.</li>
          <li>2. Abra o anuncio e confira detalhes do produto.</li>
          <li>3. Clique em Comprar para iniciar o checkout.</li>
          <li>4. Gere o Pix e finalize o pagamento dentro do prazo.</li>
          <li>5. Acompanhe o status em Minhas compras e use o chat se precisar.</li>
        </ol>
      </div>
    </section>
  );
}
