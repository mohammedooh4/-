
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

    // Initial Cache Check
    useEffect(() => {
        // Skip cache check if searching
        if (searchQuery) return;

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
    }, [cacheKey, cacheTsKey, searchQuery]);

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
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.trim()) {
                setIsSearching(true);
                setHasMore(false); // Disable infinite scroll during search
                const results = await searchProducts(searchQuery);
                setProducts(results);
                setIsSearching(false);
            } else if (searchQuery === '' && !isSearching) {
                // Reset to initial/cached state when search clears
                // Ideally we'd restore from cache or props. For now, reset to props or reload window to be safe/clean?
                // Or just reset to initialProducts and let Cache effect restore if valid
                setProducts(initialProducts);
                setPage(1);
                setHasMore(true);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, initialProducts]);


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
            <main className="container mx-auto px-4 py-8 md:py-12 pb-24">
                {/* Header Section */}
                <div className="flex flex-col gap-6 mb-8">
                    {/* Top Row: Greeting */}
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                            <span className="text-muted-foreground text-sm">مرحباً,</span>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">
                                {displayName}
                            </h1>
                        </div>
                        <div className="flex-shrink-0 w-14 h-14 bg-primary text-primary-foreground rounded-2xl shadow-lg ring-4 ring-primary/10 flex items-center justify-center">
                            <Store className="h-8 w-8" />
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="ماذا تريد أن تطلب اليوم؟"
                            className="pr-12 h-14 rounded-2xl bg-white dark:bg-zinc-900 border-none shadow-sm text-base"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Categories Section */}

                </div>

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
