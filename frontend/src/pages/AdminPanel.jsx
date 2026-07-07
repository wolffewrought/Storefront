import React, { useState, useMemo } from 'react';
import { useFetch } from '../hooks/useFetch';
import {
  orders as ordersApi,
  products as productsApi,
  categories as categoriesApi,
} from '../services/api';

const TABS = [
  { id: 'orders', label: 'Orders' },
  { id: 'products', label: 'Products' },
];

export const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('orders');
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '', description: '', price: '', categoryId: '',
  });

  const refresh = () => setRefreshKey((k) => k + 1);

  // Data
  const { data: ordersData, loading: ordersLoading } = useFetch(
    () => ordersApi.adminAll(),
    [refreshKey]
  );
  const { data: productsData, loading: productsLoading } = useFetch(
    () => productsApi.list(),
    [refreshKey]
  );
  const { data: categoriesData } = useFetch(() => categoriesApi.list(), []);

  const allOrders = useMemo(() => ordersData?.data || [], [ordersData]);
  const allProducts = useMemo(() => productsData?.data || [], [productsData]);
  const categoryOptions = useMemo(() => {
    const grouped = categoriesData?.data || categoriesData || {};
    return Object.values(grouped).flat();
  }, [categoriesData]);

  // Stats
  const stats = useMemo(() => ({
    revenue: allOrders
      .filter((o) => o.status === 'paid' || o.status === 'delivered')
      .reduce((sum, o) => sum + parseFloat(o.total || 0), 0),
    orders: allOrders.length,
    submitted: allOrders.filter((o) => o.status === 'submitted').length,
    products: allProducts.length,
  }), [allOrders, allProducts]);

  // Actions
  const runAction = async (key, fn) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      refresh();
    } catch (err) {
      setError(err.error || String(err));
    } finally {
      setBusy(null);
    }
  };

  const markPaid = (ticketId) =>
    runAction(`pay-${ticketId}`, () => ordersApi.markPaid(ticketId));

  const markDelivered = (ticketId) =>
    runAction(`deliver-${ticketId}`, () => ordersApi.markDelivered(ticketId));

  const deleteProduct = (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    runAction(`del-${id}`, () => productsApi.delete(id));
  };

  const createProduct = () => {
    if (!newProduct.name || !newProduct.price) {
      setError('Name and price are required');
      return;
    }
    runAction('create', async () => {
      await productsApi.create({
        name: newProduct.name,
        description: newProduct.description,
        price: parseFloat(newProduct.price),
        categoryId: newProduct.categoryId || null,
      });
      setNewProduct({ name: '', description: '', price: '', categoryId: '' });
      setShowNewProduct(false);
    });
  };

  const statusBadge = (status) => (
    <span className={`admin-badge admin-badge-${status}`}>{status}</span>
  );

  return (
    <div className="container admin-panel">
      <h1>Admin Panel</h1>
      <p className="admin-sub">Wolffewrought store management</p>

      {error && <div className="admin-error">{error}</div>}

      {/* Stats */}
      <div className="admin-stats">
        <div className="admin-stat">
          <span className="admin-stat-label">Revenue (paid)</span>
          <span className="admin-stat-value">£{stats.revenue.toFixed(2)}</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-label">Orders</span>
          <span className="admin-stat-value">{stats.orders}</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-label">Awaiting action</span>
          <span className="admin-stat-value">{stats.submitted}</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-label">Products</span>
          <span className="admin-stat-value">{stats.products}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders tab */}
      {activeTab === 'orders' && (
        <div className="admin-section">
          {ordersLoading ? (
            <p>Loading orders…</p>
          ) : allOrders.length === 0 ? (
            <p className="admin-empty">No orders yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allOrders.map((order) => (
                    <tr key={order.ticket_id}>
                      <td className="admin-mono">{order.ticket_id}</td>
                      <td>
                        {order.username}
                        <span className="admin-dim"> {order.email}</span>
                      </td>
                      <td className="admin-mono">£{parseFloat(order.total || 0).toFixed(2)}</td>
                      <td>{statusBadge(order.status)}</td>
                      <td className="admin-dim">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="admin-actions">
                          {order.status === 'submitted' && (
                            <button
                              className="btn btn-sm"
                              disabled={busy === `pay-${order.ticket_id}`}
                              onClick={() => markPaid(order.ticket_id)}
                            >
                              Mark Paid
                            </button>
                          )}
                          {order.status === 'paid' && (
                            <button
                              className="btn btn-sm"
                              disabled={busy === `deliver-${order.ticket_id}`}
                              onClick={() => markDelivered(order.ticket_id)}
                            >
                              Mark Delivered
                            </button>
                          )}
                          <a
                            className="admin-link"
                            href={ordersApi.downloadPdf(order.ticket_id)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            PDF
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Products tab */}
      {activeTab === 'products' && (
        <div className="admin-section">
          <div className="admin-section-head">
            <button
              className="btn"
              onClick={() => setShowNewProduct(!showNewProduct)}
            >
              {showNewProduct ? 'Cancel' : '+ Add Product'}
            </button>
          </div>

          {showNewProduct && (
            <div className="admin-form">
              <input
                type="text"
                placeholder="Product name"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              />
              <input
                type="number"
                placeholder="Price (£)"
                min="0"
                step="0.01"
                value={newProduct.price}
                onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
              />
              <select
                value={newProduct.categoryId}
                onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
              >
                <option value="">Select category…</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <textarea
                placeholder="Description"
                rows={3}
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              />
              <button className="btn" disabled={busy === 'create'} onClick={createProduct}>
                Create Product
              </button>
            </div>
          )}

          {productsLoading ? (
            <p>Loading products…</p>
          ) : allProducts.length === 0 ? (
            <p className="admin-empty">No products yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allProducts.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td className="admin-dim">{p.category_name || '—'}</td>
                      <td className="admin-dim">{p.category_type || '—'}</td>
                      <td className="admin-mono">£{parseFloat(p.price).toFixed(2)}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-danger"
                          disabled={busy === `del-${p.id}`}
                          onClick={() => deleteProduct(p.id, p.name)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles = `
  .admin-panel { padding: 2rem 0; }
  .admin-panel h1 { margin-bottom: 0.25rem; }
  .admin-sub { color: var(--secondary); margin-bottom: 1.5rem; }

  .admin-error {
    background: rgba(220, 53, 69, 0.1);
    border: 1px solid var(--danger);
    color: var(--danger);
    padding: 0.75rem 1rem;
    border-radius: var(--border-radius);
    margin-bottom: 1rem;
  }

  .admin-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  .admin-stat {
    background: var(--white);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .admin-stat-label { color: var(--secondary); font-size: 0.8rem; }
  .admin-stat-value { font-size: 1.5rem; font-weight: 700; }

  .admin-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid #e0e0e0;
  }
  .admin-tab {
    background: none;
    border: none;
    padding: 0.75rem 1.25rem;
    cursor: pointer;
    font-size: 1rem;
    color: var(--secondary);
    border-bottom: 2px solid transparent;
  }
  .admin-tab.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
    font-weight: 600;
  }

  .admin-section-head { margin-bottom: 1rem; }

  .admin-form {
    background: var(--white);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    display: grid;
    gap: 0.75rem;
  }
  .admin-form input, .admin-form select, .admin-form textarea {
    padding: 0.6rem 0.8rem;
    border: 1px solid #ccc;
    border-radius: var(--border-radius);
    font-size: 0.95rem;
    font-family: inherit;
  }

  .admin-table-wrap { overflow-x: auto; }
  .admin-table {
    width: 100%;
    border-collapse: collapse;
    background: var(--white);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    font-size: 0.9rem;
  }
  .admin-table th, .admin-table td {
    text-align: left;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #eee;
  }
  .admin-table th { color: var(--secondary); font-weight: 600; }

  .admin-mono { font-family: monospace; }
  .admin-dim { color: var(--secondary); font-size: 0.85em; }
  .admin-empty { color: var(--secondary); padding: 2rem 0; }

  .admin-actions { display: flex; gap: 0.5rem; align-items: center; }
  .btn-sm { padding: 0.3rem 0.7rem; font-size: 0.8rem; }
  .btn-danger { background: var(--danger); }
  .admin-link { font-size: 0.85rem; }

  .admin-badge {
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: capitalize;
  }
  .admin-badge-draft { background: #eee; color: #555; }
  .admin-badge-submitted { background: rgba(255, 193, 7, 0.2); color: #8a6d00; }
  .admin-badge-paid { background: rgba(23, 162, 184, 0.15); color: #0c5460; }
  .admin-badge-delivered { background: rgba(40, 167, 69, 0.15); color: #155724; }
  .admin-badge-cancelled { background: rgba(220, 53, 69, 0.12); color: #721c24; }

  @media (max-width: 768px) {
    .admin-table { font-size: 0.8rem; }
    .admin-table th, .admin-table td { padding: 0.5rem; }
  }
`;

const style = document.createElement('style');
style.innerHTML = styles;
document.head.appendChild(style);
