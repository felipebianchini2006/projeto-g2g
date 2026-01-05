'use client';

import Link from 'next/link';
import { useState } from 'react';

import { navItems } from '../../lib/site-data';
import { useSite } from '../site-context';

export const SiteHeader = () => {
  const { cartCount, notify } = useSite();
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
            <Link href="/login" className="action-card">
              <i className="fas fa-user action-icon" aria-hidden="true" />
              <span>Minha conta</span>
            </Link>
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
                {item.href.startsWith('/') ? (
                  <Link href={item.href}>{item.label}</Link>
                ) : (
                  <a href={item.href}>{item.label}</a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
};