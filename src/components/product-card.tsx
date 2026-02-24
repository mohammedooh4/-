"use client";

import { useState } from 'react';
import Image from 'next/image';
import type { Product } from '@/types/product';
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { useCart } from '@/context/cart-context';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
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
  searchQuery?: string;
}

export function ProductCard({ product, categoryName, searchQuery }: ProductCardProps) {
  const { addToCart } = useCart();
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
        className={`group relative bg-white dark:bg-zinc-900 rounded-[1.25rem] md:rounded-[1.75rem] p-2.5 md:p-3 flex flex-col shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)] border border-zinc-100 dark:border-zinc-800 transition-all duration-300 hover:shadow-lg ${isUnavailable ? 'opacity-50 ring-2 ring-red-400' : ''}`}
      >
        {/* Product Image & Badges & Thumbnails (Light gray block) */}
        <div className="relative bg-[#f4f4f5] dark:bg-zinc-800/80 rounded-[1.1rem] md:rounded-2xl overflow-hidden mb-3 md:mb-4">
          {/* Top Badges Overlay */}
          <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex justify-between items-start pointer-events-none gap-1">
            <div className="flex flex-col gap-1 items-start pointer-events-auto shrink-0">
              {allProducts.length > 1 && (
                <span className="bg-zinc-900/90 text-white text-[10px] md:text-[11px] px-2.5 py-1 rounded-full font-bold shadow-sm inline-block leading-tight">
                  خيارات أخرى
                </span>
              )}
            </div>

            {categoryName && (
              <span className="bg-zinc-500/90 text-white text-[10px] md:text-[11px] px-2.5 py-1 rounded-full font-medium shadow-sm inline-block pointer-events-auto leading-tight text-left max-w-[70%]" dir="ltr">
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
              className="object-contain p-4 mix-blend-multiply dark:mix-blend-normal transition-transform duration-500 ease-in-out group-hover:scale-105"
            />
          </AspectRatio>

          {/* Carousel Arrows */}
          {allProducts.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 z-20 bg-white shadow-md hover:bg-zinc-50 text-zinc-900 p-2 md:p-2.5 rounded-full transition-transform hover:scale-110 active:scale-95"
                aria-label="الصورة السابقة"
              >
                <ChevronRight className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 z-20 bg-white shadow-md hover:bg-zinc-50 text-zinc-900 p-2 md:p-2.5 rounded-full transition-transform hover:scale-110 active:scale-95"
                aria-label="الصورة التالية"
              >
                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
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
                    className={`relative flex-shrink-0 transition-all rounded-full overflow-hidden bg-white border-[2px] md:border-[2.5px] shadow-md ${idx === activeIndex ? 'w-10 h-10 md:w-12 md:h-12 border-zinc-900 scale-110' : 'w-8 h-8 md:w-10 md:h-10 border-white opacity-80 hover:opacity-100 hover:scale-105'}`}
                    aria-label={`عرض ${prod.name}`}
                  >
                    <Image
                      src={getOptimizedImage(prod.image)}
                      alt={`صورة ${prod.name}`}
                      fill
                      sizes="48px"
                      className="object-cover"
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
          <div className="flex flex-col flex-grow justify-between gap-3 md:gap-4">
            {/* Title - Centered exactly like mockup */}
            <h3 className="text-[14px] sm:text-[15px] md:text-[17px] font-bold leading-snug line-clamp-2 text-zinc-900 dark:text-zinc-100 text-center min-h-[2.5rem] md:min-h-[2.75rem]">
              {activeProduct.name}
            </h3>

            {/* Bottom Action Row (Price left, thick button right) */}
            <div className="flex items-center justify-between gap-3 w-full mt-auto mb-1">

              {/* Cart Button (Right side, matching mockup squares) */}
              <button
                onClick={(e) => handleBuyClick(e)}
                disabled={isUnavailable}
                className="flex items-center justify-center bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 text-white p-3.5 md:p-4 rounded-[14px] md:rounded-[18px] transition-transform active:scale-95 disabled:opacity-50 flex-shrink-0 shadow-[0_4px_12px_rgba(0,0,0,0.15)] w-12 h-12 md:w-14 md:h-14"
                aria-label={isUnavailable ? 'غير متوفر' : 'أضف للسلة'}
              >
                {isUnavailable ? (
                  <span className="text-[11px] md:text-[12px] font-bold">نفذ</span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 md:w-7 md:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                )}
              </button>

              {/* Price (Left side, big bold) */}
              <div className="flex flex-col items-start overflow-hidden flex-1">
                <span className="font-black text-[18px] sm:text-[20px] md:text-[26px] text-zinc-900 dark:text-zinc-100 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis w-full text-right" dir="ltr">
                  {activeProduct.price.toLocaleString('ar-IQ', { style: 'currency', currency: 'IQD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
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
