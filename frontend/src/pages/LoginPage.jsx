import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loading, error, isAuthenticated } = useAuthContext();
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: '',
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.emailOrUsername || !formData.password) {
      setFormError('Please fill in all fields');
      return;
    }

    try {
      await login(formData.emailOrUsername, formData.password);
      navigate('/');
    } catch (err) {
      setFormError(err.error || 'Login failed');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h1>Login</h1>

          {(error || formError) && (
            <div className="alert alert-danger">{error || formError}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email or Username</label>
              <input
                type="text"
                value={formData.emailOrUsername}
                onChange={(e) =>
                  setFormData({ ...formData, emailOrUsername: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="auth-links mt-3 text-center">
            <p>Don't have an account? <Link to="/signup">Sign up</Link></p>
            <p><Link to="/forgot-password">Forgot password?</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = `
  .auth-page {
    min-height: calc(100vh - 200px);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--light);
  }

  .auth-container {
    width: 100%;
    max-width: 400px;
    padding: 0 1rem;
  }

  .auth-card {
    background: var(--white);
    border-radius: var(--border-radius);
    padding: 2rem;
    box-shadow: var(--shadow-lg);
  }

  .auth-card h1 {
    text-align: center;
    margin-bottom: 2rem;
  }

  .auth-links p {
    margin: 0.5rem 0;
    font-size: 0.9rem;
  }

  .auth-links a {
    color: var(--primary);
  }
`;

const style = document.createElement('style');
style.innerHTML = styles;
document.head.appendChild(style);
