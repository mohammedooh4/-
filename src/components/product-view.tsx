
"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/types/product';
import type { Category } from '@/types/category';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ProductGrid } from '@/components/product-grid';
import { RefreshCw, Loader2, Search, Menu, Store } from 'lucide-react';
import { LoadingOverlay } from '@/components/loading-overlay';
import { getProducts_client, searchProducts } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/auth-context';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";

interface ProductViewProps {
    initialProducts: Product[];
    initialCategories: Category[];
    activeCategoryId: string | null;
    categoryName?: string;
}

const STORAGE_KEY_PREFIX = 'products_cache_';
const CACHE_DURATION = 15 * 1000; // 15 seconds - shorter for faster updates

export function ProductView({ initialProducts, initialCategories, activeCategoryId, categoryName }: ProductViewProps) {
    const [isRefreshing, startTransition] = useTransition();
    const router = useRouter();
    const { user } = useAuth();
    const displayName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'عزيزي';


    // Cache Key based on category (or 'home')
    const cacheKey = `${STORAGE_KEY_PREFIX}${activeCategoryId || 'home'}`;
    const cacheTsKey = `${cacheKey}_ts`;

    // State for products and pagination
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isNavigating, setIsNavigating] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const observerTarget = useRef<HTMLDivElement>(null);
    const hasRestoredCache = useRef(false);

    // Initial Cache Check — only on mount
    useEffect(() => {
        if (hasRestoredCache.current) return;
        hasRestoredCache.current = true;

        const cachedData = sessionStorage.getItem(cacheKey);
        const cachedTs = sessionStorage.getItem(cacheTsKey);

        if (cachedData && cachedTs) {
            const age = Date.now() - parseInt(cachedTs, 10);
            if (age < CACHE_DURATION) {
                try {
                    const parsed = JSON.parse(cachedData);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        // Filter out unavailable products from cache
                        const availableProducts = parsed.filter((p: any) => p.is_available !== false);
                        console.log("Restoring from cache:", cacheKey, availableProducts.length);
                        setProducts(availableProducts);
                        // Approximate page
                        setPage(Math.ceil(availableProducts.length / 20));
                    }
                } catch (e) {
                    console.error("Cache parse error", e);
                }
            }
        }
    }, [cacheKey, cacheTsKey]);

    // Update Cache on products change
    useEffect(() => {
        // Do not cache search results
        if (!searchQuery && products.length > 0) {
            try {
                // Limit cache to 50 items and strip large fields to avoid quota issues
                const productsToCache = products.slice(0, 50).map(p => ({
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    // Only cache URL-based images, not base64
                    image: p.image?.startsWith('data:') ? 'https://placehold.co/600x400.png' : p.image,
                    image_alt: p.image_alt,
                    category_id: p.category_id,
                    stock: p.stock,
                    // Truncate description to save space
                    description: p.description?.substring(0, 100) || '',
                    ai_hint: ''  // Skip ai_hint for cache
                }));
                sessionStorage.setItem(cacheKey, JSON.stringify(productsToCache));
                sessionStorage.setItem(cacheTsKey, Date.now().toString());
            } catch (e) {
                console.warn("Cache saving failed (Quota Exceeded), clearing old cache:", e);
                // Clear this cache key on quota error
                try {
                    sessionStorage.removeItem(cacheKey);
                    sessionStorage.removeItem(cacheTsKey);
                } catch { }
            }
        }
    }, [products, cacheKey, cacheTsKey, searchQuery]);

    // Search Logic
    const latestSearchRef = useRef(searchQuery);
    const initialProductsRef = useRef(initialProducts);
    initialProductsRef.current = initialProducts;

    useEffect(() => {
        latestSearchRef.current = searchQuery;
        let isCancelled = false;

        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.trim()) {
                setIsSearching(true);
                setHasMore(false);
                window.scrollTo(0, 0);
                const results = await searchProducts(searchQuery);

                // Only apply results if this is still the latest search
                if (isCancelled || latestSearchRef.current !== searchQuery) return;

                // Deduplicate results by ID
                const uniqueResults = results.filter((value, index, self) =>
                    index === self.findIndex((t) => t.id === value.id)
                );

                setProducts(uniqueResults);
                setIsSearching(false);
            } else if (searchQuery === '') {
                // Reset to initial state when search clears
                setProducts(initialProductsRef.current);
                setPage(1);
                setHasMore(true);
                setIsSearching(false);
                window.scrollTo(0, 0);
            }
        }, 400);

        return () => {
            isCancelled = true;
            clearTimeout(delayDebounceFn);
        };
    }, [searchQuery]);


    const handleRefresh = useCallback(() => {
        startTransition(() => {
            router.refresh();
            // Clear cache on explicit refresh
            sessionStorage.removeItem(cacheKey);
            sessionStorage.removeItem(cacheTsKey);
            setProducts(initialProducts);
            setPage(1);
            setHasMore(true);
            setSearchQuery('');
        });
    }, [router, cacheKey, cacheTsKey, initialProducts]);

    // Handle category navigation with loading state
    const handleCategoryClick = useCallback((path: string) => {
        setIsNavigating(true);
        // Clear cache when navigating to ensure fresh data
        sessionStorage.removeItem(cacheKey);
        sessionStorage.removeItem(cacheTsKey);
        router.push(path);
    }, [router, cacheKey, cacheTsKey]);

    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore || searchQuery) return;

        setLoadingMore(true);
        const nextPage = page + 1;

        try {
            // For categories, we might need a different fetch function or pass categoryId to getProducts_client
            // Currently getProducts_client fetches *all* products. 
            // FIXME: We need getProductsByCategory_client if activeCategoryId is set.
            // For now, let's assume getProducts_client handles generic pagination, but strictly speaking 
            // we need to filter by category if active.
            // The user request said: "Category Page Strategy... Lazy Load... Query: .eq('category_id', CATEGORY_ID)"
            // Fetch next page, passing optional categoryId if active
            const newProducts = await getProducts_client(nextPage, 20, activeCategoryId);

            if (newProducts.length === 0) {
                setHasMore(false);
            } else {
                setProducts(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const uniqueNew = newProducts.filter(p => !existingIds.has(p.id));
                    return [...prev, ...uniqueNew];
                });
                setPage(nextPage);
            }
        } catch (error) {
            console.error("Error loading more products:", error);
        } finally {
            setLoadingMore(false);
        }
    }, [page, loadingMore, hasMore, searchQuery, activeCategoryId]);

    // Intersection Observer for Infinite Scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && !loadingMore && hasMore && !searchQuery) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [loadMore, loadingMore, hasMore, searchQuery]);


    return (
        <>
            {isNavigating && <LoadingOverlay message="جاري تحميل..." />}
            {/* Fixed Header */}
            <div
                className="fixed top-0 left-0 right-0 z-40 bg-background"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)' }}
            >
                {/* Top bar: Greeting + Store icon */}
                <div className="container mx-auto px-4 pt-4 pb-2 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary text-primary-foreground rounded-xl shadow-md flex items-center justify-center">
                            <Store className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground leading-none">مرحباً,</p>
                            <h1 className="text-lg font-bold text-foreground leading-tight">{displayName}</h1>
                        </div>
                    </div>
                </div>

                {/* Search bar */}
                <div className="container mx-auto px-4 pb-3">
                    <div className="relative w-full">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="ابحث عن منتج..."
                            className="pr-10 h-11 rounded-xl bg-muted/50 border border-border/60 text-sm placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Spacer to push content below the fixed header */}
            <div className="h-[120px]" />

            <main className="container mx-auto px-4 py-4 pb-24">

                {/* Product Grid */}
                {isSearching ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <ProductGrid products={products} categories={initialCategories} searchQuery={searchQuery} />
                )}

                {/* Infinite Scroll Trigger */}
                {!searchQuery && hasMore && (
                    <div ref={observerTarget} className="flex justify-center py-8">
                        {loadingMore ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <div className="h-4" />}
                    </div>
                )}
                {!searchQuery && !hasMore && products.length > 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                        وصلت لنهاية المنتجات
                    </div>
                )}
                {products.length === 0 && !isSearching && (
                    <div className="text-center py-12 text-muted-foreground">
                        لا توجد منتجات
                    </div>
                )}
            </main>
        </>
    );
}
