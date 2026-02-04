
"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/types/product';
import type { Category } from '@/types/category';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ProductGrid } from '@/components/product-grid';
import { RefreshCw, Loader2, Search, Menu } from 'lucide-react';
import { getProducts_client, searchProducts } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
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


    // Cache Key based on category (or 'home')
    const cacheKey = `${STORAGE_KEY_PREFIX}${activeCategoryId || 'home'}`;
    const cacheTsKey = `${cacheKey}_ts`;

    // State for products and pagination
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
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
                        console.log("Restoring from cache:", cacheKey, parsed.length);
                        setProducts(parsed);
                        // Approximate page
                        setPage(Math.ceil(parsed.length / 20));
                        // If we restored from cache, we might have more data than initial, so we should trust the cache
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
        <main className="container mx-auto px-4 py-8 md:py-12">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    {/* Mobile: Sheet for Categories */}
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0 sm:hidden">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Categories</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="sm:hidden">
                            <SheetHeader>
                                <SheetTitle>الفئات</SheetTitle>
                            </SheetHeader>
                            <div className="grid gap-2 py-4">
                                <SheetClose asChild>
                                    <Button variant="ghost" className="justify-start" onClick={() => router.push('/')}>كل المنتجات</Button>
                                </SheetClose>
                                {initialCategories.map((category) => (
                                    <SheetClose asChild key={category.id}>
                                        <Button
                                            variant="ghost"
                                            className="justify-start gap-2"
                                            onClick={() => router.push(`/category/${category.id}`)}
                                        >
                                            <span dangerouslySetInnerHTML={{ __html: category.icon || '' }} className="[&_svg]:w-4 [&_svg]:h-4" />
                                            {category.name}
                                        </Button>
                                    </SheetClose>
                                ))}
                            </div>
                        </SheetContent>
                    </Sheet>

                    {/* Desktop: Dropdown menu */}
                    <div className="hidden sm:block">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="shrink-0">
                                    <Menu className="h-5 w-5" />
                                    <span className="sr-only">Categories</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56">
                                <DropdownMenuItem
                                    onSelect={() => router.push('/')}
                                    className="cursor-pointer"
                                >
                                    كل المنتجات
                                </DropdownMenuItem>
                                {initialCategories.map(category => (
                                    <DropdownMenuItem
                                        key={category.id}
                                        onSelect={() => router.push(`/category/${category.id}`)}
                                        className="w-full cursor-pointer flex items-center gap-2"
                                    >
                                        <span dangerouslySetInnerHTML={{ __html: category.icon || '' }} className="[&_svg]:w-4 [&_svg]:h-4" />
                                        {category.name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold tracking-tight text-nowrap">
                        {categoryName || 'اسواق سجاد'}
                    </h1>
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="ابحث عن المنتج"
                        className="pr-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="hidden md:inline-flex"
                >
                    <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {isSearching ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <ProductGrid products={products} />
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
    );
}
