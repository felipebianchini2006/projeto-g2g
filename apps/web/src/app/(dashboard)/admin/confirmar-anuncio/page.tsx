import type { Metadata } from 'next';

import { AdminListingsContent } from '../../../../components/pages/admin-listings-page';

export const metadata: Metadata = {
    title: 'Confirmar Anúncios | Admin',
    description: 'Aprove ou reprove anúncios pendentes.',
};

export default function ConfirmarAnuncioPage() {
    return (
        <AdminListingsContent
            initialStatusFilter="PENDING"
            lockedStatusFilter={true}
            pageTitle="Confirmar Anúncios"
            pageDescription="Analise e aprove/reprove os anúncios pendentes enviados pelos vendedores."
            hideCreateForm={true}
        />
    );
}
