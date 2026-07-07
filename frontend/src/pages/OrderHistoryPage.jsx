import React from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { orders as ordersApi } from '../services/api';

const STATUS_LABELS = {
  draft: { label: 'Draft', color: '#6c757d' },
  submitted: { label: 'Submitted', color: '#17a2b8' },
  paid: { label: 'Paid', color: '#ffc107' },
  archived: { label: 'Delivered', color: '#28a745' },
};

export const OrderHistoryPage = () => {
  const { data: ordersData, loading, error } = useFetch(() => ordersApi.list());

  const orders = ordersData?.data || [];

  if (loading) {
    return (
      <div className="flex flex-center" style={{ minHeight: '600px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="container mt-4">
        <h1>My Orders</h1>

        {orders.length === 0 ? (
          <div className="text-center" style={{ padding: '2rem 0' }}>
            <p className="text-muted">You haven't placed any orders yet.</p>
            <Link to="/" className="btn btn-primary mt-3">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => {
              const status = STATUS_LABELS[order.status] || { label: order.status, color: '#ccc' };
              const date = new Date(order.created_at).toLocaleDateString();

              return (
                <div key={order.id} className="order-card card">
                  <div className="order-header">
                    <div>
                      <h4>{order.ticket_id}</h4>
                      <p className="text-muted">{date}</p>
                    </div>
                    <div className="order-info">
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: status.color,
                          color: 'white',
                          padding: '0.5rem 1rem',
                          borderRadius: '4px',
                        }}
                      >
                        {status.label}
                      </span>
                      <p className="order-total">£{parseFloat(order.total_price).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="order-actions">
                    <Link to={`/orders/${order.ticket_id}`} className="btn btn-primary btn-small">
                      View Order
                    </Link>
                    {order.status !== 'draft' && (
                      <a
                        href={ordersApi.downloadPdf(order.ticket_id)}
                        download={`order_${order.ticket_id}.pdf`}
                        className="btn btn-secondary btn-small"
                      >
                        Download PDF
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = `
  .orders-page {
    min-height: calc(100vh - 200px);
  }

  .orders-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin: 2rem 0;
  }

  .order-card {
    padding: 1.5rem;
  }

  .order-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .order-header h4 {
    margin-bottom: 0.25rem;
  }

  .order-info {
    text-align: right;
  }

  .order-total {
    font-weight: 700;
    font-size: 1.1rem;
    margin-top: 0.5rem;
  }

  .order-actions {
    display: flex;
    gap: 0.5rem;
  }

  @media (max-width: 768px) {
    .order-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .order-info {
      text-align: left;
      margin-top: 1rem;
    }

    .order-actions {
      flex-wrap: wrap;
    }
  }
`;

const style = document.createElement('style');
style.innerHTML = styles;
document.head.appendChild(style);
