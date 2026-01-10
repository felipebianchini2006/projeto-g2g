import { TicketDetailContent } from '../../../../../components/pages/ticket-detail-page';

type TicketDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: TicketDetailPageProps) {
  const { id } = await params;
  return <TicketDetailContent ticketId={id} />;
}
