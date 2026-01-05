'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { fetchPublicListings, type PublicListing } from '../../lib/marketplace-public';
import { features, franchises } from '../../lib/site-data';
import { useSite } from '../site-context';

const HERO_DOT_COUNT = 3;
const FRANCHISE_DOT_COUNT = 3;

export const HomeContent = () => {
  const heroDots = useMemo(() => Array.from({ length: HERO_DOT_COUNT }), []);
  const franchiseDots = useMemo(
    () => Array.from({ length: FRANCHISE_DOT_COUNT }),
    [],
  );
  const [heroIndex, setHeroIndex] = useState(0);
  const [franchiseIndex, setFranchiseIndex] = useState(0);
  const [highlightState, setHighlightState] = useState<{
    status: 'loading' | 'ready';
    error?: string;
    source: 'api' | 'fallback';
    listings: PublicListing[];
  }>({
    status: 'loading',
    source: 'api',
    listings: [],
  });
  const { addToCart } = useSite();

  useEffect(() => {
    const intervalId = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % HERO_DOT_COUNT);
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let active = true;
    const loadHighlights = async () => {
      const response = await fetchPublicListings();
      if (!active) {
        return;
      }
      setHighlightState({
        status: 'ready',
        listings: response.listings.slice(0, 4),
        source: response.source,
        error: response.error,
      });
    };
    loadHighlights().catch(() => {
      if (active) {
        setHighlightState((prev) => ({
          ...prev,
          status: 'ready',
          error: 'Nao foi possivel carregar destaques.',
        }));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const formatCurrency = (value: number, currency = 'BRL') =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value / 100);

  return (
    <>
      <section className="hero-banner">
        <div className="hero-slide active">
          <img
            src="/assets/meoow/banner.png"
            alt="Banner principal"
            className="hero-bg"
          />
        </div>
        <div className="hero-dots">
          {heroDots.map((_, index) => (
            <button
              key={`hero-dot-${index}`}
              type="button"
              aria-label={`Ir para o slide ${index + 1}`}
              className={`dot${heroIndex === index ? ' active' : ''}`}
              onClick={() => setHeroIndex(index)}
            />
          ))}
        </div>
        <a href="#" className="instagram-float" aria-label="Instagram">
          <i className="fab fa-instagram" aria-hidden="true" />
        </a>
      </section>

      <section className="features-bar">
        <div className="container">
          {features.map((feature) => (
            <div className="feature" key={feature.title}>
              <span className="feature-icon generic" />
              <div className="feature-text">
                <h4>{feature.title}</h4>
                <p>{feature.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="home-highlights">
        <div className="container">
          <div className="section-head">
            <div>
              <h2 className="section-title">Destaques da semana</h2>
              <p className="section-subtitle">
                Selecao com entregas rapidas e preco exclusivo.
              </p>
            </div>
            <Link href="/produtos" className="ghost-button">
              Ver catalogo
            </Link>
          </div>

          {highlightState.status === 'loading' ? (
            <div className="state-card">Carregando destaques...</div>
          ) : null}
          {highlightState.error ? (
            <div className="state-card info">
              {highlightState.error}
              {highlightState.source === 'fallback'
                ? ' Usando catalogo local.'
                : null}
            </div>
          ) : null}

          <div className="listing-grid">
            {highlightState.listings.map((listing) => (
              <article className="listing-card" key={listing.id}>
                <div className="listing-media">
                  <img
                    src={listing.media?.[0]?.url ?? '/assets/meoow/highlight-01.webp'}
                    alt={listing.title}
                  />
                  <span className={`badge badge-${listing.deliveryType.toLowerCase()}`}>
                    {listing.deliveryType === 'AUTO' ? 'Auto' : 'Manual'}
                  </span>
                </div>
                <div className="listing-body">
                  <h3>{listing.title}</h3>
                  <p>{listing.description}</p>
                  <div className="listing-price">
                    {formatCurrency(listing.priceCents, listing.currency)}
                  </div>
                  <div className="listing-actions">
                    <Link className="ghost-button" href={`/anuncios/${listing.id}`}>
                      Ver anuncio
                    </Link>
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => addToCart(listing.title)}
                    >
                      Comprar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="franchises-section">
        <div className="container">
          <h2 className="section-title">Qual deles tem o seu coracao?</h2>

          <div className="franchises-carousel">
            <button
              className="carousel-btn prev"
              type="button"
              aria-label="Pagina anterior"
              onClick={() =>
                setFranchiseIndex((prev) => Math.max(0, prev - 1))
              }
            >
              <i className="fas fa-chevron-left" aria-hidden="true" />
            </button>

            <div className="franchises-grid">
              {franchises.map((franchise) => (
                <a href="#" className="franchise-card" key={franchise.name}>
                  <div className="franchise-circle">
                    <img src={franchise.image} alt={franchise.name} />
                  </div>
                  <span>{franchise.name}</span>
                </a>
              ))}
            </div>

            <button
              className="carousel-btn next"
              type="button"
              aria-label="Proxima pagina"
              onClick={() =>
                setFranchiseIndex((prev) =>
                  Math.min(franchiseDots.length - 1, prev + 1),
                )
              }
            >
              <i className="fas fa-chevron-right" aria-hidden="true" />
            </button>
          </div>

          <div className="carousel-dots">
            {franchiseDots.map((_, index) => (
              <button
                key={`franchise-dot-${index}`}
                type="button"
                aria-label={`Selecionar pagina ${index + 1}`}
                className={`dot${franchiseIndex === index ? ' active' : ''}`}
                onClick={() => setFranchiseIndex(index)}
              />
            ))}
          </div>
        </div>
      </section>

      <a href="#" className="whatsapp-float" aria-label="WhatsApp">
        <i className="fab fa-whatsapp" aria-hidden="true" />
      </a>
    </>
  );
};
