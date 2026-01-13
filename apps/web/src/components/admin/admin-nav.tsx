'use client';

import Link from 'next/link';

const ADMIN_LINKS = [
  { href: '/admin/atendimento', label: 'Atendimento' },
  { href: '/admin/disputas', label: 'Disputas' },
  { href: '/admin/anuncios', label: 'Moderação' },
  { href: '/admin/usuarios', label: 'Usuarios' },
  { href: '/admin/parceiros', label: 'Parceiros' },
  { href: '/admin/cupons', label: 'Cupons' },
  { href: '/admin/parametros', label: 'Parametros' },
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
