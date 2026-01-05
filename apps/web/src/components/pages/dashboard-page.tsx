'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '../auth/auth-provider';

export const DashboardContent = () => {
  const { user, logout, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setIsSubmitting(true);
    await logout();
    router.push('/login');
  };

  return (
    <div className="dashboard-shell">
      <div className="dashboard-card">
        <h1>Dashboard</h1>
        <p>Placeholder protegido. Conteudo real sera adicionado depois.</p>
        {loading ? <p className="auth-helper">Carregando sessao...</p> : null}
        {user ? <p className="auth-helper">Logado como {user.email}</p> : null}
        <div className="auth-actions">
          <button className="primary-button" onClick={handleLogout} disabled={isSubmitting}>
            {isSubmitting ? 'Saindo...' : 'Sair'}
          </button>
          <Link className="ghost-button" href="/">
            Ir para home
          </Link>
        </div>
      </div>
    </div>
  );
};
