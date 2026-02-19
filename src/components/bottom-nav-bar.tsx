"use client";

import Link from 'next/link';
import { ShoppingBag, Home, LogOut, LogIn, Package, Tag, Settings, Menu, Loader2 } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { useAuth } from '@/context/auth-context';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabaseClient, getLatestOrderStatusByUserId } from '@/lib/supabase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils';

interface BottomNavBarProps {
  // initialCategories prop is deprecated and no longer used
  initialCategories?: any[];
}

export function BottomNavBar({ initialCategories = [] }: BottomNavBarProps) {
  const { totalItems } = useCart();
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  const [latestOrderStatus, setLatestOrderStatus] = useState<string | null>(null);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Reset navigation state when pathname changes (navigation successful)
  useEffect(() => {
    setNavigatingTo(null);
  }, [pathname]);

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
      const interval = setInterval(fetchOrderStatus, 30000);
      return () => clearInterval(interval);
    }

    if (!user) {
      setLatestOrderStatus(null);
    }
  }, [user, loading]);

  const handleLogout = async () => {
    await supabaseClient?.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleNavClick = (path: string) => {
    if (pathname !== path) {
      setNavigatingTo(path);
    }
  };

  const displayName = user?.user_metadata?.full_name || user?.email;

  const getStatusInfo = () => {
    switch (latestOrderStatus) {
      case 'pending':
        return { color: 'text-orange-500 bg-orange-100 dark:bg-orange-900/20', label: 'قيد الانتظار', icon: Package };
      case 'preparing':
        return { color: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20', label: 'جاري التحضير', icon: Package };
      case 'processing':
        return { color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/20', label: 'جاري التجهيز', icon: Package };
      case 'shipped':
        return { color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/20', label: 'تم الشحن', icon: Package };
      case 'ready':
        return { color: 'text-green-500 bg-green-100 dark:bg-green-900/20', label: 'جاهز للاستلام', icon: Package };
      case 'cancelled':
        return { color: 'text-red-500 bg-red-100 dark:bg-red-900/20', label: 'ملغي', icon: Package };
      default:
        return null;
    }
  };

  const statusInfo = getStatusInfo();

  // Determine active state helper
  const isActive = (path: string) => pathname === path;
  // Category is active if on /categories OR specific category page /category/[id]
  const isCategoryActive = pathname?.startsWith('/categories') || pathname?.startsWith('/category');

  const getNavItemClass = (active: boolean) => {
    return cn(
      "relative p-3 rounded-full transition-all duration-300 ease-out",
      active
        ? "bg-white text-black dark:bg-black dark:text-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)] dark:shadow-[0_0_15px_rgba(0,0,0,0.3)]"
        : "text-white dark:text-black hover:bg-white/10 dark:hover:bg-black/5 hover:scale-105"
    );
  };

  return (
    <>
      <div className="fixed bottom-6 left-4 right-4 z-50">
        <nav className="bg-black/90 dark:bg-white/90 backdrop-blur-xl rounded-full shadow-2xl h-16 px-6 flex items-center justify-between mx-auto max-w-md border border-white/10 dark:border-black/5">
          {/* Home */}
          <Link
            href="/"
            aria-label="الرئيسية"
            className={getNavItemClass(isActive('/'))}
            onClick={() => handleNavClick('/')}
          >
            {navigatingTo === '/' ? <Loader2 className="h-6 w-6 animate-spin" /> : <Home className="h-6 w-6" />}
          </Link>

          {/* Cart */}
          <Link
            href="/cart"
            aria-label="سلة التسوق"
            className={getNavItemClass(isActive('/cart'))}
            onClick={() => handleNavClick('/cart')}
          >
            {navigatingTo === '/cart' ? <Loader2 className="h-6 w-6 animate-spin" /> : <ShoppingBag className="h-6 w-6" />}
            {isClient && totalItems > 0 && (
              <span className={cn(
                "absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center shadow-sm",
                isActive('/cart') && "border border-black dark:border-white"
              )}>
                {totalItems}
              </span>
            )}
          </Link>

          {/* Categories Page Link */}
          <Link
            href="/categories"
            aria-label="الاقسام"
            className={getNavItemClass(!!isCategoryActive)}
            onClick={() => handleNavClick('/categories')}
          >
            {navigatingTo === '/categories' ? <Loader2 className="h-6 w-6 animate-spin" /> : <Tag className="h-6 w-6" />}
          </Link>

          {/* Settings / User Profile (Gear Icon) */}
          {loading ? (
            <div className="w-12 h-12 flex items-center justify-center">
              <div className="w-6 h-6 animate-pulse bg-white/20 rounded-full" />
            </div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={getNavItemClass(false)} aria-label="الاعدادات">
                  <Settings className="h-6 w-6" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" forceMount>
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                  <LogOut className="ml-2 h-4 w-4" />
                  <span>تسجيل الخروج</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/login"
              className={getNavItemClass(isActive('/login'))}
              aria-label="تسجيل الدخول"
              onClick={() => handleNavClick('/login')}
            >
              {navigatingTo === '/login' ? <Loader2 className="h-6 w-6 animate-spin" /> : <LogIn className="h-6 w-6" />}
            </Link>
          )}
        </nav>
      </div>

      {/* Floating Status Indicator (Separate from Nav) */}
      {statusInfo && (
        <div className="fixed bottom-24 left-4 right-4 z-40 flex justify-center pointer-events-none">
          <div className={`pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full shadow-lg ${statusInfo.color} backdrop-blur-sm`}>
            <statusInfo.icon className="h-4 w-4" />
            <span className="text-sm font-bold">{statusInfo.label}</span>
          </div>
        </div>
      )}
    </>
  );
}
