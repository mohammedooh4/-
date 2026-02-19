
import { getCategories_server, getProductsByCategory_server, getCategoryById_server } from '@/lib/supabase-server';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ProductView } from '@/components/product-view';
import type { Category } from '@/types/category';
import { CategoryClientPage } from './category-client-page';

export const dynamicParams = false;

export async function generateStaticParams() {
  const categories = await getCategories_server();

  if (!categories || categories.length === 0) {
    return [];
  }

  return categories.map((category) => ({
    id: category.id.toString(),
  }));
}

export default async function CategoryPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const categoryId = params?.id;

  if (!categoryId || categoryId === 'undefined') {
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

  // Use client component that fetches fresh data at runtime
  return <CategoryClientPage categoryId={categoryId} />;
}
