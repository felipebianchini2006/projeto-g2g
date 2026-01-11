import { TicketsListContent } from '../../../components/pages/tickets-list-page';

type TicketsPageProps = {
  searchParams?: Promise<{ orderId?: string }>;
};

export default async function Page({ searchParams }: TicketsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  return <TicketsListContent initialOrderId={params?.orderId} />;
}
