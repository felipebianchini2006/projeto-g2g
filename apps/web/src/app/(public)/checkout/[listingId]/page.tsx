import type { Metadata } from 'next';

import { CheckoutContent } from '../../../../components/pages/checkout-page';

type CheckoutPageProps = {
  params: { listingId: string };
};

export const metadata: Metadata = {
  title: 'Meoww Games - Checkout',
  description: 'Finalize seu pedido com pagamento Pix.',
};

export default function Page({ params }: CheckoutPageProps) {
  return <CheckoutContent listingId={params.listingId} />;
}
