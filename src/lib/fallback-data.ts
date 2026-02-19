// Fallback configuration for mobile app builds when Supabase is not configured
export const FALLBACK_PRODUCTS = [
  {
    id: '1',
    name: 'سجاد كشميري فاخر',
    price: 250000,
    description: 'سجاد كشميري أصلي 100% صوف ناعم، تصميم تقليدي فاخر بألوان زاهية، مقاس 2x3 متر، مثالي لغرف المعيشة الفاخرة',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=400&fit=crop',
    image_alt: 'سجاد كشميري فاخر',
    ai_hint: 'سجاد كشميري أصلي صوف ناعم تصميم تقليدي',
    category_id: '1'
  },
  {
    id: '2',
    name: 'سجاد عجمي إيراني',
    price: 180000,
    description: 'سجاد عجمي إيراني أصلي، خيوط حريرية وصوف، تصميم إسلامي تقليدي، مقاس 2.5x3.5 متر، يدوي الصنع',
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&h=400&fit=crop',
    image_alt: 'سجاد عجمي إيراني',
    ai_hint: 'سجاد عجمي إيراني حرير صوف يدوي',
    category_id: '1'
  },
  {
    id: '3',
    name: 'سجاد حديث بتصميم أوروبي',
    price: 95000,
    description: 'سجاد حديث بتصميم أوروبي أنيق، ألياف صناعية عالية الجودة، مقاس 2x2.5 متر، مثالي للديكور العصري',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop',
    image_alt: 'سجاد حديث بتصميم أوروبي',
    ai_hint: 'سجاد حديث أوروبي ألياف صناعية',
    category_id: '2'
  },
  {
    id: '4',
    name: 'سجاد أطفال بأشكال كرتونية',
    price: 65000,
    description: 'سجاد أطفال بأشكال حيوانات كرتونية ملونة، ألياف آمنة للأطفال، مقاس 1.5x2 متر، مقاوم للبقع',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=400&fit=crop',
    image_alt: 'سجاد أطفال كرتوني',
    ai_hint: 'سجاد أطفال كرتوني آمن مقاوم للبقع',
    category_id: '3'
  },
  {
    id: '5',
    name: 'سجاد صلاة حريري',
    price: 75000,
    description: 'سجاد صلاة فاخر بخيوط حريرية، تصميم إسلامي أنيق، مقاس 1x1.5 متر، ناعم ومريح',
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&h=400&fit=crop',
    image_alt: 'سجاد صلاة حريري',
    ai_hint: 'سجاد صلاة حريري تصميم إسلامي',
    category_id: '4'
  },
  {
    id: '6',
    name: 'سجاد تركي بتصميم عثماني',
    price: 320000,
    description: 'سجاد تركي أصلي بتصميم عثماني فاخر، صوف ناعم 100%، مقاس 3x4 متر، يدوي الصنع بألوان غنية',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop',
    image_alt: 'سجاد تركي عثماني',
    ai_hint: 'سجاد تركي عثماني صوف يدوي',
    category_id: '1'
  }
];

export const FALLBACK_CATEGORIES = [
  { id: '1', name: 'سجاد تقليدي', icon: '🏺' },
  { id: '2', name: 'سجاد حديث', icon: '🎨' },
  { id: '3', name: 'سجاد أطفال', icon: '🧸' },
  { id: '4', name: 'سجاد صلاة', icon: '�' },
  { id: '5', name: 'سجاد خارجي', icon: '�' }
];

export function isSupabaseConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}