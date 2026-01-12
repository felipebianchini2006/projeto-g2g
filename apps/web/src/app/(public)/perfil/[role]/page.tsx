import { PublicProfileContent } from '../../../../components/pages/public-profile-page';

export default function Page({ params }: { params: { role?: string } }) {
  return <PublicProfileContent role={params.role} />;
}
