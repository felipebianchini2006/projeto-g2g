import type { Metadata } from 'next';

import { AdminRgContent } from '../../../../components/pages/admin-rg-page';

export const metadata: Metadata = {
    title: 'Verificação de RG | Admin',
    description: 'Gerencie verificações de identidade.',
};

export default function AdminRgPage() {
    return <AdminRgContent />;
}
