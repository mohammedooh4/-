
"use client";

import type { Product } from '@/types/product';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { getProductById_client } from '@/lib/supabase';

// Storing only essential info in localStorage
interface StoredCartItem {
  id: number;
  quantity: number;
}

export interface CartItem extends Product {
  quantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  totalPrice: number;
  totalItems: number;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [storedItems, setStoredItems] = useState<StoredCartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Load stored IDs from localStorage on initial load
  useEffect(() => {
    try {
      const storedCart = localStorage.getItem('cart');
      if (storedCart) {
        setStoredItems(JSON.parse(storedCart));
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Failed to parse cart from localStorage", error);
      setIsLoading(false);
    }
  }, []);
  
  // 2. Fetch product details based on stored IDs
  useEffect(() => {
    const fetchCartDetails = async () => {
      if (storedItems.length === 0) {
        setCartItems([]);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      const detailedItems: CartItem[] = [];
      for (const item of storedItems) {
        // Ensure the ID is a number before fetching
        const productId = typeof item.id === 'string' ? parseInt(item.id, 10) : item.id;
        if (isNaN(productId)) continue;

        const product = await getProductById_client(productId);
        if (product) {
          detailedItems.push({ ...product, quantity: item.quantity });
        }
      }
      setCartItems(detailedItems);
      setIsLoading(false);
    };

    fetchCartDetails();
  }, [storedItems]);


  // 3. Update localStorage whenever storedItems change
  useEffect(() => {
    try {
        const storableCart = cartItems.map(item => ({ id: item.id, quantity: item.quantity }));
        localStorage.setItem('cart', JSON.stringify(storableCart));
    } catch (error) {
        console.error("Could not save cart to localStorage", error);
    }
  }, [cartItems]);

  const addToCart = (product: Product) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevItems, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalPrice = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart, totalPrice, totalItems, isLoading }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
