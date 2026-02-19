"use client";

import { useEffect, useState } from 'react';
import { getCategories_client, getProducts_client } from '@/lib/supabase';
import { ProductView } from '@/components/product-view';
import { Loader2 } from 'lucide-react';
import type { Product } from '@/types/product';
import type { Category } from '@/types/category';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [prods, cats] = await Promise.all([
        getProducts_client(1, 20),
        getCategories_client(),
      ]);
      setProducts(prods);
      setCategories(cats);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8 md:py-12 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <ProductView
      initialProducts={products}
      initialCategories={categories}
      activeCategoryId={null}
    />
  );
}
