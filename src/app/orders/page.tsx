"use client";

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase';
import { OrderCard } from '@/components/order-card';
import { ClipboardList, ShoppingBag, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import { OrderWithItems } from '@/types/order';

export default function OrdersPage() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<OrderWithItems[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchOrders() {
            if (!user || !supabaseClient) {
                setIsLoading(false);
                return;
            }

            try {
                const { data, error } = await supabaseClient
                    .from('orders')
                    .select(`
            *,
            items:order_items(
              id,
              product_id,
              quantity,
              unit_price,
              selected_option,
              product:products(name, image)
            )
          `)
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setOrders((data as any) || []);
            } catch (error) {
                console.error('Error fetching orders:', error);
            } finally {
                setIsLoading(false);
            }
        }

        if (user !== undefined) {
            fetchOrders();
        }
    }, [user]);

    if (user === null) {
        return (
            <div className="container mx-auto px-4 py-8 pb-32 max-w-3xl flex flex-col items-center justify-center min-h-[60vh]">
                <div className="bg-background shadow-neumorph-inset p-8 rounded-3xl text-center max-w-md w-full">
                    <div className="w-20 h-20 bg-background shadow-neumorph rounded-full flex items-center justify-center mx-auto mb-6">
                        <ClipboardList className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">يرجى تسجيل الدخول</h2>
                    <p className="text-muted-foreground mb-8">
                        قم بتسجيل الدخول لمشاهدة وتتبع طلباتك السابقة.
                    </p>
                    <Link href="/login" className="block w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold shadow-neumorph text-lg">
                        تسجيل الدخول
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 pb-32 max-w-3xl">
            <div className="flex items-center gap-4 mb-8">
                <div className="bg-background shadow-neumorph p-3 md:p-4 rounded-2xl text-primary">
                    <ClipboardList className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                    سجل الطلبات
                </h1>
            </div>

            {isLoading ? (
                <div className="flex justify-center flex-col items-center h-48 gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">جاري تحميل الطلبات...</p>
                </div>
            ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20 bg-background shadow-neumorph-inset rounded-3xl mx-2">
                    <ShoppingBag className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
                    <h2 className="text-xl font-bold mb-2">ليس لديك أي طلبات حتى الآن</h2>
                    <p className="text-muted-foreground max-w-xs mx-auto mb-8">
                        قم بزيارة صفحة المنتجات وابدأ في تسوق أفضل منتجاتنا.
                    </p>
                    <Link href="/" className="px-8 py-4 bg-background shadow-neumorph rounded-full font-bold text-primary active:shadow-neumorph-inset transition-all">
                        تصفح المنتجات
                    </Link>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {orders.map((order) => (
                        <OrderCard key={order.id} order={order as any} />
                    ))}
                </div>
            )}
        </div>
    );
}
