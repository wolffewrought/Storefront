import React from 'react';
import { Link } from 'react-router-dom';
import { ProductCard } from './ProductCard';

// Compact card: smaller image + name + price only
const CompactCard = ({ product }) => {
  const image = product.images?.[0]?.image_url || product.primary_image;
  return (
    <Link to={`/product/${product.id}`} className="compact-card" style={{ textDecoration: 'none' }}>
      <div className="compact-image">
        {image ? <img src={image} alt={product.name} /> : <div className="compact-noimg">No image</div>}
      </div>
      <div className="compact-name">{product.name}</div>
      <div className="compact-price">£{parseFloat(product.price).toFixed(2)}</div>
    </Link>
  );
};

// List row: no picture, text only
const ListRow = ({ product }) => (
  <Link to={`/product/${product.id}`} className="list-row" style={{ textDecoration: 'none' }}>
    <div className="list-main">
      <span className="list-name">{product.name}</span>
      <span className="list-sub">{product.modeller_name}{product.category_name ? ` · ${product.category_name}` : ''}</span>
    </div>
    <span className="list-price">£{parseFloat(product.price).toFixed(2)}</span>
  </Link>
);

export const ProductGrid = ({ products, loading, error, viewMode = 'grid' }) => {
  if (loading) {
    return (
      <div className="flex flex-center" style={{ minHeight: '400px' }}>
        <div className="spinner"></div>
      </div>
    );
  }
  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }
  if (!products || products.length === 0) {
    return (
      <div className="text-center" style={{ padding: '3rem 0' }}>
        <p className="text-muted">No products found.</p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="product-list">
        {products.map((p) => <ListRow key={p.id} product={p} />)}
      </div>
    );
  }

  if (viewMode === 'compact') {
    return (
      <div className="product-compact-grid">
        {products.map((p) => <CompactCard key={p.id} product={p} />)}
      </div>
    );
  }

  // default full grid
  return (
    <div className="grid grid-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};

const styles = `
  /* Compact grid: many small tiles, ~4 across on desktop, 2-3 on mobile */
  .product-compact-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 140px), 1fr));
    gap: 0.75rem;
  }
  .compact-card {
    background: var(--white);
    border: 1px solid #eee;
    border-radius: var(--border-radius);
    padding: 0.5rem;
    color: inherit;
    display: flex;
    flex-direction: column;
  }
  .compact-image {
    width: 100%;
    aspect-ratio: 1;
    background: var(--light);
    border-radius: var(--border-radius);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.4rem;
  }
  .compact-image img { width: 100%; height: 100%; object-fit: contain; }
  .compact-noimg { font-size: 0.7rem; color: var(--secondary); }
  .compact-name {
    font-size: 0.8rem;
    font-weight: 600;
    line-height: 1.2;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .compact-price { font-size: 0.85rem; font-weight: 700; color: var(--primary); margin-top: 0.2rem; }

  /* List view: text rows, no images */
  .product-list { display: flex; flex-direction: column; }
  .list-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.8rem 0.5rem;
    border-bottom: 1px solid #eee;
    color: inherit;
  }
  .list-row:hover { background: var(--light); }
  .list-main { display: flex; flex-direction: column; min-width: 0; }
  .list-name { font-weight: 600; }
  .list-sub { font-size: 0.8rem; color: var(--secondary); }
  .list-price { font-weight: 700; color: var(--primary); white-space: nowrap; }
`;

const style = document.createElement('style');
style.innerHTML = styles;
document.head.appendChild(style);
