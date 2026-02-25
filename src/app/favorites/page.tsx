"use client";

import { useFavorites } from '@/context/favorites-context';
import { ProductCard } from '@/components/product-card';
import { Heart, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function FavoritesPage() {
    const { favoriteProducts, isLoading } = useFavorites();
    const { user } = useAuth();

    if (!user) {
        return (
            <div className="container mx-auto px-4 py-8 pb-32 max-w-5xl flex flex-col items-center justify-center min-h-[60vh]">
                <div className="bg-background shadow-neumorph-inset p-8 rounded-3xl text-center max-w-md w-full">
                    <div className="w-20 h-20 bg-background shadow-neumorph rounded-full flex items-center justify-center mx-auto mb-6">
                        <Heart className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">يرجى تسجيل الدخول</h2>
                    <p className="text-muted-foreground mb-8">
                        قم بتسجيل الدخول لحفظ منتجاتك المفضلة والوصول إليها من أي جهاز.
                    </p>
                    <Link href="/login">
                        <Button className="w-full h-14 text-lg font-bold shadow-neumorph rounded-2xl bg-primary text-primary-foreground">
                            تسجيل الدخول
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 pb-32 max-w-5xl">
            <div className="flex items-center gap-4 mb-8">
                <div className="bg-background shadow-neumorph p-3 md:p-4 rounded-2xl text-red-500">
                    <Heart className="w-6 h-6 md:w-8 md:h-8 fill-red-500" />
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                    منتجاتي المفضلة
                </h1>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-48">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : favoriteProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20 bg-background shadow-neumorph-inset rounded-3xl mx-2 md:mx-4">
                    <Heart className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
                    <h2 className="text-xl font-bold mb-2">لا توجد منتجات مفضلة</h2>
                    <p className="text-muted-foreground max-w-xs mx-auto">
                        قم بالضغط على رمز القلب في أي منتج لإضافته إلى هذه القائمة.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {favoriteProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            )}
        </div>
    );
}
