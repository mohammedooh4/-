"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useCart } from "@/context/cart-context";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingBag, Loader2, LogIn, Plus, Minus, Trash2, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { AnimatedSendButton } from "@/components/ui/animated-send-button";
import { Label } from "@/components/ui/label";
import { supabaseClient } from "@/lib/supabase";
import type { CartItem } from "@/context/cart-context";
import type { User } from '@supabase/supabase-js'
import { Input } from "@/components/ui/input";
import QRCode from "react-qr-code";
import { cn } from "@/lib/utils";

// --- Logic remains the same ---
async function createOrder(cartItems: CartItem[], totalPrice: number, user: User, notes: string, contactPhone: string): Promise<{ success: boolean; orderId?: string; finalTotal?: number; error?: any }> {
  if (user.id) {
    const { data: existingOrder, error: existingOrderError } = await supabaseClient!
      .from('orders')
      .select('id, total_amount, notes')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingOrder && !existingOrderError) {
      console.log("Found existing pending order, merging items:", existingOrder.id);

      const newTotal = (existingOrder.total_amount || 0) + totalPrice;

      const { error: updateError } = await supabaseClient!
        .from('orders')
        .update({
          total_amount: newTotal,
          notes: notes ? (existingOrder.notes ? `${existingOrder.notes}\n---\n${notes}` : notes) : undefined
        })
        .eq('id', existingOrder.id);

      if (updateError) {
        console.error("Error updating existing order total:", updateError);
        return { success: false, error: updateError };
      }

      const itemsToInsert = cartItems.map(item => ({
        order_id: existingOrder.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        selected_option: item.selectedOption || null
      }));

      const { error: itemsError } = await supabaseClient!
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error("Error inserting items into existing order:", itemsError);
        return { success: false, error: itemsError };
      }

      return { success: true, orderId: existingOrder.id, finalTotal: newTotal };
    }
  }

  const insertOrder = async (includeUserId: boolean) => {
    const orderPayload: any = {
      total_amount: totalPrice,
      status: 'pending',
      customer_name: user.user_metadata?.full_name || user.email || 'N/A',
      customer_email: user.email,
      customer_phone: contactPhone || '',
      notes: notes,
    };

    if (includeUserId) {
      orderPayload.user_id = user.id;
    }

    return supabaseClient!
      .from('orders')
      .insert(orderPayload)
      .select('id')
      .single();
  };

  let { data: orderData, error: orderError } = await insertOrder(true);

  if (orderError) {
    console.warn("First attempt to create order failed (maybe mock user?):", orderError.code, orderError.message);
    if (orderError.code === '23503' || orderError.code === '22P02') {
      console.warn("Retrying order creation without user_id...");
      const retryResult = await insertOrder(false);
      orderData = retryResult.data;
      orderError = retryResult.error;
    }
  }

  if (orderError) {
    console.error('Supabase error creating order (Final):', JSON.stringify(orderError, null, 2));
    return { success: false, error: orderError };
  }

  if (!orderData || !orderData.id) {
    console.error('Failed to get order ID after creation.');
    return { success: false, error: new Error('Order ID not returned after creation.') };
  }

  const orderId = orderData.id;

  const itemsToInsert = cartItems.map(item => ({
    order_id: orderId,
    product_id: item.id,
    quantity: item.quantity,
    unit_price: item.price,
    total_price: item.price * item.quantity,
    selected_option: item.selectedOption || null
  }));

  const { error: itemsError } = await supabaseClient!
    .from('order_items')
    .insert(itemsToInsert);

  if (itemsError) {
    console.error(`Supabase error creating order items for order ID ${orderId}:`, JSON.stringify(itemsError, null, 2));
    await supabaseClient!.from('orders').delete().eq('id', orderId);
    return { success: false, error: itemsError };
  }

  return { success: true, orderId, finalTotal: totalPrice };
}


export default function CartPage() {
  const { cartItems, updateQuantity, removeFromCart, totalPrice, clearCart, isLoading: isCartLoading } = useCart();
  const { user, loading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [activeOrders, setActiveOrders] = useState<{ id: string; total: number }[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [editingOrder, setEditingOrder] = useState<string | null>(null);

  // Load saved phone number (localStorage first, then user metadata)
  useEffect(() => {
    const savedPhone = localStorage.getItem('contactPhone');
    if (savedPhone) {
      setContactPhone(savedPhone);
    } else if (user) {
      const phone = user.phone || user.user_metadata?.phone || '';
      if (phone) setContactPhone(phone);
    }
  }, [user]);

  // Save phone to localStorage whenever user changes it
  const handlePhoneChange = (value: string) => {
    setContactPhone(value);
    if (value.trim()) {
      localStorage.setItem('contactPhone', value);
    }
  };

  useEffect(() => {
    const checkOrdersExistence = async () => {
      const savedOrders = localStorage.getItem('activeOrders');
      if (savedOrders) {
        try {
          const parsedOrders: { id: string; total: number }[] = JSON.parse(savedOrders);

          if (!Array.isArray(parsedOrders) || parsedOrders.length === 0) {
            setActiveOrders([]);
            return;
          }

          const quoteIds = parsedOrders.map(o => o.id);
          const { data, error } = await supabaseClient!
            .from('orders')
            .select('id')
            .in('id', quoteIds);

          if (error) {
            console.error("Error verifying orders:", error);
            setActiveOrders(parsedOrders);
            return;
          }

          const existingIds = new Set((data || []).map((o: any) => o.id));
          const validOrders = parsedOrders.filter(order => existingIds.has(order.id));

          if (validOrders.length !== parsedOrders.length) {
            localStorage.setItem('activeOrders', JSON.stringify(validOrders));
          }

          setActiveOrders(validOrders);

        } catch (e) {
          console.error("Failed to parse active orders", e);
          localStorage.removeItem('activeOrders');
        }
      }
    };

    checkOrdersExistence();
    const interval = setInterval(checkOrdersExistence, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleEditOrder = async (orderId: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "يرجى تسجيل الدخول",
        description: "يجب عليك تسجيل الدخول أولاً لتعديل الطلب.",
      });
      return;
    }

    try {
      console.log('Attempting to fetch order items for order:', orderId);

      // Check if supabase client is available
      if (!supabaseClient) {
        console.error('Supabase client not available');
        toast({
          variant: "destructive",
          title: "خطأ في الاتصال",
          description: "لم يتمكن من الاتصال بقاعدة البيانات.",
        });
        return;
      }

      // Fetch order details from database
      const { data: orderItems, error } = await supabaseClient
        .from('order_items')
        .select(`
          *,
          products!inner (
            id,
            name,
            price,
            image,
            image_alt,
            description,
            category_id
          )
        `)
        .eq('order_id', orderId);

      console.log('Order items query result:', { orderItems, error, orderId });

      if (error) {
        console.error('Database error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });

        // Handle empty error object
        const errorMessage = error.message ||
          error.details ||
          error.hint ||
          (error.code && `خطأ في قاعدة البيانات: ${error.code}`) ||
          'حدث خطأ غير معروف في جلب تفاصيل الطلب';

        toast({
          variant: "destructive",
          title: "خطأ في جلب تفاصيل الطلب",
          description: errorMessage,
        });
        return;
      }

      if (!orderItems || orderItems.length === 0) {
        console.error('No order items found for order:', orderId);
        toast({
          variant: "destructive",
          title: "الطلب غير موجود",
          description: "لم يتم العثور على منتجات في هذا الطلب.",
        });
        return;
      }

      // Convert order items back to cart items format
      const cartItemsToAdd: CartItem[] = orderItems
        .map(item => {
          const product = item.products;
          if (!product) {
            console.error('Product not found for item:', item);
            return null;
          }
          return {
            id: product.id,
            name: product.name || 'منتج غير معروف',
            price: product.price || 0,
            image: product.image || '/placeholder-image.jpg',
            image_alt: product.image_alt || 'صورة المنتج',
            description: product.description || '',
            category_id: product.category_id || '',
            ai_hint: product.ai_hint || '',
            quantity: item.quantity
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      console.log('Cart items to add:', cartItemsToAdd);

      if (cartItemsToAdd.length === 0) {
        toast({
          variant: "destructive",
          title: "لا توجد منتجات صالحة",
          description: "لم يتم العثور على منتجات صالحة في هذا الطلب.",
        });
        return;
      }

      // Clear existing cart and add new items
      localStorage.setItem('cartItems', JSON.stringify([]));

      // Add items back to cart using cart context format
      const newCartItems = cartItemsToAdd.map(item => ({
        id: item.id,
        quantity: item.quantity
      }));

      localStorage.setItem('cartItems', JSON.stringify(newCartItems));

      // Remove order from active orders
      setActiveOrders(prev => {
        const updatedOrders = prev.filter(o => o.id !== orderId);
        localStorage.setItem('activeOrders', JSON.stringify(updatedOrders));
        return updatedOrders;
      });

      // Delete order from database
      const { error: deleteError } = await supabaseClient!
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (deleteError) {
        console.error('Error deleting order:', deleteError);
        toast({
          variant: "destructive",
          title: "خطأ في حذف الطلب",
          description: "تمت إضافة المنتجات للسلة ولكن لم يتم حذف الطلب القديم.",
        });
      } else {
        toast({
          title: "✅ تم إضافة المنتجات للسلة",
          description: "يمكنك الآن تعديل الطلب وإرساله مرة أخرى.",
        });
      }

      // Refresh page to show updated cart
      window.location.reload();
    } catch (error) {
      console.error('Error editing order:', error);
      toast({
        variant: "destructive",
        title: "حدث خطأ!",
        description: "لم نتمكن من تعديل الطلب. يرجى المحاولة مرة أخرى.",
      });
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "يرجى تسجيل الدخول",
        description: "يجب عليك تسجيل الدخول أولاً لإتمام الطلب.",
      });
      return;
    }

    if (!contactPhone) {
      toast({
        variant: "destructive",
        title: "رقم الهاتف مطلوب",
        description: "يرجى إدخال رقم هاتف للتواصل.",
      });
      return;
    }

    setIsCheckoutLoading(true);
    const { success, orderId, finalTotal, error } = await createOrder(cartItems, totalPrice, user, orderNotes, contactPhone);
    setIsCheckoutLoading(false);

    if (success && orderId) {
      toast({
        title: "🚀 تم إرسال طلبك بنجاح!",
        description: "شكراً لك، سنقوم بتجهيز طلبك في أقرب وقت.",
      });

      const orderTotal = finalTotal || totalPrice;

      setActiveOrders(prev => {
        const existingOrderIndex = prev.findIndex(o => o.id === orderId);
        let updatedOrders;
        if (existingOrderIndex >= 0) {
          updatedOrders = [...prev];
          updatedOrders[existingOrderIndex] = { ...updatedOrders[existingOrderIndex], total: orderTotal };
        } else {
          updatedOrders = [...prev, { id: orderId, total: orderTotal }];
        }
        localStorage.setItem('activeOrders', JSON.stringify(updatedOrders));
        return updatedOrders;
      });

      clearCart();
    } else {
      toast({
        variant: "destructive",
        title: "حدث خطأ!",
        description: "لم نتمكن من إرسال طلبك. يرجى المحاولة مرة أخرى.",
      });
      console.error('Error creating order:', JSON.stringify(error, null, 2));
    }
  };


  if (isCartLoading) {
    return (
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col gap-6 animate-pulse">
          <div className="h-10 w-48 bg-gray-200 dark:bg-zinc-800 rounded-lg mx-auto md:mx-0"></div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-zinc-800 rounded-3xl w-full" />
              ))}
            </div>
            <div className="lg:col-span-4">
              <div className="h-64 bg-gray-200 dark:bg-zinc-800 rounded-3xl w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    if (activeOrders.length > 0) {
      return (
        <div className="container mx-auto px-4 py-8 md:py-12 flex flex-col items-center">
          <div className="text-center space-y-4 mb-8">
            <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-6">
              <ShoppingBag className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-green-600 dark:text-green-400">طلباتك النشطة</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              لديك {activeOrders.length} طلبات قيد التنفيذ.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
            {activeOrders.map((order) => (
              <Card key={order.id} className="p-6 flex flex-col items-center space-y-4 border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-900/10">
                <div className="text-center w-full">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                      <ShoppingBag className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-mono font-bold text-foreground">#{order.id.slice(0, 8)}</p>
                      <p className="text-sm text-green-600 dark:text-green-400 font-medium">قيد الانتظار</p>
                    </div>
                  </div>
                </div>

                <div className="w-full space-y-3">
                  <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">رقم الطلب:</span>
                        <span className="font-mono font-bold">{order.id.slice(0, 8)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">الحالة:</span>
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">قيد الانتظار</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between items-center">
                        <span className="text-sm">المبلغ الإجمالي:</span>
                        <span className="font-bold text-lg text-primary">{order.total.toLocaleString('ar-IQ', { style: 'currency', currency: 'IQD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="container mx-auto px-4 py-16 md:py-24 flex flex-col items-center justify-center text-center">
        <div className="w-32 h-32 bg-gray-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="h-16 w-16 text-gray-400" />
        </div>
        <h2 className="text-3xl font-bold mb-3">سلتك فارغة</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">
          لم تقم بإضافة أي منتجات إلى سلتك بعد. تصفح منتجاتنا المميزة وابدأ التسوق الآن.
        </p>
        <Button asChild size="lg" className="rounded-full px-8">
          <Link href="/">
            تصفح المنتجات
            <ArrowRight className="mr-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-950 pb-20">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">سلة التسوق</h1>
          <span className="bg-primary/10 text-primary px-4 py-1 rounded-full text-sm font-bold">
            {cartItems.length} منتجات
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Compact Cart Summary */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <Card className="rounded-3xl border-gray-100 dark:border-zinc-800 shadow-lg bg-white dark:bg-zinc-900 overflow-hidden">
              <div className="p-4 md:p-6 lg:p-8">
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <h2 className="text-lg md:text-xl font-bold">ملخص المنتجات</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)} className="text-xs md:text-sm">
                    {showDetails ? "إخفاء التفاصيل" : "عرض التفاصيل"}
                  </Button>
                </div>

                {/* Compact View - Default for mobile */}
                {!showDetails && (
                  <div className="space-y-3 md:space-y-4">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 md:gap-4 p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors">
                        <div className="relative w-12 h-12 md:w-16 md:h-16 bg-gray-100 dark:bg-zinc-700 rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={item.image}
                            alt={item.image_alt}
                            fill
                            className="object-cover hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                        <div className="flex-grow min-w-0">
                          <h3 className="font-bold text-xs md:text-sm truncate">
                            {item.name}
                            {item.selectedOption && <span className="text-primary mr-1">({item.selectedOption})</span>}
                          </h3>
                          <p className="text-primary font-bold text-sm md:text-base">
                            {item.price.toLocaleString('ar-IQ', { style: 'currency', currency: 'IQD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 md:gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 md:h-8 md:w-8 rounded-lg"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-2 w-2 md:h-3 md:w-3" />
                          </Button>
                          <span className="w-6 md:w-8 text-center font-bold text-xs md:text-sm">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 md:h-8 md:w-8 rounded-lg"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-2 w-2 md:h-3 md:w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 md:h-8 md:w-8 rounded-lg text-red-500 hover:bg-red-50"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="h-2 w-2 md:h-3 md:w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Detailed View */}
                {showDetails && (
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div
                        key={item.id}
                        className="group relative flex flex-col sm:flex-row items-center gap-4 md:gap-6 p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl"
                      >
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="absolute top-4 left-4 p-2 z-10 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <div className="relative w-20 h-20 md:w-24 md:h-24 bg-gray-100 dark:bg-zinc-700 rounded-xl overflow-hidden flex-shrink-0">
                          <Image
                            src={item.image}
                            alt={item.image_alt}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>

                        <div className="flex-grow flex flex-col gap-2 w-full text-center sm:text-right">
                          <h3 className="font-bold text-base md:text-lg text-gray-900 dark:text-gray-100 line-clamp-1">
                            {item.name}
                            {item.selectedOption && <span className="text-primary mr-1">({item.selectedOption})</span>}
                          </h3>
                          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{item.description}</p>
                          <p className="font-bold text-base md:text-lg text-primary">
                            {item.price.toLocaleString('ar-IQ', { style: 'currency', currency: 'IQD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </p>

                          <div className="flex items-center justify-center sm:justify-start gap-2 md:gap-3 bg-white dark:bg-zinc-900 rounded-full p-1 mt-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 md:h-8 md:w-8 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                            <span className="w-7 md:w-8 text-center font-bold text-xs md:text-sm">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 md:h-8 md:w-8 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1 order-1 lg:order-2 lg:sticky lg:top-24">
            <Card className="rounded-3xl border-gray-100 dark:border-zinc-800 shadow-lg bg-white dark:bg-zinc-900 overflow-hidden">
              <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                <h2 className="text-lg md:text-xl font-bold">ملخص الطلب</h2>

                <div className="space-y-3">
                  <div className="flex justify-between text-gray-500 text-sm md:text-base">
                    <span>عدد المنتجات</span>
                    <span>{cartItems.reduce((acc, item) => acc + item.quantity, 0)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-end">
                    <span className="font-bold text-base md:text-lg">المجموع الكلي</span>
                    <span className="font-bold text-lg md:text-2xl text-primary">
                      {totalPrice.toLocaleString('ar-IQ', { style: 'currency', currency: 'IQD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 md:space-y-4 pt-2 md:pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm md:text-base">رقم الهاتف <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input
                        id="phone"
                        placeholder="780 123 4567"
                        value={contactPhone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className="pl-12 rounded-xl h-10 md:h-12 bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-sm md:text-base"
                        dir="ltr"
                      />
                      <div className="absolute left-3 top-2 md:top-3 flex items-center gap-1 opacity-70 border-r border-gray-300 pr-2 h-5 md:h-6">
                        <span className="text-xs md:text-sm font-bold">964+</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-sm md:text-base">ملاحظات إضافية</Label>
                    <Textarea
                      id="notes"
                      placeholder="أي تعليمات خاصة للتوصيل..."
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className="resize-none rounded-xl bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 min-h-[60px] md:min-h-[80px] text-sm md:text-base"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  {isAuthLoading ? (
                    <Button disabled className="w-full h-10 md:h-14 rounded-xl text-sm md:text-lg">
                      <Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" />
                      جاري التحقق...
                    </Button>
                  ) : !user ? (
                    <Button className="w-full h-10 md:h-14 rounded-xl text-sm md:text-lg font-bold" asChild>
                      <Link href="/login">
                        <LogIn className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                        تسجيل الدخول للمتابعة
                      </Link>
                    </Button>
                  ) : (
                    <AnimatedSendButton
                      onClick={handleCheckout}
                      isLoading={isCheckoutLoading}
                      disabled={cartItems.length === 0}
                    />
                  )}

                  {user && (
                    <Button variant="ghost" className="w-full mt-2 text-gray-400 hover:text-red-500" onClick={clearCart}>
                      <ShoppingBag className="ml-2 h-4 w-4" />
                      إفراغ السلة
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
