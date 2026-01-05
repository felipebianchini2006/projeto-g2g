import type { Metadata } from 'next';

import { ProdutosContent } from '../../../components/pages/produtos-page';

export const metadata: Metadata = {
  title: 'Meoww Games - Produtos',
  description: 'Catalogo com os principais produtos em destaque.',
};

export default function Page() {
  return <ProdutosContent />;
}