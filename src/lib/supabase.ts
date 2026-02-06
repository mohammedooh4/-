
import { createClient as createBrowserClient } from '@supabase/supabase-js';
import type { Product } from '@/types/product';
import { FALLBACK_PRODUCTS, isSupabaseConfigured } from './fallback-data';

// --- Client-side Supabase Client (uses anon key) ---
// This is safe to expose in the browser.
const supabaseAnonUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const supabaseClient = isSupabaseConfigured() ? createBrowserClient(supabaseAnonUrl, supabaseAnonKey) : null;


function mapToProduct(data: any): Product {
    let imageUrl = data.image || 'https://placehold.co/600x400.png';

    // If image is a storage path (not a full URL), generate the public URL
    if (supabaseClient && data.image && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
        const { data: publicUrlData } = supabaseClient.storage.from('products').getPublicUrl(imageUrl);
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
        is_available: data.is_available ?? true
    };
}

// CLIENT-SIDE FUNCTION (can also be used on server)
export async function getProductById_client(id: string): Promise<Product | undefined> {
    if (!supabaseClient) {
        console.warn("Supabase not configured, using fallback product");
        return FALLBACK_PRODUCTS.find(p => p.id === id);
    }

    try {
        const { data, error } = await supabaseClient
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
            // Only fallback if it's NOT a "not found" error (e.g. connection error)
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


// CLIENT-SIDE FUNCTION
export async function getProducts_client(page: number = 1, pageSize: number = 20, categoryId?: string | null): Promise<Product[]> {
    if (!supabaseClient) {
        console.warn("Supabase not configured, using fallback products");
        // Simple fallback pagination (Client side filtering for fallback is too complex here, just slice)
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        // Ideally filter fallback by category too, but keeping it simple for now
        let results = FALLBACK_PRODUCTS;
        if (categoryId) {
            results = results.filter(p => p.category_id === categoryId);
        }
        return results.slice(start, end);
    }

    const start = (page - 1) * pageSize; // e.g. (1-1)*20 = 0
    const end = start + pageSize - 1;    // e.g. 0 + 20 - 1 = 19

    try {
        let query = supabaseClient
            .from('products')
            .select('id, name, price, image, is_available')
            .eq('is_available', true) // Filter only available products
            .order('created_at', { ascending: false })
            .range(start, end);

        if (categoryId) {
            query = query.eq('category_id', categoryId);
        }

        const { data, error } = await query;

        if (error) {
            console.error(`Error fetching products page ${page}:`, error);
            // Fallback for errors
            const start = (page - 1) * pageSize;
            const end = start + pageSize;
            return FALLBACK_PRODUCTS.slice(start, end);
        }

        return (data || []).map(mapToProduct);

    } catch (e) {
        console.error(`Exception fetching products page ${page}: `, e);
        return [];
    }
}

// CLIENT-SIDE FUNCTION
export async function searchProducts(query: string): Promise<Product[]> {
    if (!supabaseClient || !query.trim()) return [];

    try {
        let dbQuery = supabaseClient
            .from('products')
            .select('id, name, price, image, is_available')
            .eq('is_available', true) // Filter only available products
            .range(0, 19);

        // Check if query is numeric (potential barcode)
        const isNumeric = /^\d+$/.test(query.trim());

        if (isNumeric) {
            // Assume 'barcode' column exists, fallback to name check if needed or just specific logic
            // User requested eq('barcode', query)
            dbQuery = dbQuery.eq('barcode', query.trim());
        } else {
            dbQuery = dbQuery.ilike('name', `%${query.trim()}%`);
        }

        const { data, error } = await dbQuery.order('created_at', { ascending: false });

        if (error) {
            console.error("Error searching products:", error);
            return [];
        }

        return (data || []).map(mapToProduct);
    } catch (e) {
        console.error("Exception searching products:", e);
        return [];
    }
}

// CLIENT-SIDE FUNCTION
export async function getLatestOrderStatusByUserId(userId: string): Promise<string | null> {
    if (!supabaseClient) {
        console.warn("Supabase not configured, returning null for order status");
        return null;
    }

    const { data, error } = await supabaseClient
        .from('orders')
        .select('status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error || !data) {
        // console.error('Error fetching latest order status:', error);
        return null;
    }

    return data.status;
}
