import { OrderDetailContent } from '../../../../../components/pages/order-detail-page';

type OrderDetailPageProps = {
  params: { id: string };
};

export default function Page({ params }: OrderDetailPageProps) {
  return <OrderDetailContent orderId={params.id} scope="seller" />;
}
