"use client";

import Image from 'next/image';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface ProductImageZoomProps {
  src: string;
  alt: string;
  aiHint: string;
}

export function ProductImageZoom({ src, alt, aiHint }: ProductImageZoomProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="cursor-zoom-in overflow-hidden rounded-lg border shadow-sm transition-shadow hover:shadow-lg">
           <AspectRatio ratio={1 / 1} className="bg-muted">
            <Image
              src={src}
              alt={alt}
              data-ai-hint={aiHint}
              fill
              className="object-cover w-full h-full transition-transform duration-300 ease-in-out hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
            />
          </AspectRatio>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-full p-1 bg-transparent border-0">
        <AspectRatio ratio={16 / 9}>
          <Image src={src} alt={alt} data-ai-hint={aiHint} fill className="object-contain rounded-lg" />
        </AspectRatio>
      </DialogContent>
    </Dialog>
  );
}
