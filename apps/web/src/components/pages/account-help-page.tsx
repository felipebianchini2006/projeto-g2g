'use client';

import Link from 'next/link';
import { BookOpen, Headphones, Link2, MessageCircle, Users } from 'lucide-react';

import { useAuth } from '../auth/auth-provider';
import { AccountShell } from '../account/account-shell';

export const AccountHelpContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-4 text-sm text-meow-muted">
          Carregando sessão...
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-meow-red/20 bg-white px-6 py-6 text-center">
          <p className="text-sm text-meow-muted">Entre para acessar a central de ajuda.</p>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-full bg-meow-linear px-6 py-2 text-sm font-bold text-white"
          >
            Fazer login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <AccountShell
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Conta', href: '/conta' },
        { label: 'Central de ajuda' },
      ]}
    >
      <div className="rounded-2xl border border-meow-red/20 bg-white p-6 text-center shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
        <h1 className="text-2xl font-black text-meow-charcoal">Central de ajuda</h1>
        <p className="mt-3 text-sm text-meow-muted">
          Encontre respostas rápidas para compras, vendas e pagamentos.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-meow-red/20 bg-white p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
          <div className="flex items-center gap-3">
            <BookOpen className="text-meow-deep" size={20} />
            <h2 className="text-base font-bold text-meow-charcoal">Perguntas frequentes</h2>
          </div>
          <p className="mt-3 text-sm text-meow-muted">
            Respostas rápidas para duvidas comuns sobre compras e vendas.
          </p>
          <Link
            href="/ajuda/como-comprar"
            className="mt-4 inline-flex rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
          >
            Ver FAQ
          </Link>
        </div>

        <div className="rounded-2xl border border-meow-red/20 bg-white p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
          <div className="flex items-center gap-3">
            <Headphones className="text-meow-deep" size={20} />
            <h2 className="text-base font-bold text-meow-charcoal">Tickets de suporte</h2>
          </div>
          <p className="mt-3 text-sm text-meow-muted">
            Abra um ticket e acompanhe o atendimento da nossa equipe.
          </p>
          <Link
            href="/conta/tickets"
            className="mt-4 inline-flex rounded-full bg-meow-linear px-4 py-2 text-xs font-bold text-white"
          >
            Ir para tickets
          </Link>
        </div>

        <div className="rounded-2xl border border-meow-red/20 bg-white p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
          <div className="flex items-center gap-3">
            <MessageCircle className="text-meow-deep" size={20} />
            <h2 className="text-base font-bold text-meow-charcoal">Chat com IA</h2>
          </div>
          <p className="mt-3 text-sm text-meow-muted">
            Tire duvidas rápidas com nosso suporte automatizado.
          </p>
          <Link
            href="/conta/ajuda/chat"
            className="mt-4 inline-flex rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
          >
            Iniciar chat
          </Link>
        </div>

        <div className="rounded-2xl border border-meow-red/20 bg-white p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
          <div className="flex items-center gap-3">
            <Link2 className="text-meow-deep" size={20} />
            <h2 className="text-base font-bold text-meow-charcoal">Links uteis</h2>
          </div>
          <ul className="mt-3 grid gap-2 text-sm text-meow-muted">
            <li>
              <Link href="/ajuda/pagamentos" className="text-meow-deep">
                Formas de pagamento
              </Link>
            </li>
            <li>
              <Link href="/ajuda/como-comprar" className="text-meow-deep">
                Como comprar
              </Link>
            </li>
            <li>
              <Link href="/institucional/termos" className="text-meow-deep">
                Termos de uso
              </Link>
            </li>
            <li>
              <Link href="/institucional/privacidade" className="text-meow-deep">
                Politica de privacidade
              </Link>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-meow-red/20 bg-white p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)]">
          <div className="flex items-center gap-3">
            <Users className="text-meow-deep" size={20} />
            <h2 className="text-base font-bold text-meow-charcoal">Comunidade</h2>
          </div>
          <p className="mt-3 text-sm text-meow-muted">
            Siga a Meoww Games para novidades, eventos e promocoes.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="https://instagram.com"
              className="rounded-full border border-meow-red/30 px-4 py-2 text-xs font-bold text-meow-deep"
            >
              Instagram
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-meow-red/20 bg-white p-5 shadow-[0_10px_24px_rgba(216,107,149,0.12)] md:col-span-2">
          <div className="flex items-center gap-3">
            <MessageCircle className="text-meow-deep" size={20} />
            <h2 className="text-base font-bold text-meow-charcoal">Fale conosco</h2>
          </div>
          <p className="mt-3 text-sm text-meow-muted">
            Para assuntos comerciais ou suporte urgente, envie uma mensagem pela central de
            tickets.
          </p>
          <Link
            href="/conta/tickets"
            className="mt-4 inline-flex rounded-full bg-meow-linear px-4 py-2 text-xs font-bold text-white"
          >
            Abrir ticket
          </Link>
        </div>
      </div>
    </AccountShell>
  );
};
