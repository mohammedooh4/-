"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getCategories_client, getProductsByCategory_client } from '@/lib/supabase';
import { ProductView } from '@/components/product-view';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import type { Product } from '@/types/product';
import type { Category } from '@/types/category';
import { Suspense } from 'react';

function CategoryContent() {
    const searchParams = useSearchParams();
    const categoryId = searchParams.get('id');

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryName, setCategoryName] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!categoryId) {
            setNotFound(true);
            setLoading(false);
            return;
        }

        async function fetchData() {
            setLoading(true);
            setNotFound(false);

            const [cats, prods] = await Promise.all([
                getCategories_client(),
                getProductsByCategory_client(categoryId!, 1, 20),
            ]);

            const currentCategory = cats.find(c => c.id === categoryId);

            if (!currentCategory) {
                setNotFound(true);
                setLoading(false);
                return;
            }

            setCategories(cats);
            setProducts(prods);
            setCategoryName(currentCategory.name);
            setLoading(false);
        }

        fetchData();
    }, [categoryId]);

    if (loading) {
        return (
            <main className="container mx-auto px-4 py-8 md:py-12 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </main>
        );
    }

    if (notFound) {
        return (
            <main className="container mx-auto px-4 py-8 md:py-12 text-center">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-destructive">الفئة غير موجودة</h1>
                <p className="mt-4 text-lg text-muted-foreground">لم نتمكن من العثور على الفئة المطلوبة.</p>
                <Button asChild className="mt-6">
                    <Link href="/">العودة إلى الرئيسية</Link>
                </Button>
            </main>
        );
    }

    return (
        <ProductView
            initialProducts={products}
            initialCategories={categories}
            activeCategoryId={categoryId}
            categoryName={categoryName}
        />
    );
}

export default function CategoryPage() {
    return (
        <Suspense fallback={
            <main className="container mx-auto px-4 py-8 md:py-12 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </main>
        }>
            <CategoryContent />
        </Suspense>
    );
}
