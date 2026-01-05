import type { Metadata } from 'next';

import { ListingDetailContent } from '../../../../components/pages/listing-detail-page';

type ListingDetailPageProps = {
  params: { id: string };
};

export const metadata: Metadata = {
  title: 'Meoww Games - Anuncio',
  description: 'Detalhes do anuncio e compra segura.',
};

export default function Page({ params }: ListingDetailPageProps) {
  return <ListingDetailContent listingId={params.id} />;
}
