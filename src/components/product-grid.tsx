
"use client";

import type { Product } from '@/types/product';
import { ProductCard } from '@/components/product-card';

interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <div>
      {products.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg mt-8">
          <h2 className="text-2xl font-semibold text-destructive">
            لا توجد منتجات حاليا
          </h2>
          <p className="text-muted-foreground mt-2">
            يرجى المحاولة مرة أخرى لاحقاً.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
