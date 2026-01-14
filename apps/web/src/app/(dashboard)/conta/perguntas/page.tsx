import type { Metadata } from 'next';

import { AccountQuestionsSentPage } from '../../../../components/pages/account-questions-sent-page';

export const metadata: Metadata = {
  title: 'Meoww Games - Minhas perguntas',
};

export default function Page() {
  return <AccountQuestionsSentPage />;
}
