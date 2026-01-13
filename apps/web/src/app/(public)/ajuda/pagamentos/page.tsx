import Link from 'next/link';

export default function Page() {
  return (
    <section className="bg-white px-6 py-12">
      <div className="mx-auto w-full max-w-[960px]">
        <div className="text-xs text-meow-muted">
          <Link href="/" className="font-semibold text-meow-deep">
            Inicio
          </Link>{' '}
          &gt; Ajuda &gt; Formas de pagamento
        </div>
        <h1 className="mt-6 text-2xl font-black text-meow-charcoal">
          Formas de pagamento
        </h1>
        <p className="mt-3 text-sm text-meow-muted">
          Atualmente aceitamos pagamentos via Pix. Ao gerar o pagamento, você pode
          copiar o código ou usar o QR Code no aplicativo do seu banco.
        </p>
        <ul className="mt-4 grid gap-2 text-sm text-meow-muted">
          <li>O Pix expira automaticamente se não for pago.</li>
          <li>Se o pagamento falhar, gere um novo código.</li>
          <li>Pedidos confirmados liberam a entrega automaticamente.</li>
        </ul>
      </div>
    </section>
  );
}
