// Cart state now lives in a shared context so every component
// (product pages, cart page, nav badges) sees the same cart instantly.
// This file keeps the old import path working.
export { useCartContext as useCart } from '../context/CartContext';
