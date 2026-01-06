'use client';

import Link from 'next/link';

const ADMIN_LINKS = [
  { href: '/dashboard/admin/atendimento', label: 'Atendimento' },
  { href: '/dashboard/admin/disputas', label: 'Disputas' },
  { href: '/dashboard/admin/anuncios', label: 'Moderacao' },
  { href: '/dashboard/admin/usuarios', label: 'Usuarios' },
  { href: '/dashboard/admin/parametros', label: 'Parametros' },
];

export const AdminNav = () => (
  <nav className="admin-nav">
    {ADMIN_LINKS.map((link) => (
      <Link className="ghost-button" href={link.href} key={link.href}>
        {link.label}
      </Link>
    ))}
  </nav>
);
