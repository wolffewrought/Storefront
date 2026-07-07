import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useAuthContext } from '../context/AuthContext';
import { orders as ordersApi } from '../services/api';

export const CartPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { items, total, count, removeItem, updateQuantity, clear, formatForOrder } = useCart();
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    customerName: user?.username || '',
    customerEmail: user?.email || '',
    customerNotes: '',
  });

  const handleCreateOrder = async () => {
    if (items.length === 0) {
      alert('Cart is empty');
      return;
    }

    if (!user) {
      navigate('/login');
      return;
    }

    setCreating(true);
    try {
      const response = await ordersApi.create({
        items: formatForOrder(),
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerNotes: formData.customerNotes,
      });

      const ticketId = response.data.ticketId;
      clear();
      navigate(`/orders/${ticketId}`);
    } catch (error) {
      alert(error.error || 'Failed to create order');
    } finally {
      setCreating(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mt-4">
        <div className="cart-empty">
          <h2>Your cart is empty</h2>
          <p className="text-muted">Add some products to get started!</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="container mt-4">
        <h1>Shopping Cart</h1>

        <div className="cart-grid">
          {/* Items */}
          <div className="cart-items">
            {items.map((item) => (
              <div key={item.productId} className="cart-item card">
                <div className="item-info">
                  <h5>{item.name}</h5>
                  <p className="price">£{parseFloat(item.price).toFixed(2)}</p>
                </div>

                <div className="item-quantity">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateQuantity(item.productId, parseInt(e.target.value) || 1)
                    }
                  />
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>

                <div className="item-total">
                  £{(parseFloat(item.price) * item.quantity).toFixed(2)}
                </div>

                <button
                  className="btn btn-danger btn-small"
                  onClick={() => removeItem(item.productId)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Checkout */}
          <div className="checkout-sidebar">
            <div className="card">
              <h3>Order Summary</h3>

              <div className="summary-line">
                <span>Subtotal:</span>
                <span>£{total.toFixed(2)}</span>
              </div>

              <div className="summary-line total">
                <span>Total:</span>
                <span>£{total.toFixed(2)}</span>
              </div>

              <hr style={{ margin: '1.5rem 0' }} />

              <h4>Customer Details</h4>

              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData({ ...formData, customerName: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, customerEmail: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Notes (optional)</label>
                <textarea
                  value={formData.customerNotes}
                  onChange={(e) =>
                    setFormData({ ...formData, customerNotes: e.target.value })
                  }
                  placeholder="Any special requests?"
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={handleCreateOrder}
                disabled={creating}
                style={{ width: '100%' }}
              >
                {creating ? 'Creating order...' : 'Create Order Ticket'}
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => navigate('/')}
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = `
  .cart-empty {
    text-align: center;
    padding: 4rem 0;
  }

  .cart-grid {
    display: grid;
    grid-template-columns: 1fr 350px;
    gap: 2rem;
    margin: 2rem 0;
  }

  .cart-items {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .cart-item {
    display: grid;
    grid-template-columns: 1fr auto auto auto;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
  }

  .item-info h5 {
    margin-bottom: 0.5rem;
  }

  .item-info .price {
    color: var(--primary);
    font-weight: 600;
  }

  .item-quantity {
    display: flex;
    align-items: center;
    border: 1px solid #ddd;
    border-radius: var(--border-radius);
    overflow: hidden;
  }

  .item-quantity button {
    background: var(--light);
    border: none;
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-weight: bold;
    transition: background 0.2s;
  }

  .item-quantity button:hover {
    background: #e0e0e0;
  }

  .item-quantity input {
    width: 50px;
    border: none;
    text-align: center;
    padding: 0.5rem;
  }

  .item-total {
    font-weight: 600;
    font-size: 1.1rem;
    min-width: 80px;
    text-align: right;
  }

  .checkout-sidebar {
    height: fit-content;
    position: sticky;
    top: 120px;
  }

  .checkout-sidebar .card {
    padding: 1.5rem;
  }

  .checkout-sidebar h3 {
    margin-bottom: 1rem;
  }

  .checkout-sidebar h4 {
    margin-top: 1.5rem;
    margin-bottom: 1rem;
  }

  .summary-line {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid #e0e0e0;
  }

  .summary-line.total {
    font-weight: 700;
    font-size: 1.1rem;
    border-bottom: none;
    margin-top: 1rem;
  }

  @media (max-width: 768px) {
    .cart-grid {
      grid-template-columns: 1fr;
    }

    .checkout-sidebar {
      position: static;
    }

    .cart-item {
      grid-template-columns: 1fr;
    }

    .item-quantity,
    .item-total {
      width: 100%;
    }
  }
`;

const style = document.createElement('style');
style.innerHTML = styles;
document.head.appendChild(style);
