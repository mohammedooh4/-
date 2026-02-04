
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useCart } from "@/context/cart-context";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trash2, ShoppingBag, Loader2, LogIn, Plus, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabaseClient } from "@/lib/supabase";
import type { CartItem } from "@/context/cart-context";
import type { User } from '@supabase/supabase-js'
import { Input } from "@/components/ui/input";

async function createOrder(cartItems: CartItem[], totalPrice: number, user: User, notes: string, contactPhone: string): Promise<{ success: boolean; error?: any }> {
  // Helper to insert order
  const insertOrder = async (includeUserId: boolean) => {
    const orderPayload: any = {
      total_amount: totalPrice,
      status: 'pending',
      customer_name: user.user_metadata?.full_name || user.email || 'N/A',
      customer_email: user.email,
      customer_phone: contactPhone || '', // Use the passed phone
      notes: notes,
    };

    if (includeUserId) {
      orderPayload.user_id = user.id;
    }

    return supabaseClient
      .from('orders')
      .insert(orderPayload)
      .select('id')
      .single();
  };

  // 1. Try with user_id first
  let { data: orderData, error: orderError } = await insertOrder(true);

  // 2. If it fails due to FK violation (user not found in auth.users) or UUID syntax (should assume fixed now)
  // FK violation is usually code 23503. Invalid UUID is 22P02.
  if (orderError) {
    console.warn("First attempt to create order failed (maybe mock user?):", orderError.code, orderError.message);

    // If code implies user issue, try without user_id
    // 23503: foreign_key_violation
    // 22P02: invalid_text_representation (invalid uuid) - we fixed generation, but just in case
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
  }));

  const { error: itemsError } = await supabaseClient
    .from('order_items')
    .insert(itemsToInsert);

  if (itemsError) {
    console.error(`Supabase error creating order items for order ID ${orderId}:`, JSON.stringify(itemsError, null, 2));
    // Attempt to delete the orphaned order
    await supabaseClient.from('orders').delete().eq('id', orderId);
    return { success: false, error: itemsError };
  }

  return { success: true };
}


export default function CartPage() {
  const { cartItems, updateQuantity, removeFromCart, totalPrice, clearCart, isLoading: isCartLoading } = useCart();
  const { user, loading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Sync phone from user profile
  useEffect(() => {
    if (user) {
      const phone = user.phone || user.user_metadata?.phone || '';
      if (phone) setContactPhone(phone);
    }
  }, [user]);

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
    const { success, error } = await createOrder(cartItems, totalPrice, user, orderNotes, contactPhone);
    setIsCheckoutLoading(false);

    if (success) {
      toast({
        title: "🚀 تم إرسال طلبك بنجاح!",
        description: "شكراً لك، سنقوم بتجهيز طلبك في أقرب وقت.",
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

  const renderAuthSensitiveContent = () => {
    if (isAuthLoading) {
      return (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }
    if (!user) {
      return (
        <CardFooter className="flex-col gap-2">
          <p className="text-center text-muted-foreground mb-4">
            يرجى تسجيل الدخول للمتابعة
          </p>
          <Button className="w-full" asChild>
            <Link href="/login">
              <LogIn className="ml-2 h-4 w-4" />
              تسجيل الدخول
            </Link>
          </Button>
        </CardFooter>
      )
    }

    return (
      <CardFooter className="flex-col gap-2">
        <Button className="w-full" size="lg" onClick={handleCheckout} disabled={isCheckoutLoading || cartItems.length === 0}>
          {isCheckoutLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          ارسال الطلب
        </Button>
        <Button variant="outline" className="w-full" onClick={clearCart}>
          إفراغ السلة
        </Button>
      </CardFooter>
    );
  };

  const renderCartContent = () => {
    if (isCartLoading) {
      return (
        <div className="lg:col-span-2 space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="flex items-center p-4 overflow-hidden animate-pulse">
              <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-md bg-muted flex-shrink-0" />
              <div className="flex-grow flex flex-col gap-2 ml-4">
                <div className="h-6 w-3/4 bg-muted rounded"></div>
                <div className="h-4 w-full bg-muted rounded"></div>
                <div className="h-8 w-1/2 bg-muted rounded mt-2"></div>
              </div>
            </Card>
          ))}
        </div>
      )
    }

    if (cartItems.length === 0) {
      return (
        <div className="lg:col-span-3 text-center py-16 border-2 border-dashed rounded-lg">
          <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground" />
          <h2 className="mt-6 text-2xl font-semibold">سلتك فارغة</h2>
          <p className="text-muted-foreground mt-2">
            لم تقم بإضافة أي منتجات حتى الآن.
          </p>
          <Button asChild className="mt-6">
            <Link href="/">اكتشف المنتجات</Link>
          </Button>
        </div>
      );
    }

    return (
      <>
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map((item) => (
            <Card key={item.id} className="flex items-center p-4 overflow-hidden bg-card/50">
              <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-md overflow-hidden ml-4 border bg-muted flex-shrink-0">
                <Image
                  src={item.image}
                  alt={item.image_alt}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-grow flex flex-col gap-1">
                <h3 className="font-semibold text-lg">{item.name}</h3>
                <p className="text-muted-foreground text-sm">{item.description.substring(0, 50)}...</p>
                <p className="font-bold text-primary text-base">{item.price.toLocaleString('ar-IQ', { style: 'currency', currency: 'IQD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
              </div>
              <div className="flex flex-col items-end justify-between self-stretch gap-2 ml-4">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-lg font-bold w-10 text-center">{item.quantity}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFromCart(item.id)}
                  aria-label="Remove item"
                >
                  <Trash2 className="h-5 w-5 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>ملخص الطلب</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between font-bold text-lg">
                <span>المجموع الكلي</span>
                <span>{totalPrice.toLocaleString('ar-IQ', { style: 'currency', currency: 'IQD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              </div>
              <Separator />
              <div className="grid w-full gap-1.5">
                <Label htmlFor="phone">رقم الهاتف للتواصل</Label>
                <div className="relative">
                  <Input
                    id="phone"
                    placeholder="07..."
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="pl-8"
                    dir="ltr"
                  />
                  <span className="absolute left-3 top-2.5 text-muted-foreground text-xs pointer-events-none">
                    IQ
                  </span>
                </div>
              </div>

              <div className="grid w-full gap-1.5">
                <Label htmlFor="notes">ملاحظات الطلب (اختياري)</Label>
                <Textarea
                  id="notes"
                  placeholder="اكتب ملاحظاتك هنا..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                />
              </div>
            </CardContent>
            {renderAuthSensitiveContent()}
          </Card>
        </div>
      </>
    );
  };


  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center">سلة التسوق الخاصة بك</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        {renderCartContent()}
      </div>
    </div>
  );
}
