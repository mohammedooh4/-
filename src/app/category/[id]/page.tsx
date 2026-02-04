
import { getCategories_server, getProductsByCategory_server } from '@/lib/supabase-server';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ProductView } from '@/components/product-view';
import type { Category } from '@/types/category';

export const revalidate = 0;

export async function generateStaticParams() {
  const categories = await getCategories_server();

  if (!categories || categories.length === 0) {
    return [];
  }

  return categories.map((category) => ({
    id: category.id.toString(),
  }));
}

export default async function CategoryPage({ params }: { params: { id: string } }) {
  const categoryId = params.id;

  const [productsInCategory, allCategories] = await Promise.all([
    getProductsByCategory_server(categoryId),
    getCategories_server()
  ]);

  const selectedCategory = allCategories.find(c => c.id === categoryId);

  if (!selectedCategory) {
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
      initialProducts={productsInCategory}
      initialCategories={allCategories}
      activeCategoryId={categoryId}
      categoryName={selectedCategory.name}
    />
  );
}
