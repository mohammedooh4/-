"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabaseClient } from '@/lib/supabase';
import { useAuth } from './auth-context';
import { Product } from '@/types/product';
import { getProductsByIds_client } from '@/lib/supabase';

interface FavoritesContextType {
    favoriteIds: string[];
    favoriteProducts: Product[];
    toggleFavorite: (productId: string) => Promise<void>;
    isFavorite: (productId: string) => boolean;
    isLoading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
    const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch favorite IDs
    useEffect(() => {
        async function fetchFavorites() {
            if (!user || !supabaseClient) {
                setFavoriteIds([]);
                setFavoriteProducts([]);
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            const { data, error } = await supabaseClient
                .from('favorites')
                .select('product_id')
                .eq('user_id', user.id);

            if (!error && data) {
                setFavoriteIds(data.map(f => f.product_id));
            } else if (error) {
                console.error("Error fetching favorites from Supabase:", error);
            }
            setIsLoading(false);
        }
        fetchFavorites();
    }, [user]);

    // Fetch product details for the favored IDs (batch fetch for performance)
    useEffect(() => {
        async function fetchFavoriteProducts() {
            if (favoriteIds.length === 0) {
                setFavoriteProducts([]);
                return;
            }
            // Batch fetch all favorite products in a single query
            const products = await getProductsByIds_client(favoriteIds);
            setFavoriteProducts(products);
        }
        fetchFavoriteProducts();
    }, [favoriteIds]);

    const toggleFavorite = async (productId: string) => {
        if (!user || !supabaseClient) {
            // Handle guest user attempting to favorite (could show toast)
            return;
        }

        const isFav = favoriteIds.includes(productId);

        // Optimistic UI update
        if (isFav) {
            setFavoriteIds(prev => prev.filter(id => id !== productId));
            const { error } = await supabaseClient
                .from('favorites')
                .delete()
                .eq('user_id', user.id)
                .eq('product_id', productId);

            if (error) {
                console.error("Error removing favorite:", error);
                // Revert optimistic update
                setFavoriteIds(prev => [...prev, productId]);
            }
        } else {
            setFavoriteIds(prev => [...prev, productId]);
            const { error } = await supabaseClient
                .from('favorites')
                .insert({ user_id: user.id, product_id: productId });

            if (error) {
                console.error("Error adding favorite:", error);
                // Revert optimistic update
                setFavoriteIds(prev => prev.filter(id => id !== productId));
            }
        }
    };

    const isFavorite = (productId: string) => favoriteIds.includes(productId);

    return (
        <FavoritesContext.Provider value={{ favoriteIds, favoriteProducts, toggleFavorite, isFavorite, isLoading }}>
            {children}
        </FavoritesContext.Provider>
    );
}

export function useFavorites() {
    const context = useContext(FavoritesContext);
    if (context === undefined) {
        throw new Error('useFavorites must be used within a FavoritesProvider');
    }
    return context;
}
