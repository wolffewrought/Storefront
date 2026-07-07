import { useState, useEffect, useCallback } from 'react';
import { auth as authApi } from '../services/api';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
  }, []);

  const signup = useCallback(async (email, username, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApi.signup(email, username, password);
      setUser({
        userId: response.data.userId,
        email: response.data.email,
        username: response.data.username,
      });
      setToken(response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
      localStorage.setItem('token', response.data.token);
      return response.data;
    } catch (err) {
      const errorMsg = err.error || 'Signup failed';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (emailOrUsername, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApi.login(emailOrUsername, password);
      setUser({
        userId: response.data.userId,
        email: response.data.email,
        username: response.data.username,
        isAdmin: response.data.isAdmin,
      });
      setToken(response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
      localStorage.setItem('token', response.data.token);
      return response.data;
    } catch (err) {
      const errorMsg = err.error || 'Login failed';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }, []);

  const forgotPassword = useCallback(async (email) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApi.forgotPassword(email);
      return response;
    } catch (err) {
      const errorMsg = err.error || 'Request failed';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (token, newPassword) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApi.resetPassword(token, newPassword);
      return response;
    } catch (err) {
      const errorMsg = err.error || 'Reset failed';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const isAuthenticated = !!user && !!token;

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    signup,
    login,
    logout,
    forgotPassword,
    resetPassword,
  };
};
