'use client';

import { useEffect, useMemo, useState } from 'react';

import { features, franchises } from '../../lib/site-data';
import { SiteLayout } from '../site-layout';

const HERO_DOT_COUNT = 3;
const FRANCHISE_DOT_COUNT = 3;

export const HomePage = () => {
  const heroDots = useMemo(() => Array.from({ length: HERO_DOT_COUNT }), []);
  const franchiseDots = useMemo(
    () => Array.from({ length: FRANCHISE_DOT_COUNT }),
    [],
  );
  const [heroIndex, setHeroIndex] = useState(0);
  const [franchiseIndex, setFranchiseIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % HERO_DOT_COUNT);
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <SiteLayout>
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
    </SiteLayout>
  );
};