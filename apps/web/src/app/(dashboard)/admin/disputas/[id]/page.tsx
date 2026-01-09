import { AdminDisputeDetailContent } from '../../../../../components/pages/admin-dispute-detail-page';

type AdminDisputeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: AdminDisputeDetailPageProps) {
  const { id } = await params;
  return <AdminDisputeDetailContent disputeId={id} />;
}
