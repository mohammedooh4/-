
import { createClient as createBrowserClient } from '@supabase/supabase-js';
import type { Product } from '@/types/product';
import type { Category } from '@/types/category';
import { FALLBACK_PRODUCTS, FALLBACK_CATEGORIES, isSupabaseConfigured } from './fallback-data';

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
        id: String(data.id || ''),
        name: data.name || 'منتج غير معروف',
        price: Number(data.price) || 0,
        description: data.description || '',
        image: imageUrl,
        image_alt: data.image_alt || data.name || 'صورة المنتج',
        ai_hint: data.ai_hint || '',
        category_id: String(data.category_id || ''),
        is_available: Boolean(data.is_available ?? true),
        options: Array.isArray(data.options) && data.options.length > 0 ? data.options : undefined,
        parent_id: data.parent_id ? String(data.parent_id) : null,
        variants: Array.isArray(data.variants) ? data.variants.map((v: any) => mapToProduct(v)) : undefined
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
            .select('*, variants:products!parent_id(*)')
            .eq('id', id)
            .single();

        if (error) {
            // Check for specific "Row not found" error code (PGRST116)
            if (error.code === 'PGRST116') {
                console.warn(`Product ${id} not found in database, checking fallback`);
                return FALLBACK_PRODUCTS.find(p => p.id === id);
            }

            // Suppress error if the error object is empty (often happens with network glitches or weird states)
            if (Object.keys(error).length === 0) {
                console.warn(`Empty error fetching product ${id} from Supabase. Treating as not found.`);
                return FALLBACK_PRODUCTS.find(p => p.id === id);
            }

            console.error(`Error fetching product ${id} from Supabase:`, error);
            // Only fallback if it's NOT a "not found" error (e.g. connection error)
            return FALLBACK_PRODUCTS.find(p => p.id === id);
        }

        if (data) {
            return mapToProduct(data);
        }

        console.warn(`Product ${id} not found, checking fallback`);
        return FALLBACK_PRODUCTS.find(p => p.id === id);

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
            .select('*, variants:products!parent_id(*)') // Get all fields including description and variants
            .is('parent_id', null) // Only fetch parent products for the grid
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
            let results = FALLBACK_PRODUCTS;
            if (categoryId) {
                results = results.filter(p => p.category_id === categoryId);
            }
            return results.slice(start, end);
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
        const trimmedQuery = query.trim();

        // Check if query is numeric (potential barcode)
        const isNumeric = /^\d+$/.test(trimmedQuery);

        if (isNumeric) {
            const { data, error } = await supabaseClient
                .from('products')
                .select('id, name, price, image, is_available')
                .is('parent_id', null)
                .eq('barcode', trimmedQuery)
                .limit(19);

            if (error) {
                console.error("Error searching products by barcode:", error);
                return [];
            }
            return (data || []).map(mapToProduct);
        }

        // Text search: split query into words for partial/flexible matching
        const lowerQuery = trimmedQuery.toLowerCase();
        const keywords = lowerQuery.split(/\s+/).filter(k => k.length > 0);

        // Build an OR query for all keywords
        const orConditions = keywords.map(keyword => `name.ilike.%${keyword}%`).join(',');

        const { data: searchHits, error: searchError } = await supabaseClient
            .from('products')
            .select('id, name, price, image, is_available')
            .or(orConditions)
            .limit(200);

        if (searchError) throw searchError;
        if (!searchHits || searchHits.length === 0) return [];

        // Deduplicate results by ID to prevent repeated products
        const uniqueHits = searchHits.filter((value, index, self) =>
            index === self.findIndex((t) => (
                t.id === value.id
            ))
        );

        // Rank: exact match > all words match > some words match
        const ranked = [...uniqueHits].sort((a, b) => {
            const aName = (a.name || '').toLowerCase().trim();
            const bName = (b.name || '').toLowerCase().trim();

            // Exact matches get top priority
            if (aName === lowerQuery && bName !== lowerQuery) return -1;
            if (bName === lowerQuery && aName !== lowerQuery) return 1;

            // Count how many keywords match
            const aMatches = keywords.filter(k => aName.includes(k)).length;
            const bMatches = keywords.filter(k => bName.includes(k)).length;

            if (aMatches !== bMatches) {
                return bMatches - aMatches; // More matches = better rank
            }

            // Fallback to starts-with priority
            const aStarts = keywords.some(k => aName.startsWith(k)) ? 1 : 0;
            const bStarts = keywords.some(k => bName.startsWith(k)) ? 1 : 0;
            return bStarts - aStarts;
        });

        // Return each product as standalone (no variants grouping)
        return ranked.slice(0, 19).map(mapToProduct);
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

// CLIENT-SIDE FUNCTION: fetch all categories
export async function getCategories_client(): Promise<Category[]> {
    if (!supabaseClient) {
        console.warn("Supabase not configured, using fallback categories");
        return FALLBACK_CATEGORIES;
    }

    try {
        const { data, error } = await supabaseClient
            .from('categories')
            .select('id, name');

        if (error) {
            console.error("Error fetching categories:", error);
            return FALLBACK_CATEGORIES;
        }

        return data || [];
    } catch (e) {
        console.error("Exception fetching categories:", e);
        return FALLBACK_CATEGORIES;
    }
}

// CLIENT-SIDE FUNCTION: fetch products by category with pagination
export async function getProductsByCategory_client(categoryId: string, page: number = 1, pageSize: number = 20): Promise<Product[]> {
    if (!supabaseClient) {
        console.warn("Supabase not configured, using fallback products for category");
        const filtered = FALLBACK_PRODUCTS.filter(p => p.category_id === categoryId);
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    try {
        const { data, error } = await supabaseClient
            .from('products')
            .select('id, name, price, image, stock, category_id, is_available, variants:products!parent_id(id, name, price, image, stock, category_id, is_available)')
            .is('parent_id', null)
            .eq('category_id', categoryId)
            .eq('is_available', true)
            .order('created_at', { ascending: false })
            .range(start, end);

        if (error) {
            console.error(`Error fetching products for category ${categoryId}:`, error);
            return [];
        }

        return (data || []).map(mapToProduct);
    } catch (e) {
        console.error(`Exception fetching products for category ${categoryId}:`, e);
        return [];
    }
}

