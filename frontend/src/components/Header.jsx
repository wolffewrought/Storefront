import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { useCart } from '../hooks/useCart';

export const Header = () => {
  const { user, logout } = useAuthContext();
  const { count } = useCart();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setShowMenu(false);
  };

  return (
    <header className="header">
      <div className="container">
        <div className="flex flex-between" style={{ padding: '1rem 0' }}>
          <Link to="/" className="logo">
            3D Storefront
          </Link>

          <nav className="nav-links">
            <Link to="/">Shop</Link>
            <Link to="/cart" className="cart-link">
              Cart {count > 0 && <span className="cart-badge">{count}</span>}
            </Link>

            {user ? (
              <div className="user-menu">
                <button
                  className="user-btn"
                  onClick={() => setShowMenu(!showMenu)}
                >
                  {user.username}
                </button>

                {showMenu && (
                  <div className="dropdown-menu">
                    <Link to="/profile">Profile</Link>
                    <Link to="/orders">My Orders</Link>
                    {user.isAdmin && (
                      <Link to="/admin">Admin Panel</Link>
                    )}
                    <button onClick={handleLogout} className="logout-btn">
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="auth-links">
                <Link to="/login">Login</Link>
                <Link to="/signup" className="btn btn-primary btn-small">
                  Sign Up
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

const headerStyles = `
  .header {
    background: var(--white);
    border-bottom: 1px solid #e0e0e0;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: var(--shadow);
  }

  .logo {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary);
    white-space: nowrap;
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  .nav-links a {
    color: var(--dark);
    transition: color 0.2s;
  }

  .nav-links a:hover {
    color: var(--primary);
  }

  .cart-link {
    position: relative;
  }

  .cart-badge {
    position: absolute;
    top: -8px;
    right: -12px;
    background: var(--danger);
    color: var(--white);
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .user-menu {
    position: relative;
  }

  .user-btn {
    background: none;
    border: none;
    color: var(--dark);
    cursor: pointer;
    padding: 0;
    font-size: 1rem;
  }

  .user-btn:hover {
    color: var(--primary);
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    right: 0;
    background: var(--white);
    border: 1px solid #e0e0e0;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-lg);
    min-width: 150px;
    z-index: 10;
    margin-top: 0.5rem;
  }

  .dropdown-menu a,
  .logout-btn {
    display: block;
    width: 100%;
    padding: 0.75rem 1rem;
    text-align: left;
    color: var(--dark);
    background: none;
    border: none;
    cursor: pointer;
    transition: background 0.2s;
    border: none;
  }

  .dropdown-menu a:hover,
  .logout-btn:hover {
    background: var(--light);
    color: var(--primary);
  }

  .auth-links {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  @media (max-width: 768px) {
    .nav-links {
      gap: 1rem;
      font-size: 0.9rem;
    }

    .dropdown-menu {
      right: -50px;
    }
  }
`;

// Add styles
const style = document.createElement('style');
style.innerHTML = headerStyles;
document.head.appendChild(style);
