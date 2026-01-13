import type { Metadata } from 'next';

import { CategoryContent } from '../../../../components/pages/category-page';

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: 'Meoww Games - Categoria',
  description: 'Explore anúncios por categoria.',
};

export default async function Page({ params }: CategoryPageProps) {
  const { slug } = await params;
  return <CategoryContent slug={slug} />;
}
