"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCategories_client } from '@/lib/supabase';
import { ArrowRight, Tag, Menu, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { Category } from '@/types/category';
import { LoadingOverlay } from '@/components/loading-overlay';

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [navigating, setNavigating] = useState(false);
    const router = useRouter();

    useEffect(() => {
        async function fetchCategories() {
            setLoading(true);
            const cats = await getCategories_client();
            setCategories(cats);
            setLoading(false);
        }
        fetchCategories();
    }, []);

    const handleCategoryClick = (e: React.MouseEvent, path: string) => {
        e.preventDefault();
        setNavigating(true);
        router.push(path);
    };

    return (
        <>
            {navigating && <LoadingOverlay message="جاري تحميل القسم..." />}
            <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 pb-24">
                <div className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-b border-gray-100 dark:border-zinc-800">
                    <div className="container mx-auto px-4 h-16 flex items-center gap-4">
                        <Link href="/" className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                            <ArrowRight className="h-6 w-6" />
                        </Link>
                        <h1 className="text-xl font-bold">الأقسام</h1>
                    </div>
                </div>

                <div className="container mx-auto px-4 py-6">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {/* All Products */}
                            <a
                                href="/"
                                onClick={(e) => handleCategoryClick(e, '/')}
                                className="flex flex-col items-center gap-4 p-6 rounded-3xl bg-white dark:bg-zinc-900 shadow-sm border border-gray-100 dark:border-zinc-800 hover:shadow-md transition-all active:scale-95 cursor-pointer"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                    <Menu className="h-8 w-8" />
                                </div>
                                <span className="font-bold text-gray-900 dark:text-gray-100">الكل</span>
                            </a>

                            {categories.map((cat) => (
                                <a
                                    key={cat.id}
                                    href={`/category?id=${cat.id}`}
                                    onClick={(e) => handleCategoryClick(e, `/category?id=${cat.id}`)}
                                    className="flex flex-col items-center gap-4 p-6 rounded-3xl bg-white dark:bg-zinc-900 shadow-sm border border-gray-100 dark:border-zinc-800 hover:shadow-md transition-all active:scale-95 cursor-pointer"
                                >
                                    <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center p-3">
                                        <Tag className="h-8 w-8 text-gray-400" />
                                    </div>
                                    <span className="font-bold text-center text-gray-900 dark:text-gray-100">{cat.name}</span>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
