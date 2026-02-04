
import { getCategories_server, getProductsByCategory_server, getCategoryById_server } from '@/lib/supabase-server';
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

export default async function CategoryPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const categoryId = params?.id;

  // Early guard: if id is missing or invalid, render not-found UI without server calls
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

  // Fetch categories first to validate the id before hitting products API
  let allCategories = await getCategories_server();
  let selectedCategory = allCategories.find(c => c.id === categoryId);

  if (!selectedCategory) {
    // Try fetching the category directly by id (helps when categories list is partial)
    const directCategory = await getCategoryById_server(categoryId);
    if (!directCategory) {
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
    selectedCategory = directCategory as Category;
    // Ensure the category appears in the list for UI menus
    if (!allCategories.find(c => c.id === selectedCategory!.id)) {
      allCategories = [...allCategories, selectedCategory!];
    }
  }



  // Only fetch products if category id is valid
  const productsInCategory = await getProductsByCategory_server(categoryId);

  return (
    <ProductView
      initialProducts={productsInCategory}
      initialCategories={allCategories}
      activeCategoryId={categoryId}
      categoryName={selectedCategory.name}
    />
  );
}
