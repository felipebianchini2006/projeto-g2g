import { TicketsListContent } from '../../../../components/pages/tickets-list-page';

type TicketsPageProps = {
  searchParams?: { orderId?: string };
};

export default function Page({ searchParams }: TicketsPageProps) {
  return <TicketsListContent initialOrderId={searchParams?.orderId} />;
}
