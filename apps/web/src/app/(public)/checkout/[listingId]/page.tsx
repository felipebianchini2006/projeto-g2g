import type { Metadata } from 'next';

import { CheckoutContent } from '../../../../components/pages/checkout-page';

type CheckoutPageProps = {
  params: Promise<{ listingId: string }>;
};

export const metadata: Metadata = {
  title: 'Meoww Games - Checkout',
  description: 'Finalize seu pedido com pagamento Pix.',
};

export default async function Page({ params }: CheckoutPageProps) {
  const { listingId } = await params;
  return <CheckoutContent listingId={listingId} />;
}
