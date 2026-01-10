import type { Metadata } from 'next';

import { ListingDetailContent } from '../../../../components/pages/listing-detail-page';

type ListingDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: 'Meoww Games - Anuncio',
  description: 'Detalhes do anuncio e compra segura.',
};

export default async function Page({ params }: ListingDetailPageProps) {
  const { id } = await params;
  return <ListingDetailContent listingId={id} />;
}
