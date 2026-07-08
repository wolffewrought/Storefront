import React, { createContext, useContext, useState, useCallback } from 'react';

const CART_STORAGE_KEY = 'storefront_cart';

const CartContext = createContext(null);

const loadCart = () => {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveCart = (items) => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage unavailable — cart still works in-memory for the session
  }
};

export const CartProvider = ({ children }) => {
  // Initialize synchronously from storage; persist synchronously on every change
  const [items, setItemsRaw] = useState(loadCart);

  const setItems = useCallback((updater) => {
    setItemsRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveCart(next);
      return next;
    });
  }, []);

  const addItem = useCallback((product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity,
        },
      ];
    });
  }, [setItems]);

  const removeItem = useCallback((productId) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  }, [setItems]);

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
    );
  }, [setItems, removeItem]);

  const clear = useCallback(() => {
    setItems([]);
  }, [setItems]);

  const formatForOrder = useCallback(() =>
    items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    })), [items]);

  const total = items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  const value = {
    items,
    loading: false,
    total,
    count,
    addItem,
    removeItem,
    updateQuantity,
    clear,
    formatForOrder,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCartContext = () => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCartContext must be used within CartProvider');
  }
  return ctx;
};
