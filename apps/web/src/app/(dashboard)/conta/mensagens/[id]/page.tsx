import { DirectChatThreadContent } from '../../../../../components/pages/direct-chat-thread-page';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DirectChatThreadContent threadId={id} />;
}
