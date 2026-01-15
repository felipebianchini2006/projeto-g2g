import type { Metadata } from 'next';

import { AdminReportsContent } from '../../../../components/pages/admin-reports-page';

export const metadata: Metadata = {
    title: 'Denúncias | Admin',
    description: 'Gerencie denúncias de anúncios.',
};

export default function AdminReportsPage() {
    return <AdminReportsContent />;
}
