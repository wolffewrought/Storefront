import React from 'react';
import { ProductCard } from './ProductCard';

export const ProductGrid = ({ products, loading, error }) => {
  if (loading) {
    return (
      <div className="flex flex-center" style={{ minHeight: '400px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        {error}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="text-center" style={{ padding: '3rem 0' }}>
        <p className="text-muted">No products found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
