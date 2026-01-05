import Link from 'next/link';

export default function Page() {
  return (
    <div className="dashboard-shell">
      <div className="dashboard-card">
        <h1>Dashboard</h1>
        <p>Placeholder protegido. Conteudo real sera adicionado depois.</p>
        <Link className="ghost-button" href="/">
          Ir para home
        </Link>
      </div>
    </div>
  );
}