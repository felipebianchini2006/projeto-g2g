import { TicketDetailContent } from '../../../../../components/pages/ticket-detail-page';

type TicketDetailPageProps = {
  params: { id: string };
};

export default function Page({ params }: TicketDetailPageProps) {
  return <TicketDetailContent ticketId={params.id} />;
}
