'use client';

import { products } from '../../lib/site-data';
import { useSite } from '../site-context';
import { SiteLayout } from '../site-layout';

const ProdutosContent = () => {
  const { addToCart } = useSite();

  return (
    <section className="product-showcase">
      <div className="container">
        <h2 className="section-title">Produtos em destaque</h2>
        <div className="product-grid">
          {products.map((product) => (
            <article className="product-card" key={product.name}>
              <div className={`product-media product-media--${product.variant}`}>
                {product.autoDelivery ? (
                  <span className="product-badge">
                    <i className="fas fa-bolt" aria-hidden="true" />Entrega auto
                  </span>
                ) : null}
                <button
                  className="product-like"
                  type="button"
                  aria-label="Favoritar"
                >
                  <i className="fas fa-heart" aria-hidden="true" />
                </button>
                <img src={product.image} alt={product.name} />
              </div>
              <div className="product-info">
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <div className="product-price">
                  <span className="price-old">{product.oldPrice}</span>
                  <span className="price-badge">{product.discount}</span>
                </div>
                <div className="price-current">{product.currentPrice}</div>
                <button
                  className="product-button"
                  type="button"
                  onClick={() => addToCart(product.name)}
                >
                  Ver detalhes
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export const ProdutosPage = () => (
  <SiteLayout>
    <ProdutosContent />
  </SiteLayout>
);
