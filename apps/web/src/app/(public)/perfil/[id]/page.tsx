import { PublicProfileContent } from '../../../../components/pages/public-profile-page';

export default function Page({ params }: { params: { id: string } }) {
  return <PublicProfileContent profileId={params.id} />;
}
