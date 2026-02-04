
"use client";

import Link from 'next/link';
import { ShoppingCart, Home, LogOut, LogIn, UserPlus, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/cart-context';
import { useAuth } from '@/context/auth-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient, getLatestOrderStatusByUserId } from '@/lib/supabase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function BottomNavBar() {
  const { totalItems } = useCart();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [latestOrderStatus, setLatestOrderStatus] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (loading) return;

    const fetchOrderStatus = async () => {
      if (user) {
        const status = await getLatestOrderStatusByUserId(user.id);
        setLatestOrderStatus(status);
      }
    };
    
    if (user) {
      fetchOrderStatus();
    }
    
    if (!user) {
      setLatestOrderStatus(null);
    }
  }, [user, loading]);

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    router.push('/login');
    router.refresh();
  };
  
  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const displayName = user?.user_metadata?.full_name || user?.email;

  const getStatusInfo = () => {
    switch (latestOrderStatus) {
      case 'pending':
        return { color: 'text-orange-500', label: 'الطلب قيد الانتظار' };
      case 'preparing':
        return { color: 'text-yellow-500', label: 'الطلب قيد التحضير' };
      case 'processing':
        return { color: 'text-blue-500', label: 'الطلب قيد التجهيز' };
      case 'shipped':
        return { color: 'text-purple-500', label: 'تم شحن الطلب' };
      case 'ready':
        return { color: 'text-green-500', label: 'الطلب جاهز' };
      case 'cancelled':
        return { color: 'text-red-500', label: 'الطلب ملغي' };
      default:
        return { color: 'text-muted-foreground/50', label: 'لا توجد طلبات حالية' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <header className="bg-background/80 backdrop-blur-sm fixed bottom-0 left-0 right-0 z-40 border-t">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link href="/" className="font-headline text-2xl font-bold text-primary hidden sm:inline-block">
            اسواق سجاد
          </Link>
          <Button variant="ghost" size="icon" asChild className="sm:hidden">
            <Link href="/" aria-label="الرئيسية">
              <Home className="h-5 w-5" />
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/cart" aria-label="سلة التسوق">
              <div className="relative">
                <ShoppingCart className="h-6 w-6" />
                {isClient && totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full h-5 w-5 text-xs flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </div>
            </Link>
          </Button>
          
          {loading ? null : user ? (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Package className={`h-6 w-6 transition-colors duration-300 ${statusInfo.color}`} />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{statusInfo.label}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                       <AvatarFallback>{getInitials(user.user_metadata?.full_name)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">مرحباً</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {displayName}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="ml-2 h-4 w-4" />
                    <span>تسجيل الخروج</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
               <Button asChild className="hidden sm:inline-flex">
                <Link href="/login" prefetch={false}>
                  <LogIn className="h-4 w-4 ml-2" />
                  تسجيل الدخول
                </Link>
              </Button>
               <Button variant="outline" asChild className="hidden sm:inline-flex">
                <Link href="/signup" prefetch={false}>
                  <UserPlus className="h-4 w-4 ml-2" />
                  إنشاء حساب
                </Link>
              </Button>
               <Button variant="ghost" size="icon" asChild className="sm:hidden">
                 <Link href="/login" aria-label="تسجيل الدخول" prefetch={false}>
                   <LogIn className="h-5 w-5" />
                 </Link>
               </Button>
               <Button variant="ghost" size="icon" asChild className="sm:hidden">
                 <Link href="/signup" aria-label="إنشاء حساب" prefetch={false}>
                    <UserPlus className="h-5 w-5" />
                 </Link>
               </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
