import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { useAuthContext } from '../context/AuthContext';
import { orders as ordersApi, downloads as downloadsApi } from '../services/api';

const STATUS_LABELS = {
  draft: { label: 'Draft', color: '#6c757d' },
  submitted: { label: 'Submitted', color: '#17a2b8' },
  paid: { label: 'Paid', color: '#ffc107' },
  archived: { label: 'Delivered', color: '#28a745' },
};

const DownloadsSection = ({ ticketId }) => {
  const [files, setFiles] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await downloadsApi.forOrder(ticketId);
      setFiles(res.data || []);
    } catch (e) {
      setErr(e.error || 'Could not load downloads');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, [ticketId]);

  return (
    <div className="card mt-3">
      <h3>Your Downloads</h3>
      {loading && <p>Loading…</p>}
      {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}
      {files && files.length === 0 && (
        <p style={{ color: 'var(--secondary)' }}>No digital files in this order.</p>
      )}
      {files && files.map((f) => (
        <div
          key={f.id}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #eee', gap: '0.5rem' }}
        >
          <span style={{ wordBreak: 'break-all' }}>
            {f.fileName} <span style={{ color: 'var(--secondary)', fontSize: '0.85em' }}>({f.productName})</span>
          </span>
          <a className="btn btn-small btn-primary" href={f.url} target="_blank" rel="noreferrer">
            Download
          </a>
        </div>
      ))}
      {files && files.length > 0 && (
        <p style={{ color: 'var(--secondary)', fontSize: '0.8rem', marginTop: '0.75rem' }}>
          Links expire after a short time — refresh this page for fresh ones.
        </p>
      )}
    </div>
  );
};

export const OrderDetailPage = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [submitting, setSubmitting] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');

  const { data: orderData, loading, error, refetch } = useFetch(() => ordersApi.get(ticketId), [ticketId]);

  const order = orderData?.data;

  React.useEffect(() => {
    if (order) {
      setNotes(order.customer_notes || '');
    }
  }, [order]);

  if (loading) {
    return (
      <div className="flex flex-center" style={{ minHeight: '600px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">{error || 'Order not found'}</div>
      </div>
    );
  }

  const handleSubmitOrder = async () => {
    setSubmitting(true);
    try {
      const response = await ordersApi.submit(ticketId);
      alert('Order submitted! Your PDF will download now.');
      try {
        await ordersApi.downloadPdfFile(ticketId);
      } catch (e) {
        // PDF can still be downloaded later from this page
      }
      refetch();
    } catch (error) {
      alert(error.error || 'Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      await ordersApi.downloadPdfFile(ticketId);
    } catch (e) {
      alert('PDF download failed — try again in a moment.');
    }
  };

  const status = STATUS_LABELS[order.status] || { label: order.status, color: '#ccc' };
  const items = order.items || [];

  return (
    <div className="order-detail-page">
      <div className="container mt-4">
        <div className="flex flex-between mb-3">
          <h1>Order {ticketId}</h1>
          <span
            className="status-badge"
            style={{ backgroundColor: status.color, color: 'white', padding: '0.5rem 1rem', borderRadius: '4px' }}
          >
            {status.label}
          </span>
        </div>

        <div className="order-grid">
          {/* Items */}
          <div className="order-items card">
            <h3>Items</h3>
            <table className="items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>£{parseFloat(item.price_at_purchase).toFixed(2)}</td>
                    <td>£{(item.quantity * parseFloat(item.price_at_purchase)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="order-total">
              <strong>Total: £{parseFloat(order.total_price).toFixed(2)}</strong>
            </div>
          </div>

          {/* Details */}
          <div className="order-details">
            {order.status === 'archived' && <DownloadsSection ticketId={ticketId} />}
            <div className="card">
              <h3>Customer Details</h3>
              <p><strong>Name:</strong> {order.customer_name}</p>
              <p><strong>Email:</strong> {order.customer_email}</p>

              {editingNotes && order.status === 'draft' ? (
                <div>
                  <label>Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <div className="mt-2">
                    <button className="btn btn-small btn-primary">Save</button>
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => setEditingNotes(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p>
                    <strong>Notes:</strong> {order.customer_notes || 'None'}
                  </p>
                  {order.status === 'draft' && (
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => setEditingNotes(true)}
                    >
                      Edit Notes
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="card mt-3">
              <h3>Actions</h3>

              {order.status === 'draft' && (
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitOrder}
                  disabled={submitting}
                  style={{ width: '100%' }}
                >
                  {submitting ? 'Submitting...' : 'Submit Order'}
                </button>
              )}

              {order.status !== 'draft' && (
                <button
                  className="btn btn-primary"
                  onClick={handleDownloadPdf}
                  style={{ width: '100%' }}
                >
                  Download PDF
                </button>
              )}

              {order.status === 'draft' && (
                <button
                  className="btn btn-danger"
                  onClick={async () => {
                    if (window.confirm('Delete this order?')) {
                      try {
                        await ordersApi.delete(ticketId);
                        navigate('/orders');
                      } catch (error) {
                        alert(error.error || 'Failed to delete');
                      }
                    }
                  }}
                  style={{ width: '100%', marginTop: '0.5rem' }}
                >
                  Delete Order
                </button>
              )}

              <button
                className="btn btn-secondary"
                onClick={() => navigate('/orders')}
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                Back to Orders
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = `
  .order-grid {
    display: grid;
    grid-template-columns: 1fr 350px;
    gap: 2rem;
    margin: 2rem 0;
  }

  .items-table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
  }

  .items-table th,
  .items-table td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #e0e0e0;
  }

  .items-table th {
    background: var(--light);
    font-weight: 600;
  }

  .order-total {
    padding: 1rem 0;
    border-top: 2px solid #e0e0e0;
    font-size: 1.1rem;
  }

  @media (max-width: 768px) {
    .order-grid {
      grid-template-columns: 1fr;
    }
  }
`;

const style = document.createElement('style');
style.innerHTML = styles;
document.head.appendChild(style);
