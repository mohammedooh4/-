
"use client";

import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/types/product';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { useCart } from '@/context/cart-context';
import { useToast } from '@/hooks/use-toast';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const isUnavailable = product.is_available === false;

  const handleCardClick = () => {
    if (isUnavailable) {
      toast({
        title: "⚠️ المنتج غير متوفر",
        description: `"${product.name}" غير متوفر حالياً.`,
        variant: "destructive",
      });
      return;
    }
    addToCart(product);
    toast({
      title: "✅ تمت الإضافة إلى السلة",
      description: `"${product.name}" أصبح الآن في سلتك.`,
    });
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
  };

  return (
    <div className={`group block ${isUnavailable ? 'cursor-not-allowed' : 'cursor-pointer'}`} onClick={handleCardClick} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}>
      <Card className={`h-full overflow-hidden transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1.5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg flex flex-col group-focus:ring-2 group-focus:ring-primary group-focus:ring-offset-2 bg-card/50 ${isUnavailable ? 'opacity-50 border-2 border-red-500' : ''}`}>
        <CardHeader className="p-0">
          <AspectRatio ratio={1 / 1} className="bg-muted">
            <Image
              src={product.image}
              alt={product.image_alt}
              data-ai-hint={product.ai_hint}
              fill
              className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
            />
          </AspectRatio>
        </CardHeader>
        <CardContent className="p-4 flex-grow flex flex-col">
          <Link href={`/products/${product.id}`} onClick={handleLinkClick} className="flex-grow">
            <h3 className="text-lg font-medium tracking-normal mb-1 truncate group-hover:underline">{product.name}</h3>
          </Link>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xl font-semibold text-primary">{product.price.toLocaleString('ar-IQ', { style: 'currency', currency: 'IQD', minimumFractionDigits: 0, maximumFractionDigits: 0, currencyDisplay: 'code' }).replace('IQD', 'د.ع')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
