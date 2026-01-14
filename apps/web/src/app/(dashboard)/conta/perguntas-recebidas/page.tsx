import type { Metadata } from 'next';

import { AccountQuestionsReceivedPage } from '../../../../components/pages/account-questions-received-page';

export const metadata: Metadata = {
  title: 'Meoww Games - Perguntas recebidas',
};

export default function Page() {
  return <AccountQuestionsReceivedPage />;
}
