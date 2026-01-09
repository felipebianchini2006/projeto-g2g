import { OrderPaymentContent } from '../../../../../../components/pages/order-payment-page';

type OrderPaymentPageProps = {
  params: { id: string };
};

export default function Page({ params }: OrderPaymentPageProps) {
  return <OrderPaymentContent orderId={params.id} />;
}
