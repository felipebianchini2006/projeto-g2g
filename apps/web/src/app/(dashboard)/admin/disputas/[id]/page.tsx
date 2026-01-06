import { AdminDisputeDetailContent } from '../../../../../components/pages/admin-dispute-detail-page';

type AdminDisputeDetailPageProps = {
  params: { id: string };
};

export default function Page({ params }: AdminDisputeDetailPageProps) {
  return <AdminDisputeDetailContent disputeId={params.id} />;
}
