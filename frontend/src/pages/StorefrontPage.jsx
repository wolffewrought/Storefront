import React, { useState, useMemo } from 'react';
import { ProductGrid } from '../components/ProductGrid';
import { useFetch } from '../hooks/useFetch';
import { products as productsApi, categories as categoriesApi, ips as ipsApi, modellers as modellersApi } from '../services/api';

const TYPES = [
  { id: 'printed', label: 'Printed Products' },
  { id: 'stl', label: 'STLs' },
  { id: 'asset', label: '3D Assets' },
];

export const StorefrontPage = () => {
  const [activeType, setActiveType] = useState('printed');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedIp, setSelectedIp] = useState(null);
  const [selectedModeller, setSelectedModeller] = useState(null);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all data
  const { data: allProducts, loading: productsLoading, error: productsError } = useFetch(
    () => productsApi.list({ type: activeType })
  );

  const { data: categoriesData } = useFetch(() => categoriesApi.list());
  const { data: ipsData } = useFetch(() => ipsApi.list());
  const { data: modellersData } = useFetch(() => modellersApi.list());

  // Filter categories by active type
  const categories = useMemo(() => {
    if (!categoriesData) return [];
    const grouped = categoriesData.data || categoriesData;
    return grouped[activeType] || [];
  }, [categoriesData, activeType]);

  // Filter and search products
  const filteredProducts = useMemo(() => {
    if (!allProducts) return [];
    
    let result = allProducts.data || allProducts;

    // Filter by category
    if (selectedCategory) {
      result = result.filter(p => p.category_id === selectedCategory);
    }

    // Filter by IP
    if (selectedIp) {
      result = result.filter(p => p.ip_id === selectedIp);
    }

    // Filter by modeller
    if (selectedModeller) {
      result = result.filter(p => p.modeller_id === selectedModeller);
    }

    // Filter by price range
    result = result.filter(p => p.price >= priceRange.min && p.price <= priceRange.max);

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
      );
    }

    return result;
  }, [allProducts, selectedCategory, selectedIp, selectedModeller, priceRange, searchTerm]);

  const ips = ipsData?.data || [];
  const modellers = modellersData?.data || [];

  return (
    <div className="storefront-page">
      <div className="container">
        {/* Type tabs */}
        <div className="tabs mb-4" style={{ marginTop: '2rem' }}>
          {TYPES.map((type) => (
            <button
              key={type.id}
              className={`tab-btn ${activeType === type.id ? 'active' : ''}`}
              onClick={() => {
                setActiveType(type.id);
                setSelectedCategory(null);
                setSelectedIp(null);
                setSelectedModeller(null);
              }}
            >
              {type.label}
            </button>
          ))}
        </div>

        <div className="storefront-content">
          {/* Filters sidebar */}
          <aside className="filters-sidebar">
            {/* Search */}
            <div className="filter-group">
              <h5>Search</h5>
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Categories */}
            {categories.length > 0 && (
              <div className="filter-group">
                <h5>Category</h5>
                <div className="filter-options">
                  <label>
                    <input
                      type="radio"
                      name="category"
                      checked={!selectedCategory}
                      onChange={() => setSelectedCategory(null)}
                    />
                    All
                  </label>
                  {categories.map((cat) => (
                    <label key={cat.id}>
                      <input
                        type="radio"
                        name="category"
                        checked={selectedCategory === cat.id}
                        onChange={() => setSelectedCategory(cat.id)}
                      />
                      {cat.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* IPs */}
            {ips.length > 0 && (
              <div className="filter-group">
                <h5>IP / Franchise</h5>
                <div className="filter-options">
                  <label>
                    <input
                      type="radio"
                      name="ip"
                      checked={!selectedIp}
                      onChange={() => setSelectedIp(null)}
                    />
                    All
                  </label>
                  {ips.map((ip) => (
                    <label key={ip.id}>
                      <input
                        type="radio"
                        name="ip"
                        checked={selectedIp === ip.id}
                        onChange={() => setSelectedIp(ip.id)}
                      />
                      {ip.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Modellers */}
            {modellers.length > 0 && (
              <div className="filter-group">
                <h5>Creator / Modeller</h5>
                <div className="filter-options">
                  <label>
                    <input
                      type="radio"
                      name="modeller"
                      checked={!selectedModeller}
                      onChange={() => setSelectedModeller(null)}
                    />
                    All
                  </label>
                  {modellers.map((mod) => (
                    <label key={mod.id}>
                      <input
                        type="radio"
                        name="modeller"
                        checked={selectedModeller === mod.id}
                        onChange={() => setSelectedModeller(mod.id)}
                      />
                      {mod.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Price range */}
            <div className="filter-group">
              <h5>Price Range</h5>
              <div className="price-inputs">
                <input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange({ ...priceRange, min: parseFloat(e.target.value) || 0 })}
                />
                <span>-</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange({ ...priceRange, max: parseFloat(e.target.value) || 1000 })}
                />
              </div>
            </div>
          </aside>

          {/* Products grid */}
          <main className="products-main">
            <div className="results-header">
              <p className="text-muted">Showing {filteredProducts.length} products</p>
            </div>
            <ProductGrid 
              products={filteredProducts} 
              loading={productsLoading} 
              error={productsError}
            />
          </main>
        </div>
      </div>
    </div>
  );
};

const styles = `
  .storefront-page {
    min-height: calc(100vh - 200px);
  }

  .tabs {
    display: flex;
    gap: 1rem;
    border-bottom: 2px solid #e0e0e0;
  }

  .tab-btn {
    background: none;
    border: none;
    padding: 1rem 0;
    font-size: 1rem;
    cursor: pointer;
    color: var(--secondary);
    border-bottom: 3px solid transparent;
    transition: all 0.2s;
  }

  .tab-btn.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
  }

  .storefront-content {
    display: grid;
    grid-template-columns: 250px 1fr;
    gap: 2rem;
    margin-top: 2rem;
  }

  .filters-sidebar {
    background: var(--white);
    padding: 1.5rem;
    border-radius: var(--border-radius);
    height: fit-content;
    position: sticky;
    top: 100px;
  }

  .filter-group {
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .filter-group:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .filter-group h5 {
    margin-bottom: 1rem;
  }

  .filter-options {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .filter-options label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0;
    cursor: pointer;
    font-weight: 400;
  }

  .filter-options input[type="radio"] {
    width: auto;
    margin: 0;
  }

  .price-inputs {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .price-inputs input {
    flex: 1;
    width: auto;
  }

  .price-inputs span {
    color: var(--secondary);
  }

  .results-header {
    margin-bottom: 1.5rem;
  }

  @media (max-width: 768px) {
    .storefront-content {
      grid-template-columns: 1fr;
    }

    .filters-sidebar {
      position: static;
      margin-bottom: 2rem;
    }

    .tabs {
      flex-wrap: wrap;
    }
  }
`;

const style = document.createElement('style');
style.innerHTML = styles;
document.head.appendChild(style);
