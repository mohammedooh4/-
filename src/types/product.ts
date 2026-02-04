export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  image_alt: string;
  ai_hint: string;
  category_id?: string | null;
  stock?: number;
}
