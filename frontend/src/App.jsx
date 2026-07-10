import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuthContext } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Header } from './components/Header';

// Pages
import { StorefrontPage } from './pages/StorefrontPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { OrderHistoryPage } from './pages/OrderHistoryPage';
import { AdminPanel } from './pages/AdminPanel';
import { BottomNav } from './components/BottomNav';
import { PrivacyPage, TermsPage, RefundsPage, ContactPage } from './pages/PolicyPages';

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthContext();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Admin Route — requires login AND admin flag
const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthContext();
  if (!isAuthenticated) return <Navigate to="/login" />;
  return user?.isAdmin ? children : <Navigate to="/" />;
};

const AppContent = () => {
  return (
    <Router>
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<StorefrontPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <OrderHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:ticketId"
            element={
              <ProtectedRoute>
                <OrderDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            }
          />

          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/refunds" element={<RefundsPage />} />
          <Route path="/contact" element={<ContactPage />} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <Footer />
      <BottomNav />
    </Router>
  );
};

const Footer = () => (
  <footer className="footer">
    <div className="container">
      <p>&copy; 2026 Wolffewrought. All rights reserved.</p>
      <p className="footer-links">
        <Link to="/terms">Terms</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/refunds">Refunds</Link>
        <Link to="/contact">Contact</Link>
      </p>
    </div>
  </footer>
);

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
      <AppContent />
      </CartProvider>
    </AuthProvider>
  );
}

const footerStyles = `
  .footer {
    background: var(--dark);
    color: var(--white);
    text-align: center;
    padding: 2rem 0;
    margin-top: 4rem;
  }

  .footer a {
    color: var(--white);
  }

  .footer-links {
    margin-top: 0.75rem;
    display: flex;
    gap: 1.25rem;
    justify-content: center;
    flex-wrap: wrap;
    font-size: 0.9rem;
  }

  @media (max-width: 768px) {
    /* Extend the footer's own dark padding beneath the fixed bottom
       nav so its text always sits fully visible above it */
    .footer {
      padding-bottom: 6rem;
    }
  }
`;

const style = document.createElement('style');
style.innerHTML = footerStyles;
document.head.appendChild(style);
