import { OrderDetailContent } from '../../../../../components/pages/order-detail-page';

type OrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: OrderDetailPageProps) {
  const { id } = await params;
  return <OrderDetailContent orderId={id} scope="buyer" />;
}
