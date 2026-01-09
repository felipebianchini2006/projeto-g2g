'use client';

import { Facebook, Instagram, Youtube, Sparkles } from 'lucide-react';

export const SiteFooter = () => (
  <footer className="bg-meow-dark text-white">
    <div className="mx-auto w-full max-w-[1280px] px-6 py-14">
      <div className="grid gap-10 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-xl shadow-meow">
              <img src="/assets/meoow/logo.png" alt="Meoww" />
            </div>
            <div>
              <span className="block font-display text-xl font-black">
                Meoww Games
              </span>
              <span className="text-xs font-semibold text-meow-cream/80">
                A casa gamer dos gatinhos
              </span>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[#d6c1c8]">
            A loja gamer com curadoria felina. Consoles, jogos e colecionaveis com
            entrega rapida e segura.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="#"
              aria-label="Facebook"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition hover:-translate-y-0.5"
            >
              <Facebook size={18} aria-hidden />
            </a>
            <a
              href="#"
              aria-label="Instagram"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition hover:-translate-y-0.5"
            >
              <Instagram size={18} aria-hidden />
            </a>
            <a
              href="#"
              aria-label="YouTube"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition hover:-translate-y-0.5"
            >
              <Youtube size={18} aria-hidden />
            </a>
            <a
              href="#"
              aria-label="TikTok"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition hover:-translate-y-0.5"
            >
              <Sparkles size={18} aria-hidden />
            </a>
          </div>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-extrabold uppercase tracking-[0.6px]">
            Institucional
          </h4>
          <ul className="space-y-2 text-[13px] text-[#d6c1c8]">
            <li>
              <a className="transition hover:text-white" href="#">
                Sobre nos
              </a>
            </li>
            <li>
              <a className="transition hover:text-white" href="#">
                Contato
              </a>
            </li>
            <li>
              <a className="transition hover:text-white" href="#">
                Politica de privacidade
              </a>
            </li>
            <li>
              <a className="transition hover:text-white" href="#">
                Termos de uso
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-extrabold uppercase tracking-[0.6px]">
            Categorias
          </h4>
          <ul className="space-y-2 text-[13px] text-[#d6c1c8]">
            <li>
              <a className="transition hover:text-white" href="#">
                Nintendo
              </a>
            </li>
            <li>
              <a className="transition hover:text-white" href="#">
                PlayStation
              </a>
            </li>
            <li>
              <a className="transition hover:text-white" href="#">
                Xbox
              </a>
            </li>
            <li>
              <a className="transition hover:text-white" href="#">
                Colecionaveis
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-extrabold uppercase tracking-[0.6px]">
            Ajuda
          </h4>
          <ul className="space-y-2 text-[13px] text-[#d6c1c8]">
            <li>
              <a className="transition hover:text-white" href="#">
                Central de ajuda
              </a>
            </li>
            <li>
              <a className="transition hover:text-white" href="#">
                Como comprar
              </a>
            </li>
            <li>
              <a className="transition hover:text-white" href="#">
                Formas de pagamento
              </a>
            </li>
            <li>
              <a className="transition hover:text-white" href="#">
                Trocas e devolucoes
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-8 border-t border-white/10 pt-5 text-center text-[12px] text-[#a78b95]">
        &copy; 2025 Meoww Games. Todos os direitos reservados.
      </div>
    </div>
  </footer>
);
