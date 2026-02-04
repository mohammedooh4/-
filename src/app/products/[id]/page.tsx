
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductDetailsClient } from './product-details-client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getProductById_server, getProducts_server } from '@/lib/supabase-server';
import type { Product } from '@/types/product';

// This function tells Next.js which product pages to build at build time.
export async function generateStaticParams() {
  const products = await getProducts_server();

  if (!products) {
    return [];
  }

  return products.map((product) => ({
    id: product.id.toString(),
  }));
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const productId = params.id;

  const product = await getProductById_server(productId);
  if (!product) {
    return {
      title: 'لم يتم العثور على المنتج',
    };
  }
  return {
    title: `${product.name} | عرض المنتجات`,
    description: product.description,
  };
}

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const productId = params.id;

  const product = await getProductById_server(productId);

  if (!product) {
    notFound();
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="mb-8">
          <Button variant="ghost" asChild>
            <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              <ArrowRight className="ml-2 h-4 w-4" />
              العودة إلى المنتجات
            </Link>
          </Button>
        </div>
        <ProductDetailsClient product={product} />
      </div>
    </div>
  );
}
