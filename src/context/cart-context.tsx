
"use client";

import type { Product } from '@/types/product';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { getProductById_client } from '@/lib/supabase';

// Storing only essential info in localStorage
interface StoredCartItem {
  id: string; // Changed to string to support combined id format
  quantity: number;
}

export interface CartItem extends Product {
  quantity: number;
  selectedOption?: string; // Add optional selected option
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, selectedOption?: string) => void;
  removeFromCart: (cartItemId: string | number) => void;
  updateQuantity: (cartItemId: string | number, quantity: number) => void;
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
        // Ensure the ID is a string for fetching
        const combinedId = String(item.id);
        const [productId, selectedOption] = combinedId.split('_option_');

        const product = await getProductById_client(productId);
        if (product) {
          detailedItems.push({
            ...product,
            quantity: item.quantity,
            selectedOption: selectedOption || undefined
          });
        }
      }
      setCartItems(detailedItems);
      setIsLoading(false);
    };

    fetchCartDetails();
  }, [storedItems]);


  // Helper to generate a unique cart item ID based on product ID and selected option
  const getCartItemId = (productId: string | number, selectedOption?: string) => {
    return selectedOption ? `${productId}_option_${selectedOption}` : String(productId);
  };

  // 3. Update localStorage whenever storedItems change
  useEffect(() => {
    try {
      const storableCart = cartItems.map(item => ({
        id: getCartItemId(item.id, item.selectedOption),
        quantity: item.quantity
      }));
      localStorage.setItem('cart', JSON.stringify(storableCart));
    } catch (error) {
      console.error("Could not save cart to localStorage", error);
    }
  }, [cartItems]);

  const addToCart = (product: Product, selectedOption?: string) => {
    setCartItems(prevItems => {
      const cartItemId = getCartItemId(product.id, selectedOption);
      const existingItem = prevItems.find(item => getCartItemId(item.id, item.selectedOption) === cartItemId);

      if (existingItem) {
        return prevItems.map(item =>
          getCartItemId(item.id, item.selectedOption) === cartItemId
            ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevItems, { ...product, quantity: 1, selectedOption }];
    });
  };

  const removeFromCart = (cartItemId: string | number) => {
    setCartItems(prevItems => prevItems.filter(item => getCartItemId(item.id, item.selectedOption) !== String(cartItemId)));
  };

  const updateQuantity = (cartItemId: string | number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
    } else {
      setCartItems(prevItems =>
        prevItems.map(item =>
          getCartItemId(item.id, item.selectedOption) === String(cartItemId) ? { ...item, quantity } : item
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
