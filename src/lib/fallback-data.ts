// Fallback configuration for mobile app builds when Supabase is not configured
export const FALLBACK_PRODUCTS = [
  {
    id: '1',
    name: 'منتج تجريبي 1',
    price: 99.99,
    description: 'هذا وصف تجريبي للمنتج الأول',
    image: 'https://placehold.co/600x400.png',
    image_alt: 'منتج تجريبي 1',
    ai_hint: 'منتج عصري وأنيق',
    category_id: '1'
  },
  {
    id: '2',
    name: 'منتج تجريبي 2',
    price: 149.99,
    description: 'هذا وصف تجريبي للمنتج الثاني',
    image: 'https://placehold.co/600x400.png',
    image_alt: 'منتج تجريبي 2',
    ai_hint: 'منتج عملي ومفيد',
    category_id: '2'
  },
  {
    id: '3',
    name: 'منتج تجريبي 3',
    price: 199.99,
    description: 'هذا وصف تجريبي للمنتج الثالث',
    image: 'https://placehold.co/600x400.png',
    image_alt: 'منتج تجريبي 3',
    ai_hint: 'منتج فاخر وعالي الجودة',
    category_id: '1'
  }
];

export const FALLBACK_CATEGORIES = [
  { id: '1', name: 'إلكترونيات', icon: '📱' },
  { id: '2', name: 'ملابس', icon: '👕' },
  { id: '3', name: 'منزل', icon: '🏠' }
];

export function isSupabaseConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}