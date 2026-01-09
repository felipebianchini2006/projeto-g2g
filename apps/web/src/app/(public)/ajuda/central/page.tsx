import Link from 'next/link';

export default function Page() {
  return (
    <section className="bg-white px-6 py-12">
      <div className="mx-auto w-full max-w-[960px]">
        <div className="text-xs text-meow-muted">
          <Link href="/" className="font-semibold text-meow-deep">
            Inicio
          </Link>{' '}
          &gt; Ajuda &gt; Central de ajuda
        </div>
        <h1 className="mt-6 text-2xl font-black text-meow-charcoal">Central de ajuda</h1>
        <p className="mt-3 text-sm text-meow-muted">
          Encontre respostas rapidas sobre compras, vendas e pagamentos.
        </p>

        <div className="mt-6 grid gap-4">
          <div className="rounded-2xl border border-meow-red/20 bg-meow-cream/60 px-5 py-4">
            <h2 className="text-sm font-bold text-meow-charcoal">Conta e seguranca</h2>
            <ul className="mt-3 grid gap-2 text-sm text-meow-muted">
              <li>Atualize email e senha sempre que necessario.</li>
              <li>Use senha forte e nao compartilhe dados de acesso.</li>
              <li>Ative notificacoes para acompanhar pedidos.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-meow-red/20 bg-meow-cream/60 px-5 py-4">
            <h2 className="text-sm font-bold text-meow-charcoal">Compras e entregas</h2>
            <ul className="mt-3 grid gap-2 text-sm text-meow-muted">
              <li>Verifique a descricao do anuncio antes de comprar.</li>
              <li>Acompanhe o status em Minhas compras.</li>
              <li>Se houver atraso, entre em contato pelo chat do pedido.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-meow-red/20 bg-meow-cream/60 px-5 py-4">
            <h2 className="text-sm font-bold text-meow-charcoal">Pagamentos</h2>
            <ul className="mt-3 grid gap-2 text-sm text-meow-muted">
              <li>Pagamentos sao processados via Pix.</li>
              <li>Use o codigo copia e cola para concluir o pagamento.</li>
              <li>Pedidos nao pagos expiram automaticamente.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
