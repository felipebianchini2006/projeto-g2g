import Link from 'next/link';

type LoginPageProps = {
  searchParams?: {
    next?: string | string[];
  };
};

export default function Page({ searchParams }: LoginPageProps) {
  const nextParam = searchParams?.next;
  const rawNextPath =
    Array.isArray(nextParam) ? nextParam[0] ?? '/dashboard' : nextParam ?? '/dashboard';
  const nextPath = rawNextPath.startsWith('/') ? rawNextPath : '/dashboard';
  const loginTarget = nextPath.includes('?') ? `${nextPath}&dev=1` : `${nextPath}?dev=1`;

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <span className="auth-kicker">Area restrita</span>
        <h1>Login</h1>
        <p>Placeholder de autenticacao. O fluxo real entra na proxima etapa.</p>
        <div className="auth-actions">
          <Link className="primary-button" href={loginTarget}>
            Entrar como demo
          </Link>
          <Link className="ghost-button" href="/">
            Voltar para home
          </Link>
        </div>
      </div>
    </div>
  );
}
