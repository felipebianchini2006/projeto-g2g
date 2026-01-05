import type { Metadata } from 'next';

import { CategoryContent } from '../../../../components/pages/category-page';

type CategoryPageProps = {
  params: { slug: string };
};

export const metadata: Metadata = {
  title: 'Meoww Games - Categoria',
  description: 'Explore anuncios por categoria.',
};

export default function Page({ params }: CategoryPageProps) {
  return <CategoryContent slug={params.slug} />;
}
