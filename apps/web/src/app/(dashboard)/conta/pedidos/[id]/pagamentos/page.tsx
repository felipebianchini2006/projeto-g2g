import { OrderPaymentContent } from '../../../../../../components/pages/order-payment-page';

type OrderPaymentPageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: OrderPaymentPageProps) {
  const { id } = await params;
  return <OrderPaymentContent orderId={id} />;
}
