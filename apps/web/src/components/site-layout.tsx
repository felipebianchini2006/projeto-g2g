'use client';

import { useState } from 'react';

import { navItems } from '../lib/site-data';
import { SiteProvider, useSite } from './site-context';

type SiteLayoutProps = {
  children: React.ReactNode;
};

const SiteShell = ({ children }: SiteLayoutProps) => {
  const { cartCount, notification, notify } = useSite();
  const [search, setSearch] = useState('');

  const handleSearch = () => {
    const query = search.trim();
    if (query) {
      notify(`Buscando por: "${query}"`);
    }
  };

  return (
    <>
      <div className="top-bar">
        <div className="container">
          <p>FRETE GRATIS EM REGIOES SELECIONADAS NAS COMPRAS ACIMA DE R$349</p>
          <button className="pill-button" type="button">
            Saiba mais
          </button>
        </div>
      </div>

      <header className="header">
        <div className="container">
          <div className="header-spacer" />
          <div className="search-bar">
            <input
              type="text"
              placeholder="O que deseja procurar?"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
            <button type="button" aria-label="Buscar" onClick={handleSearch}>
              <i className="fas fa-search" aria-hidden="true" />
            </button>
          </div>

          <div className="header-actions">
            <a href="#" className="action-card">
              <i className="fas fa-headset action-icon" aria-hidden="true" />
              <span>Atendimento</span>
            </a>
            <a href="#" className="action-card">
              <i className="fas fa-truck-fast action-icon" aria-hidden="true" />
              <span>Rastrear pedido</span>
            </a>
            <a href="#" className="action-card">
              <i className="fas fa-user action-icon" aria-hidden="true" />
              <span>Minha conta</span>
            </a>
            <a href="#" className="cart-link">
              <i className="fas fa-shopping-cart" aria-hidden="true" />
              <span className="cart-count">{cartCount}</span>
            </a>
          </div>
        </div>
      </header>

      <nav className="main-nav">
        <div className="container">
          <ul className="nav-list">
            {navItems.map((item) => (
              <li
                key={item.label}
                className={`nav-item${item.highlight ? ' highlight' : ''}`}
              >
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {children}

      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col">
              <div className="brand footer-brand">
                <img src="/assets/meoow/logo.png" alt="Meoww" className="brand-mark" />
                <div className="brand-text">
                  <span className="brand-name">Meoww Games</span>
                  <span className="brand-tagline">A casa gamer dos gatinhos</span>
                </div>
              </div>
              <p>
                A loja gamer com curadoria felina. Consoles, jogos e colecionaveis com
                entrega rapida e segura.
              </p>
              <div className="social-links">
                <a href="#" aria-label="Facebook">
                  <i className="fab fa-facebook" aria-hidden="true" />
                </a>
                <a href="#" aria-label="Instagram">
                  <i className="fab fa-instagram" aria-hidden="true" />
                </a>
                <a href="#" aria-label="YouTube">
                  <i className="fab fa-youtube" aria-hidden="true" />
                </a>
                <a href="#" aria-label="TikTok">
                  <i className="fab fa-tiktok" aria-hidden="true" />
                </a>
              </div>
            </div>
            <div className="footer-col">
              <h4>Institucional</h4>
              <ul>
                <li>
                  <a href="#">Sobre nos</a>
                </li>
                <li>
                  <a href="#">Contato</a>
                </li>
                <li>
                  <a href="#">Politica de privacidade</a>
                </li>
                <li>
                  <a href="#">Termos de uso</a>
                </li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Categorias</h4>
              <ul>
                <li>
                  <a href="#">Nintendo</a>
                </li>
                <li>
                  <a href="#">PlayStation</a>
                </li>
                <li>
                  <a href="#">Xbox</a>
                </li>
                <li>
                  <a href="#">Colecionaveis</a>
                </li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Ajuda</h4>
              <ul>
                <li>
                  <a href="#">Central de ajuda</a>
                </li>
                <li>
                  <a href="#">Como comprar</a>
                </li>
                <li>
                  <a href="#">Formas de pagamento</a>
                </li>
                <li>
                  <a href="#">Trocas e devolucoes</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 Meoww Games. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      {notification ? (
        <div className={`notification notification--${notification.type}`}>
          <i
            className={`fas ${
              notification.type === 'success' ? 'fa-check-circle' : 'fa-info-circle'
            }`}
            aria-hidden="true"
          />
          <span>{notification.message}</span>
        </div>
      ) : null}
    </>
  );
};

export const SiteLayout = ({ children }: SiteLayoutProps) => (
  <SiteProvider>
    <SiteShell>{children}</SiteShell>
  </SiteProvider>
);