import React, { useState, useMemo } from 'react';
import { useFetch } from '../hooks/useFetch';
import {
  orders as ordersApi,
  products as productsApi,
  categories as categoriesApi,
  ips as ipsApi,
  modellers as modellersApi,
  media as mediaApi,
  downloads as downloadsApi,
} from '../services/api';

const TABS = [
  { id: 'orders', label: 'Orders' },
  { id: 'products', label: 'Products' },
  { id: 'categories', label: 'Categories' },
  { id: 'creators', label: 'Creators & IPs' },
];

const CATEGORY_TYPES = [
  { id: 'printed', label: 'Printed Products' },
  { id: 'stl', label: 'STLs' },
  { id: 'asset', label: '3D Assets' },
];

export const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('orders');
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  // Product form
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '', description: '', price: '', categoryId: '', ipId: '', modellerId: '', stockCount: '',
  });

  // Category form
  const [newCategory, setNewCategory] = useState({ name: '', type: 'printed', description: '' });

  // IP / Modeller forms
  const [newIp, setNewIp] = useState('');
  const [newModeller, setNewModeller] = useState('');

  // Media management
  const [mediaProductId, setMediaProductId] = useState(null);
  const [mediaDetail, setMediaDetail] = useState(null);
  const [uploading, setUploading] = useState(null); // 'image' | 'file' | null

  const refresh = () => setRefreshKey((k) => k + 1);

  // Data
  const { data: ordersData, loading: ordersLoading } = useFetch(
    () => ordersApi.adminAll(), [refreshKey]
  );
  const { data: productsData, loading: productsLoading } = useFetch(
    () => productsApi.list(), [refreshKey]
  );
  const { data: categoriesData } = useFetch(() => categoriesApi.list(), [refreshKey]);
  const { data: ipsData } = useFetch(() => ipsApi.list(), [refreshKey]);
  const { data: modellersData } = useFetch(() => modellersApi.list(), [refreshKey]);

  const allOrders = useMemo(() => ordersData?.data || [], [ordersData]);
  const allProducts = useMemo(() => productsData?.data || [], [productsData]);
  const allIps = useMemo(() => ipsData?.data || ipsData || [], [ipsData]);
  const allModellers = useMemo(() => modellersData?.data || modellersData || [], [modellersData]);

  // Categories come grouped by type: { printed: [...], stl: [...], asset: [...] }
  const groupedCategories = useMemo(() => {
    const grouped = categoriesData?.data || categoriesData || {};
    return Array.isArray(grouped) ? { all: grouped } : grouped;
  }, [categoriesData]);

  const flatCategories = useMemo(
    () => Object.entries(groupedCategories).flatMap(([type, cats]) =>
      (cats || []).map((c) => ({ ...c, type: c.type || type }))
    ),
    [groupedCategories]
  );

  // Stats
  const stats = useMemo(() => ({
    revenue: allOrders
      .filter((o) => o.status === 'paid' || o.status === 'archived')
      .reduce((sum, o) => sum + parseFloat(o.total || 0), 0),
    orders: allOrders.length,
    submitted: allOrders.filter((o) => o.status === 'submitted').length,
    products: allProducts.length,
  }), [allOrders, allProducts]);

  // Generic action wrapper
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

  // Order actions
  const markPaid = (ticketId) =>
    runAction(`pay-${ticketId}`, () => ordersApi.markPaid(ticketId));
  const markDelivered = (ticketId) =>
    runAction(`deliver-${ticketId}`, () => ordersApi.markDelivered(ticketId));

  const deleteOrder = (ticketId) => {
    if (!window.confirm(`Delete order ${ticketId}? The customer will lose access to it (including downloads). This cannot be undone.`)) return;
    runAction(`del-order-${ticketId}`, () => ordersApi.adminDelete(ticketId));
  };

  // Product actions
  const createProduct = () => {
    if (!newProduct.name || !newProduct.price || !newProduct.categoryId || !newProduct.modellerId) {
      setError('Name, price, category, and creator are all required');
      return;
    }
    runAction('create-product', async () => {
      await productsApi.create({
        name: newProduct.name,
        description: newProduct.description,
        price: parseFloat(newProduct.price),
        categoryId: parseInt(newProduct.categoryId),
        ipId: newProduct.ipId ? parseInt(newProduct.ipId) : null,
        modellerId: parseInt(newProduct.modellerId),
        stockCount: newProduct.stockCount !== '' ? parseInt(newProduct.stockCount) : null,
      });
      setNewProduct({ name: '', description: '', price: '', categoryId: '', ipId: '', modellerId: '', stockCount: '' });
      setShowNewProduct(false);
    });
  };

  const deleteProduct = (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    runAction(`del-product-${id}`, () => productsApi.delete(id));
  };

  // Category actions
  const createCategory = () => {
    if (!newCategory.name) { setError('Category name is required'); return; }
    runAction('create-category', async () => {
      await categoriesApi.create(newCategory);
      setNewCategory({ name: '', type: 'printed', description: '' });
    });
  };

  const deleteCategory = (id, name) => {
    if (!window.confirm(`Delete category "${name}"? Products in it will lose their category.`)) return;
    runAction(`del-category-${id}`, () => categoriesApi.delete(id));
  };

  // IP / Modeller actions
  const createIp = () => {
    if (!newIp) return;
    runAction('create-ip', async () => {
      await ipsApi.create({ name: newIp });
      setNewIp('');
    });
  };
  const deleteIp = (id, name) => {
    if (!window.confirm(`Delete IP "${name}"?`)) return;
    runAction(`del-ip-${id}`, () => ipsApi.delete(id));
  };
  const createModeller = () => {
    if (!newModeller) return;
    runAction('create-modeller', async () => {
      await modellersApi.create({ name: newModeller });
      setNewModeller('');
    });
  };
  const deleteModeller = (id, name) => {
    if (!window.confirm(`Delete creator "${name}"?`)) return;
    runAction(`del-modeller-${id}`, () => modellersApi.delete(id));
  };

  const uploadToR2 = async (file, kind) => {
    let res;
    try {
      res = await downloadsApi.getUploadUrl({
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        kind,
      });
    } catch (err) {
      throw new Error(`Step 1 (backend permission) failed: ${err.error || err.message || err}`);
    }
    const { uploadUrl, key, publicUrl } = res.data;
    let put;
    try {
      put = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
    } catch (err) {
      throw new Error(
        `Step 2 (upload to Cloudflare) failed — this is a CORS or bucket-URL problem. Target host: ${new URL(uploadUrl).hostname}`
      );
    }
    if (!put.ok) throw new Error(`Step 2: Cloudflare rejected the upload (HTTP ${put.status})`);
    return { key, publicUrl };
  };

  // Media management
  const openMedia = async (productId) => {
    if (mediaProductId === productId) {
      setMediaProductId(null);
      setMediaDetail(null);
      return;
    }
    setMediaProductId(productId);
    setMediaDetail(null);
    try {
      const res = await productsApi.get(productId);
      setMediaDetail(res.data || res);
    } catch (err) {
      setError(err.error || String(err));
    }
  };

  const reloadMedia = async () => {
    if (!mediaProductId) return;
    const res = await productsApi.get(mediaProductId);
    setMediaDetail(res.data || res);
  };

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading('image');
    setError(null);
    try {
      const { publicUrl } = await uploadToR2(file, 'image');
      await mediaApi.addImage(mediaProductId, {
        imageUrl: publicUrl,
        displayOrder: (mediaDetail?.images?.length || 0),
      });
      await reloadMedia();
    } catch (err) {
      setError(err.error || String(err));
    } finally {
      setUploading(null);
    }
  };

  const removeImage = (imageId) =>
    runAction(`del-image-${imageId}`, async () => {
      await mediaApi.deleteImage(imageId);
      await reloadMedia();
    });

  const handleFilePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading('file');
    setError(null);
    try {
      const { key } = await uploadToR2(file, 'file');
      const ext = (file.name.split('.').pop() || 'other').toLowerCase();
      await mediaApi.addFile(mediaProductId, {
        fileName: file.name,
        fileUrl: key, // object key, NOT a public URL — served via gated presigned links
        fileType: ['stl', 'zip', '3mf', 'obj'].includes(ext) ? ext : 'other',
      });
      await reloadMedia();
    } catch (err) {
      setError(err.error || String(err));
    } finally {
      setUploading(null);
    }
  };

  const removeFile = (fileId) =>
    runAction(`del-file-${fileId}`, async () => {
      await mediaApi.deleteFile(fileId);
      await reloadMedia();
    });

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

      {/* ---------- ORDERS ---------- */}
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
                      <td className="admin-dim">{new Date(order.created_at).toLocaleDateString()}</td>
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
                          <button
                            className="btn btn-sm"
                            onClick={() => ordersApi.downloadPdfFile(order.ticket_id).catch(() => setError('PDF download failed'))}
                          >
                            PDF
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            disabled={busy === `del-order-${order.ticket_id}`}
                            onClick={() => deleteOrder(order.ticket_id)}
                          >
                            Delete
                          </button>
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

      {/* ---------- PRODUCTS ---------- */}
      {activeTab === 'products' && (
        <div className="admin-section">
          <div className="admin-section-head">
            <button className="btn" onClick={() => setShowNewProduct(!showNewProduct)}>
              {showNewProduct ? 'Cancel' : '+ Add Product'}
            </button>
          </div>

          {showNewProduct && (
            <div className="admin-form">
              <input
                type="text"
                placeholder="Product name *"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              />
              <input
                type="number"
                placeholder="Price (£) *"
                min="0"
                step="0.01"
                value={newProduct.price}
                onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
              />
              <select
                value={newProduct.categoryId}
                onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
              >
                <option value="">Category * …</option>
                {flatCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                ))}
              </select>
              <select
                value={newProduct.modellerId}
                onChange={(e) => setNewProduct({ ...newProduct, modellerId: e.target.value })}
              >
                <option value="">Creator * …</option>
                {allModellers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <select
                value={newProduct.ipId}
                onChange={(e) => setNewProduct({ ...newProduct, ipId: e.target.value })}
              >
                <option value="">IP (optional) …</option>
                {allIps.map((ip) => (
                  <option key={ip.id} value={ip.id}>{ip.name}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Stock count (blank = digital/unlimited)"
                min="0"
                value={newProduct.stockCount}
                onChange={(e) => setNewProduct({ ...newProduct, stockCount: e.target.value })}
              />
              <textarea
                placeholder="Description"
                rows={3}
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              />
              {flatCategories.length === 0 && (
                <p className="admin-hint">No categories yet — create one in the Categories tab first.</p>
              )}
              {allModellers.length === 0 && (
                <p className="admin-hint">No creators yet — add yourself in the Creators & IPs tab first.</p>
              )}
              <button className="btn" disabled={busy === 'create-product'} onClick={createProduct}>
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
                    <React.Fragment key={p.id}>
                      <tr>
                        <td>{p.name}</td>
                        <td className="admin-dim">{p.category_name || '—'}</td>
                        <td className="admin-dim">{p.category_type || '—'}</td>
                        <td className="admin-mono">£{parseFloat(p.price).toFixed(2)}</td>
                        <td>
                          <div className="admin-actions">
                            <button className="btn btn-sm" onClick={() => openMedia(p.id)}>
                              {mediaProductId === p.id ? 'Close' : 'Media'}
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              disabled={busy === `del-product-${p.id}`}
                              onClick={() => deleteProduct(p.id, p.name)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                      {mediaProductId === p.id && (
                        <tr>
                          <td colSpan={5}>
                            <div className="admin-media">
                              {!mediaDetail ? (
                                <p>Loading media…</p>
                              ) : (
                                <>
                                  <div className="admin-media-col">
                                    <h4>Images</h4>
                                    {(mediaDetail.images || []).length === 0 && (
                                      <p className="admin-dim">No images.</p>
                                    )}
                                    {(mediaDetail.images || []).map((img) => (
                                      <div key={img.id} className="admin-media-row">
                                        <span className="admin-media-url">{img.image_url}</span>
                                        <button
                                          className="btn btn-sm btn-danger"
                                          onClick={() => removeImage(img.id)}
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ))}
                                    <div className="admin-media-add">
                                      <label className="btn btn-sm admin-upload-btn">
                                        {uploading === 'image' ? 'Uploading…' : '+ Upload Image'}
                                        <input
                                          type="file"
                                          accept="image/*"
                                          hidden
                                          disabled={uploading !== null}
                                          onChange={handleImagePick}
                                        />
                                      </label>
                                    </div>
                                  </div>

                                  <div className="admin-media-col">
                                    <h4>Files (customer downloads)</h4>
                                    {(mediaDetail.files || []).length === 0 && (
                                      <p className="admin-dim">No files.</p>
                                    )}
                                    {(mediaDetail.files || []).map((f) => (
                                      <div key={f.id} className="admin-media-row">
                                        <span className="admin-media-url">
                                          {f.file_name} <span className="admin-dim">({f.file_type})</span>
                                        </span>
                                        <button
                                          className="btn btn-sm btn-danger"
                                          onClick={() => removeFile(f.id)}
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ))}
                                    <div className="admin-media-add">
                                      <label className="btn btn-sm admin-upload-btn">
                                        {uploading === 'file' ? 'Uploading…' : '+ Upload File'}
                                        <input
                                          type="file"
                                          accept=".stl,.zip,.3mf,.obj"
                                          hidden
                                          disabled={uploading !== null}
                                          onChange={handleFilePick}
                                        />
                                      </label>
                                      <span className="admin-hint">Stored privately — customers get expiring links after delivery.</span>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------- CATEGORIES ---------- */}
      {activeTab === 'categories' && (
        <div className="admin-section">
          <div className="admin-form">
            <input
              type="text"
              placeholder="Category name (e.g. Weapon Props)"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
            />
            <select
              value={newCategory.type}
              onChange={(e) => setNewCategory({ ...newCategory, type: e.target.value })}
            >
              {CATEGORY_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Description (optional)"
              value={newCategory.description}
              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
            />
            <button className="btn" disabled={busy === 'create-category'} onClick={createCategory}>
              Create Category
            </button>
            <p className="admin-hint">
              The type controls which storefront tab the category's products appear under.
            </p>
          </div>

          {CATEGORY_TYPES.map((t) => {
            const cats = flatCategories.filter((c) => c.type === t.id);
            return (
              <div key={t.id} className="admin-cat-group">
                <h4>{t.label}</h4>
                {cats.length === 0 ? (
                  <p className="admin-dim">None yet.</p>
                ) : (
                  cats.map((c) => (
                    <div key={c.id} className="admin-media-row">
                      <span>
                        {c.name}
                        {c.description && <span className="admin-dim"> — {c.description}</span>}
                      </span>
                      <button
                        className="btn btn-sm btn-danger"
                        disabled={busy === `del-category-${c.id}`}
                        onClick={() => deleteCategory(c.id, c.name)}
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---------- CREATORS & IPS ---------- */}
      {activeTab === 'creators' && (
        <div className="admin-section admin-two-col">
          <div>
            <h4>Creators / Modellers</h4>
            <p className="admin-hint">Required on every product — add yourself first (e.g. "Wolffewrought").</p>
            <div className="admin-media-add">
              <input
                type="text"
                placeholder="Creator name"
                value={newModeller}
                onChange={(e) => setNewModeller(e.target.value)}
              />
              <button className="btn btn-sm" disabled={busy === 'create-modeller'} onClick={createModeller}>
                Add
              </button>
            </div>
            {allModellers.map((m) => (
              <div key={m.id} className="admin-media-row">
                <span>{m.name}</span>
                <button
                  className="btn btn-sm btn-danger"
                  disabled={busy === `del-modeller-${m.id}`}
                  onClick={() => deleteModeller(m.id, m.name)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

          <div>
            <h4>IPs / Franchises</h4>
            <p className="admin-hint">Optional product tag used by the storefront IP filter.</p>
            <div className="admin-media-add">
              <input
                type="text"
                placeholder="IP name"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
              />
              <button className="btn btn-sm" disabled={busy === 'create-ip'} onClick={createIp}>
                Add
              </button>
            </div>
            {allIps.map((ip) => (
              <div key={ip.id} className="admin-media-row">
                <span>{ip.name}</span>
                <button
                  className="btn btn-sm btn-danger"
                  disabled={busy === `del-ip-${ip.id}`}
                  onClick={() => deleteIp(ip.id, ip.name)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
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

  .admin-hint { color: var(--secondary); font-size: 0.8rem; }

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
    overflow-x: auto;
  }
  .admin-tab {
    background: none;
    border: none;
    padding: 0.75rem 1.25rem;
    cursor: pointer;
    font-size: 1rem;
    color: var(--secondary);
    border-bottom: 2px solid transparent;
    white-space: nowrap;
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

  .admin-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
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
  .admin-badge-archived { background: rgba(40, 167, 69, 0.15); color: #155724; }
  .admin-badge-cancelled { background: rgba(220, 53, 69, 0.12); color: #721c24; }

  .admin-media {
    background: var(--light);
    border-radius: var(--border-radius);
    padding: 1rem;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }
  .admin-media h4 { margin-bottom: 0.5rem; }
  .admin-media-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0;
    border-bottom: 1px solid #e5e5e5;
  }
  .admin-media-url {
    font-size: 0.8rem;
    word-break: break-all;
  }
  .admin-media-add {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
    flex-wrap: wrap;
  }
  .admin-media-add input, .admin-media-add select {
    flex: 1;
    min-width: 140px;
    padding: 0.5rem 0.7rem;
    border: 1px solid #ccc;
    border-radius: var(--border-radius);
    font-size: 0.85rem;
  }
  .admin-upload-btn { display: inline-block; cursor: pointer; }

  .admin-cat-group {
    background: var(--white);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    padding: 1rem 1.25rem;
    margin-bottom: 1rem;
  }
  .admin-cat-group h4 { margin-bottom: 0.5rem; }

  .admin-two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }
  .admin-two-col > div {
    background: var(--white);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    padding: 1.25rem;
  }

  @media (max-width: 768px) {
    .admin-table { font-size: 0.8rem; }
    .admin-table th, .admin-table td { padding: 0.5rem; }
    .admin-media { grid-template-columns: 1fr; }
    .admin-two-col { grid-template-columns: 1fr; }
  }
`;

const style = document.createElement('style');
style.innerHTML = styles;
document.head.appendChild(style);
