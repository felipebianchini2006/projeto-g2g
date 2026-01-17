'use client';

import Link from 'next/link';

export const SiteFooter = () => (
  <footer className="bg-meow-linear text-white dark:bg-none dark:bg-slate-950">
    <div className="mx-auto w-full max-w-[1280px] px-6 py-14">
      <div className="grid gap-10 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-xl shadow-meow">
              <img src="/assets/meoow/logo.png" alt="Meoww" />
            </div>
            <div>
              <span className="block font-display text-xl font-black">
                Meoww
              </span>
              <span className="text-xs font-semibold text-white/90">
              </span>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/80">
          </p>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-extrabold uppercase tracking-[0.6px]">
            Institucional
          </h4>
          <ul className="space-y-2 text-[13px] text-white/80">
            <li>
              <Link className="transition hover:text-white" href="/institucional/sobre">
                Sobre nos
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-white" href="/institucional/contato">
                Contato
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-white" href="/institucional/privacidade">
                Politica de privacidade
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-white" href="/institucional/termos">
                Termos de uso
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-extrabold uppercase tracking-[0.6px]">
            Categorias
          </h4>
          <ul className="space-y-2 text-[13px] text-white/80">
            <li>
              <Link className="transition hover:text-white" href="/categoria/consoles">
                Consoles
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-white" href="/categoria/perifericos">
                Perifericos
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-white" href="/categoria/colecionaveis">
                Colecionaveis
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-white" href="/categoria/gift-cards">
                Gift Cards
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-extrabold uppercase tracking-[0.6px]">
            Ajuda
          </h4>
          <ul className="space-y-2 text-[13px] text-white/80">
            <li>
              <Link className="transition hover:text-white" href="/ajuda/central">
                Central de ajuda
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-white" href="/ajuda/como-comprar">
                Como comprar
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-white" href="/ajuda/pagamentos">
                Formas de pagamento
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-white" href="/ajuda/trocas">
                Trocas e devolucoes
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-8 border-t border-white/20 pt-5 text-center text-[12px] text-white/60">
        &copy; 2025 Meoww Games. Todos os direitos reservados.
      </div>
    </div>
  </footer>
);
