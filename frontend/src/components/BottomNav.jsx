import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { useCart } from '../hooks/useCart';

export const BottomNav = () => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuthContext();
  const { count } = useCart();

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <nav className="bottom-nav">
      <Link to="/" className={`bottom-nav-item ${isActive('/') ? 'active' : ''}`}>
        <span className="bottom-nav-icon">🏠</span>
        Shop
      </Link>
      <Link to="/cart" className={`bottom-nav-item ${isActive('/cart') ? 'active' : ''}`}>
        <span className="bottom-nav-icon">
          🛒
          {count > 0 && <span className="bottom-nav-badge">{count}</span>}
        </span>
        Cart
      </Link>
      <Link
        to={isAuthenticated ? '/orders' : '/login'}
        className={`bottom-nav-item ${isActive('/orders') ? 'active' : ''}`}
      >
        <span className="bottom-nav-icon">📦</span>
        Orders
      </Link>
      <Link
        to={isAuthenticated ? (user?.isAdmin ? '/admin' : '/orders') : '/login'}
        className={`bottom-nav-item ${isActive('/admin') || isActive('/login') ? 'active' : ''}`}
      >
        <span className="bottom-nav-icon">👤</span>
        {user?.isAdmin ? 'Admin' : 'Account'}
      </Link>
    </nav>
  );
};

const styles = `
  .bottom-nav {
    display: none;
  }

  @media (max-width: 768px) {
    .bottom-nav {
      display: flex;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 100;
      background: var(--white);
      border-top: 1px solid #e0e0e0;
      box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
      justify-content: space-around;
      padding: 0.4rem 0 calc(0.4rem + env(safe-area-inset-bottom));
    }

    .bottom-nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.15rem;
      font-size: 0.7rem;
      color: var(--secondary);
      text-decoration: none;
      padding: 0.25rem 0.75rem;
    }

    .bottom-nav-item.active {
      color: var(--primary);
      font-weight: 600;
    }

    .bottom-nav-icon {
      position: relative;
      font-size: 1.2rem;
      line-height: 1;
    }

    .bottom-nav-badge {
      position: absolute;
      top: -6px;
      right: -10px;
      background: var(--danger);
      color: var(--white);
      font-size: 0.6rem;
      font-weight: 700;
      min-width: 16px;
      height: 16px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 3px;
    }

    /* Keep content clear of the fixed nav */
    .main-content {
      padding-bottom: 5rem;
    }
    .footer {
      margin-bottom: 3.5rem;
    }
  }
`;

const style = document.createElement('style');
style.innerHTML = styles;
document.head.appendChild(style);
