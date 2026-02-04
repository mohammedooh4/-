
import { getProducts_server, getCategories_server } from '@/lib/supabase-server';
import { ProductView } from '@/components/product-view';



export default async function Home() {
  const [products, categories] = await Promise.all([getProducts_server(), getCategories_server()]);

  return (
    <ProductView
      initialProducts={products}
      initialCategories={categories}
      activeCategoryId={null}
    />
  );
}
