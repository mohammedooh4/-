"use client";

import { useState } from 'react';
import Image from 'next/image';
import type { Product } from '@/types/product';
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { useCart } from '@/context/cart-context';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProductCardProps {
  product: Product;
  categoryName?: string;
}

export function ProductCard({ product, categoryName }: ProductCardProps) {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | undefined>(undefined);
  const isUnavailable = product.is_available === false;

  const getOptimizedImage = (url: string) => {
    if (!url || typeof url !== 'string') return '';
    // Use Supabase built-in image transformations for dramatic payload reduction (needs Pro plan, but acts as passthrough if not enabled/free plan)
    if (url.includes('supabase.co/storage/v1/object/public/')) {
      return url.replace('/object/public/', '/render/image/public/') + '?width=400&quality=80';
    }
    return url;
  };

  const activeImage = getOptimizedImage(product.image);

  const handleBuyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isUnavailable) {
      toast({
        title: "⚠️ المنتج غير متوفر",
        description: `"${product.name}" غير متوفر حالياً.`,
        variant: "destructive",
      });
      return;
    }

    if (product.options && product.options.length > 0) {
      setSelectedOption(undefined);
      setIsDialogOpen(true);
      return;
    }

    addToCart(product);
    toast({
      title: "✅ تمت الإضافة إلى السلة",
      description: `"${product.name}" أصبح الآن في سلتك.`,
    });
  };

  const handleConfirmOption = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedOption) return;

    addToCart(product, selectedOption);
    setIsDialogOpen(false);
    toast({
      title: "✅ تمت الإضافة إلى السلة",
      description: `"${product.name} - ${selectedOption}" أصبح الآن في سلتك.`,
    });
  };

  return (
    <>
      <div
        className={`group relative bg-white dark:bg-zinc-900 rounded-[2rem] p-4 flex flex-col gap-4 shadow-sm hover:shadow-xl transition-all duration-300 ease-in-out hover:-translate-y-1 ${isUnavailable ? 'opacity-50 ring-2 ring-red-400' : ''}`}
      >
        {/* Price Tag Badge - Top Right */}
        <div className="absolute top-4 right-4 z-10 bg-white/95 dark:bg-black/90 px-3 py-1 rounded-full shadow-md">
          <span className="font-bold text-sm text-foreground">
            {product.price.toLocaleString('ar-IQ', { style: 'currency', currency: 'IQD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>

        {/* Product Image */}
        <div className="overflow-hidden rounded-[1.5rem] relative">
          {/* Category Label Overlay */}
          {categoryName && (
            <div className="absolute top-2 left-2 z-10 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm">
              {categoryName}
            </div>
          )}
          <AspectRatio ratio={1 / 1} className="bg-muted rounded-[1.5rem] overflow-hidden">
            <Image
              src={activeImage}
              alt={product.image_alt || product.name || 'صورة المنتج'}
              data-ai-hint={product.ai_hint}
              fill
              loading="lazy"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
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
              onClick={(e) => handleBuyClick(e)}
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] rounded-2xl mx-auto border-none p-6" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="text-2xl text-center mb-2">{product.name}</DialogTitle>
            <DialogDescription className="text-center text-base mb-4">
              الرجاء اختيار النوع المفضل
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-4">
            {product.options?.map((option) => (
              <button
                key={option}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedOption(option);
                }}
                className={`w-full py-4 px-6 rounded-xl border-2 transition-all flex justify-between items-center text-right ${selectedOption === option
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-muted hover:border-primary/50 hover:bg-muted/50'
                  }`}
              >
                <span className="font-bold text-lg">{option}</span>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedOption === option ? 'border-primary' : 'border-muted-foreground/30'
                  }`}>
                  {selectedOption === option && <div className="w-3 h-3 rounded-full bg-primary" />}
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-3 mt-4">
            <Button
              className="w-full text-base py-6 rounded-xl font-bold shadow-md h-14"
              onClick={(e) => handleConfirmOption(e)}
              disabled={!selectedOption}
            >
              أضف للسلة
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
