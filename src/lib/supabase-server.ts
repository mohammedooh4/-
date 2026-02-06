
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Product } from '@/types/product';
import type { OrderWithItems } from '@/types/order';
import type { Category } from '@/types/category';
import { FALLBACK_PRODUCTS, FALLBACK_CATEGORIES, isSupabaseConfigured } from './fallback-data';


// This is a service role client that can be used for server-side data fetching
// where row-level security is not required, allowing for static page generation.
// It does not depend on the request's cookies.
const supabaseService = isSupabaseConfigured() ? createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
) : null;


function mapToProduct(data: any): Product {
  let imageUrl = data.image || data.image_url || 'https://placehold.co/600x400.png';

  if (supabaseService && (data.image || data.image_url) && !imageUrl.startsWith('http')) {
    const { data: publicUrlData } = supabaseService.storage.from('products').getPublicUrl(imageUrl);
    imageUrl = publicUrlData.publicUrl;
  }

  return {
    id: String(data.id),
    name: data.name || '',
    price: data.price || 0,
    description: data.description || '',
    image: imageUrl,
    image_alt: data.image_alt || data.name || 'Product image',
    ai_hint: data.ai_hint || '',
    category_id: data.category_id || null,
    stock: data.stock || 0,
    is_available: data.is_available ?? true
  };
}

// SERVER-SIDE FUNCTION for static pages
export async function getProducts_server(): Promise<Product[]> {
  if (!supabaseService) {
    console.warn("Supabase not configured, using fallback products");
    return FALLBACK_PRODUCTS;
  }

  const { data, error } = await supabaseService
    .from('products')
    .select('id, name, price, image, stock, category_id, is_available')
    .order('created_at', { ascending: false })
    .range(0, 19);
  if (error) {
    console.error("Error fetching products from server:", JSON.stringify(error, null, 2));
    return FALLBACK_PRODUCTS;
  }
  return (data || []).map(mapToProduct);
}

// SERVER-SIDE FUNCTION for static pages
export async function getCategories_server(): Promise<Category[]> {
  if (!supabaseService) {
    console.warn("Supabase not configured, using fallback categories");
    return FALLBACK_CATEGORIES;
  }

  const { data, error } = await supabaseService.from('categories').select('id, name');
  if (error) {
    console.error("Error fetching categories from server:", JSON.stringify(error, null, 2));
    return FALLBACK_CATEGORIES;
  }
  return data || [];
}

// SERVER-SIDE FUNCTION: fetch single category by id
export async function getCategoryById_server(categoryId: string): Promise<Category | null> {
  // Guard against invalid ids
  if (!categoryId || categoryId === 'undefined') {
    console.error(`Invalid categoryId provided to getCategoryById_server: ${categoryId}`);
    return null;
  }

  // If service role is not available, try to match from fallback
  if (!supabaseService) {
    const fallbackMatch = FALLBACK_CATEGORIES.find(c => c.id === categoryId) || null;
    return fallbackMatch || null;
  }

  const { data, error } = await supabaseService
    .from('categories')
    .select('id, name, icon')
    .eq('id', categoryId)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching category ${categoryId} from server:`, JSON.stringify(error, null, 2));
    return null;
  }
  return data || null;
}

// SERVER-SIDE FUNCTION for static pages
export async function getProductsByCategory_server(categoryId: string): Promise<Product[]> {
  // Guard against invalid ids that can cause Postgres 22P02 (invalid uuid syntax)
  if (!categoryId || categoryId === 'undefined') {
    console.error(`Invalid categoryId provided: ${categoryId}`);
    return [];
  }

  if (!supabaseService) {
    console.warn("Supabase not configured, using fallback products for category");
    return FALLBACK_PRODUCTS.filter(p => p.category_id === categoryId);
  }

  const { data, error } = await supabaseService
    .from('products')
    .select('id, name, price, image, stock, category_id, is_available')
    .eq('category_id', categoryId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`Error fetching products for category ${categoryId} from server:`, JSON.stringify(error, null, 2));
    return [];
  }
  return (data || []).map(mapToProduct);
}

// SERVER-SIDE FUNCTION for static pages
export async function getProductById_server(id: string): Promise<Product | undefined> {
  if (!supabaseService) {
    console.warn("Supabase not configured, using fallback product");
    return FALLBACK_PRODUCTS.find(p => p.id === id);
  }

  try {
    const { data, error } = await supabaseService
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      // Check for specific "Row not found" error code (PGRST116)
      if (error.code === 'PGRST116') {
        return undefined;
      }

      console.error(`Error fetching product ${id} from Supabase:`, error);
      return FALLBACK_PRODUCTS.find(p => p.id === id);
    }

    if (data) {
      return mapToProduct(data);
    }

    return undefined;

  } catch (e) {
    console.error(`Exception fetching product by id ${id}: `, e);
    return FALLBACK_PRODUCTS.find(p => p.id === id);
  }
}

// This function needs an authenticated client, so we will create one here.
// This function requires dynamic rendering because it uses cookies.
export async function getOrdersByUserId(userId: string): Promise<OrderWithItems[]> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
            *,
            order_items (
                *,
                products (
                    *
                )
            )
        `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching orders for user:', userId, error);
    return [];
  }

  return (orders as any[]).map(order => ({
    id: order.id,
    created_at: order.created_at,
    total_amount: order.total_amount,
    status: order.status,
    items: order.order_items.map((item: any) => ({
      quantity: item.quantity,
      unit_price: item.unit_price,
      product: mapToProduct(item.products)
    }))
  }));
}
