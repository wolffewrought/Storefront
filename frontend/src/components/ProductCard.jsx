import React from 'react';
import { Link } from 'react-router-dom';
import { RatingStars } from './RatingStars';

export const ProductCard = ({ product }) => {
  const image = product.images?.[0]?.image_url;
  const ratingCount = product.total_ratings || 0;

  return (
    <Link to={`/product/${product.id}`} style={{ textDecoration: 'none' }}>
      <div className="card product-card">
        <div className="product-image">
          {image ? (
            <img src={image} alt={product.name} />
          ) : (
            <div className="image-placeholder">No image</div>
          )}
        </div>

        <div className="product-info">
          <h4>{product.name}</h4>
          
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>
            {product.modeller_name}
          </p>

          <div className="product-meta">
            {product.average_rating > 0 && (
              <div className="rating-info">
                <RatingStars rating={product.average_rating} size={1} />
                <span className="rating-count">({ratingCount})</span>
              </div>
            )}
            
            <div className="download-count">
              {product.download_count} downloads
            </div>
          </div>

          <div className="product-price">
            £{parseFloat(product.price).toFixed(2)}
          </div>

          {product.stock_count !== null && (
            <div className="stock-badge">
              {product.stock_count > 0 
                ? `${product.stock_count} in stock` 
                : 'Out of stock'}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

const productCardStyles = `
  .product-card {
    cursor: pointer;
    overflow: hidden;
    transition: transform 0.2s;
  }

  .product-card:hover {
    transform: translateY(-4px);
  }

  .product-image {
    width: 100%;
    aspect-ratio: 1;
    background: #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
    border-radius: var(--border-radius);
    overflow: hidden;
  }

  .product-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .image-placeholder {
    color: var(--secondary);
    font-size: 0.9rem;
  }

  .product-info h4 {
    margin-bottom: 0.5rem;
    line-height: 1.3;
  }

  .product-meta {
    margin: 1rem 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .rating-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }

  .rating-count {
    color: var(--secondary);
  }

  .download-count {
    font-size: 0.85rem;
    color: var(--secondary);
  }

  .product-price {
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--primary);
    margin: 1rem 0;
  }

  .stock-badge {
    padding: 0.25rem 0.75rem;
    background: var(--success);
    color: var(--white);
    border-radius: var(--border-radius);
    font-size: 0.8rem;
    display: inline-block;
  }

  .stock-badge:has(+ .product-card) {
    background: var(--danger);
  }
`;

// Add styles
const style = document.createElement('style');
style.innerHTML = productCardStyles;
document.head.appendChild(style);
