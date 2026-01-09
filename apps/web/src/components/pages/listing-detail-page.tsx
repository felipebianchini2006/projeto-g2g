'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { fetchPublicListing, type PublicListing } from '../../lib/marketplace-public';

type ListingDetailState = {
  status: 'loading' | 'ready';
  listing: PublicListing | null;
  source: 'api' | 'fallback';
  error?: string;
};

const formatCurrency = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);

export const ListingDetailContent = ({ listingId }: { listingId: string }) => {
  const [state, setState] = useState<ListingDetailState>({
    status: 'loading',
    listing: null,
    source: 'api',
  });
  const [activeMedia, setActiveMedia] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadListing = async () => {
      const response = await fetchPublicListing(listingId);
      if (!active) {
        return;
      }
      setState({
        status: 'ready',
        listing: response.listing,
        source: response.source,
        error: response.error,
      });
      if (response.listing?.media?.[0]?.url) {
        setActiveMedia(response.listing.media[0].url);
      } else {
        setActiveMedia(null);
      }
    };
    loadListing().catch(() => {
      if (active) {
        setState((prev) => ({
          ...prev,
          status: 'ready',
          error: 'Nao foi possivel carregar o anuncio.',
        }));
      }
    });
    return () => {
      active = false;
    };
  }, [listingId]);

  if (state.status === 'loading') {
    return (
      <section className="listing-detail">
        <div className="container">
          <div className="state-card">Carregando anuncio...</div>
        </div>
      </section>
    );
  }

  if (!state.listing) {
    return (
      <section className="listing-detail">
        <div className="container">
          <div className="state-card">Anuncio nao encontrado.</div>
          <Link className="ghost-button" href="/produtos">
            Voltar ao catalogo
          </Link>
        </div>
      </section>
    );
  }

  const listing = state.listing;

  return (
    <section className="listing-detail">
      <div className="container">
        <div className="listing-detail-header">
          <Link href="/produtos" className="ghost-button">
            Voltar ao catalogo
          </Link>
          <span className="state-pill">
            {state.source === 'fallback' ? 'Modo offline' : 'API ativa'}
          </span>
        </div>

        {state.error ? (
          <div className="state-card info">{state.error}</div>
        ) : null}

        <div className="listing-detail-grid">
          <div className="listing-gallery">
            <div className="listing-main">
              <img
                src={activeMedia ?? listing.media?.[0]?.url ?? '/assets/meoow/highlight-01.webp'}
                alt={listing.title}
              />
            </div>
            <div className="listing-thumbs">
              {(listing.media ?? []).map((media) => (
                <button
                  key={media.id}
                  type="button"
                  className={`thumb${activeMedia === media.url ? ' active' : ''}`}
                  onClick={() => setActiveMedia(media.url)}
                >
                  <img src={media.url} alt={media.type} />
                </button>
              ))}
            </div>
          </div>

          <div className="listing-summary">
            <h1>{listing.title}</h1>
            <p>{listing.description}</p>
            <div className="listing-price">
              {formatCurrency(listing.priceCents, listing.currency)}
            </div>
            <div className="listing-tags">
              <span className={`tag-pill tag-${listing.deliveryType.toLowerCase()}`}>
                {listing.deliveryType === 'AUTO' ? 'Entrega auto' : 'Entrega manual'}
              </span>
              <span className="tag-pill tag-status">{listing.status}</span>
            </div>
            <div className="listing-info">
              <div>
                <span>SLA</span>
                <strong>{listing.deliverySlaHours ?? 24}h</strong>
              </div>
              <div>
                <span>Categoria</span>
                <strong>{listing.categoryLabel ?? listing.categorySlug ?? 'Marketplace'}</strong>
              </div>
            </div>
            <p className="listing-policy">
              {listing.refundPolicy ?? 'Politica de reembolso disponivel na confirmacao.'}
            </p>
            <div className="listing-actions">
              <Link className="primary-button" href={`/checkout/${listing.id}`}>
                Comprar agora
              </Link>
              <Link href="/conta" className="ghost-button">
                Falar com o seller
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
