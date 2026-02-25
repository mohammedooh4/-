"use client";

import { useState } from 'react';
import Image from 'next/image';
import type { Product } from '@/types/product';
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { useCart } from '@/context/cart-context';
import { useFavorites } from '@/context/favorites-context';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SparkleButton } from '@/components/ui/sparkle-button';
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
  searchQuery?: string;
}

export function ProductCard({ product, categoryName, searchQuery }: ProductCardProps) {
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | undefined>(undefined);
  // Include the main product as the first item, then append variants
  const allProducts = [product, ...(product.variants || [])];

  // Calculate initial index based on search query if it exists
  const initialIndex = (() => {
    if (!searchQuery) return 0;
    const query = searchQuery.toLowerCase();
    const index = allProducts.findIndex(p => p.name.toLowerCase().includes(query));
    return index !== -1 ? index : 0;
  })();

  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const activeProduct = allProducts[activeIndex] || product;
  const isUnavailable = activeProduct.is_available === false;

  // Favorite the currently viewed product (the specific variant or parent the user is looking at)
  const isFav = isFavorite(activeProduct.id);

  const getOptimizedImage = (url: string) => {
    if (!url || typeof url !== 'string') return '';
    // Use Supabase built-in image transformations for dramatic payload reduction (needs Pro plan, but acts as passthrough if not enabled/free plan)
    if (url.includes('supabase.co/storage/v1/object/public/')) {
      return url.replace('/object/public/', '/render/image/public/') + '?width=400&quality=80';
    }
    return url;
  };

  const activeImage = getOptimizedImage(activeProduct.image);

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveIndex((prev) => (prev === 0 ? allProducts.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveIndex((prev) => (prev === allProducts.length - 1 ? 0 : prev + 1));
  };

  const handleBuyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isUnavailable) {
      toast({
        title: "⚠️ المنتج غير متوفر",
        description: `"${activeProduct.name}" غير متوفر حالياً.`,
        variant: "destructive",
      });
      return;
    }

    if (activeProduct.options && activeProduct.options.length > 0) {
      setSelectedOption(undefined);
      setIsDialogOpen(true);
      return;
    }

    addToCart(activeProduct);
    toast({
      title: "✅ تمت الإضافة إلى السلة",
      description: `"${activeProduct.name}" أصبح الآن في سلتك.`,
    });
  };

  const handleConfirmOption = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedOption) return;

    addToCart(activeProduct, selectedOption);
    setIsDialogOpen(false);
    toast({
      title: "✅ تمت الإضافة إلى السلة",
      description: `"${activeProduct.name} - ${selectedOption}" أصبح الآن في سلتك.`,
    });
  };

  return (
    <>
      <div
        className={`group h-full relative bg-background rounded-[1.25rem] md:rounded-[1.75rem] p-2 md:p-3 flex flex-col shadow-neumorph border-none ${isUnavailable ? 'opacity-50 ring-2 ring-red-400' : ''}`}
        style={{ contain: 'layout style paint', willChange: 'transform' }}
      >
        {/* Product Image & Badges & Thumbnails (Light gray block) */}
        <div className="relative bg-background shadow-neumorph-inset rounded-[1.1rem] md:rounded-2xl overflow-hidden mb-3 md:mb-4">
          {/* Top Badges Overlay */}
          <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex justify-between items-start pointer-events-none gap-1">
            <div className="flex flex-col gap-2 items-start pointer-events-auto shrink-0">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(activeProduct.id); }}
                className={`bg-background text-red-500 w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-full shadow-neumorph-sm active:shadow-neumorph-inset-sm transition-all ${isFav ? 'shadow-neumorph-inset-sm' : ''}`}
                aria-label={isFav ? "إزالة من المفضلة" : "إضافة للمفضلة"}
              >
                <Heart className={`w-[18px] h-[18px] md:w-5 md:h-5 transition-colors ${isFav ? 'fill-red-500 text-red-500' : 'text-muted-foreground hover:text-red-500'}`} strokeWidth={2.5} />
              </button>
              {allProducts.length > 1 && (
                <span className="bg-background text-foreground shadow-neumorph-sm text-[10px] md:text-[11px] px-2.5 py-1 rounded-full font-bold inline-block leading-tight">
                  خيارات أخرى
                </span>
              )}
            </div>

            {categoryName && (
              <span className="bg-background text-foreground shadow-neumorph-sm text-[10px] md:text-[11px] px-2.5 py-1 rounded-full font-medium pointer-events-auto leading-tight text-left max-w-[70%]" dir="ltr">
                {categoryName}
              </span>
            )}
          </div>

          <AspectRatio ratio={1 / 1} className="flex items-center justify-center">
            <Image
              src={activeImage}
              alt={activeProduct.image_alt || activeProduct.name || 'صورة المنتج'}
              data-ai-hint={activeProduct.ai_hint}
              fill
              loading="lazy"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-contain p-2 md:p-4 mix-blend-multiply dark:mix-blend-normal"
            />
          </AspectRatio>

          {/* Carousel Arrows */}
          {allProducts.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 z-20 bg-background shadow-neumorph-sm active:shadow-neumorph-inset-sm text-foreground w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-full transition-transform"
                aria-label="الصورة السابقة"
              >
                <ChevronRight className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 z-20 bg-background shadow-neumorph-sm active:shadow-neumorph-inset-sm text-foreground w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-full transition-transform"
                aria-label="الصورة التالية"
              >
                <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
              </button>
            </>
          )}

          {/* Thumbnails (Inside the gray box at the bottom) */}
          {allProducts.length > 1 && (
            <div className="absolute bottom-2.5 md:bottom-3 left-0 right-0 z-20">
              <div
                className="flex items-center justify-center gap-1.5 md:gap-2 overflow-x-auto w-full px-2"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {allProducts.map((prod, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveIndex(idx);
                    }}
                    className={`relative flex-shrink-0 transition-all rounded-full overflow-hidden bg-background ${idx === activeIndex ? 'w-11 h-11 md:w-14 md:h-14 shadow-neumorph-inset p-1' : 'w-9 h-9 md:w-11 md:h-11 shadow-neumorph-sm hover:shadow-neumorph-inset-sm p-0.5 opacity-80 hover:opacity-100'}`}
                    aria-label={`عرض ${prod.name}`}
                  >
                    <Image
                      src={getOptimizedImage(prod.image)}
                      alt={`صورة ${prod.name}`}
                      fill
                      sizes="56px"
                      className="object-cover rounded-full"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex flex-col flex-grow px-1.5 md:px-2 pb-0.5">
          {/* Title and Action Row */}
          <div className="flex flex-col flex-grow justify-between gap-2 md:gap-4">
            {/* Title - Centered exactly like mockup */}
            <h3 className="text-[13px] sm:text-[15px] md:text-[17px] font-bold leading-snug line-clamp-2 text-foreground text-center min-h-[2rem] md:min-h-[2.75rem]">
              {activeProduct.name}
            </h3>

            {/* Bottom Action Row (Realistic Liquid Glass Pill) */}
            <div className="flex items-center w-full mt-auto mb-1 rounded-full pl-2 pr-1 py-1 md:pl-4 md:pr-1.5 md:py-1.5 h-12 md:h-14 bg-gradient-to-b from-white to-gray-100 dark:from-zinc-700 dark:to-zinc-800 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),_0_2px_6px_rgba(0,0,0,0.06)] border border-white/60 dark:border-white/10">

              {/* Price (Left/center area) */}
              <div className="flex flex-col items-center justify-center flex-1 overflow-hidden">
                <span className="font-extrabold text-[14px] sm:text-[16px] md:text-[18px] text-foreground tracking-tight whitespace-nowrap overflow-hidden text-ellipsis w-full text-center" dir="ltr">
                  {activeProduct.price.toLocaleString('ar-IQ', { style: 'currency', currency: 'IQD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>

              {/* Cart Button (Right side, using SparkleButton) */}
              <div className="flex-shrink-0 w-10 h-10 md:w-11 md:h-11 relative z-10">
                <SparkleButton
                  onClick={handleBuyClick}
                  disabled={isUnavailable}
                  ariaLabel={isUnavailable ? 'غير متوفر' : 'أضف للسلة'}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] rounded-2xl mx-auto border-none p-6" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="text-2xl text-center mb-2">{activeProduct.name}</DialogTitle>
            <DialogDescription className="text-center text-base mb-4">
              الرجاء اختيار النوع المفضل
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-4">
            {activeProduct.options?.map((option) => (
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
