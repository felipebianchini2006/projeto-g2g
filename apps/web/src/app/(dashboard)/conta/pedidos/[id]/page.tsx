import { AccountOrderDetailContent } from '../../../../../components/pages/account-order-detail-page';

type OrderDetailPageProps = {
  params: { id: string };
};

export default function Page({ params }: OrderDetailPageProps) {
  return <AccountOrderDetailContent orderId={params.id} />;
}
