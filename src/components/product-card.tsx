
"use client";

import Image from 'next/image';
import type { Product } from '@/types/product';
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { useCart } from '@/context/cart-context';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  categoryName?: string;
}

export function ProductCard({ product, categoryName }: ProductCardProps) {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const isUnavailable = product.is_available === false;

  const handleBuyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  return (
    <div
      className={`group relative bg-white dark:bg-zinc-900 rounded-[2rem] p-4 flex flex-col gap-4 shadow-sm hover:shadow-xl transition-all duration-300 ease-in-out hover:-translate-y-1 ${isUnavailable ? 'opacity-50 ring-2 ring-red-400' : ''}`}
    >
      {/* Price Tag Badge - Top Right */}
      <div className="absolute top-4 right-4 z-10 bg-white/90 dark:bg-black/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-md">
        <span className="font-bold text-sm text-foreground">
          {product.price.toLocaleString('ar-IQ', { style: 'currency', currency: 'IQD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
      </div>

      {/* Product Image */}
      <div className="overflow-hidden rounded-[1.5rem] relative">
        {/* Category Label Overlay */}
        {categoryName && (
          <div className="absolute top-2 left-2 z-10 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
            {categoryName}
          </div>
        )}
        <AspectRatio ratio={1 / 1} className="bg-muted rounded-[1.5rem] overflow-hidden">
          <Image
            src={product.image}
            alt={product.image_alt}
            data-ai-hint={product.ai_hint}
            fill
            loading="lazy"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
          />
        </AspectRatio>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 mt-auto">
        <h3 className="text-sm md:text-lg font-bold leading-tight line-clamp-2 text-foreground text-center min-h-[2.5rem] flex items-center justify-center">
          {product.name}
        </h3>

        <div className="flex items-center justify-between gap-2 mt-2">
          <div className="flex flex-col">
            <span className="font-bold text-xs md:text-sm text-foreground">
              {product.price.toLocaleString('ar-IQ', { style: 'currency', currency: 'IQD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>

          <button
            onClick={handleBuyClick}
            disabled={isUnavailable}
            className="flex items-center justify-center bg-secondary/80 hover:bg-secondary text-foreground p-2 rounded-full transition-all active:scale-95 disabled:opacity-50 shadow-sm"
            aria-label={isUnavailable ? 'غير متوفر' : 'أضف للسلة'}
          >
            {isUnavailable ? (
              <span className="text-[10px] font-bold px-1">X</span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shopping-cart"><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
