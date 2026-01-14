import { AccountListingEditorContent } from '../../../../../components/pages/account-listing-editor-page';

type ListingEditorPageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: ListingEditorPageProps) {
  const { id } = await params;
  return <AccountListingEditorContent listingId={id} />;
}
