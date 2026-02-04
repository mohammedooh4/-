"use client";

import type { Product } from '@/types/product';
import { ProductImageZoom } from '@/components/product-image-zoom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { useToast } from '@/hooks/use-toast';

interface ProductDetailsClientProps {
  product: Product;
}

export function ProductDetailsClient({ product }: ProductDetailsClientProps) {
  const { addToCart } = useCart();
  const { toast } = useToast();

  const handleAddToCart = () => {
    addToCart(product);
    toast({
      title: "✅ تمت الإضافة إلى السلة",
      description: `"${product.name}" أصبح الآن في سلتك.`,
    });
  };

  return (
    <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
      <ProductImageZoom src={product.image} alt={product.image_alt} aiHint={product.ai_hint} />
      
      <div className="flex flex-col pt-4">
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-2">{product.name}</h1>
        <p className="text-3xl font-bold text-primary">{product.price.toLocaleString('ar-IQ', { style: 'currency', currency: 'IQD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
        <Separator className="my-4" />
        <div className="prose prose-lg text-foreground max-w-none">
            <h2 className="font-semibold text-xl mb-2">الوصف</h2>
            <p className="text-muted-foreground">{product.description}</p>
        </div>
        <div className="mt-auto pt-8">
          <Button size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-6" onClick={handleAddToCart}>
            <ShoppingCart className="ml-3 h-6 w-6" />
            أضف إلى السلة
          </Button>
        </div>
      </div>
    </div>
  );
}
