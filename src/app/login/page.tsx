"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if (!supabaseClient) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Supabase client not initialized",
      });
      setLoading(false);
      return;
    }

    let authPromise;
    const input = emailOrPhone.trim();

    // Detect email if contains '@', otherwise treat as phone
    const isEmail = /@/.test(input);
    const isPhone = !isEmail;

    if (isPhone) {
      // Simple formatting for Iraq (example): 07... -> +9647...
      // If it starts with '07', replace '0' with '+964'
      let phone = input;
      if (phone.startsWith('07')) {
        phone = phone.replace(/^0/, '+964');
      }
      // If user didn't add country code, you might want to force it or leave as is
      // For now, assuming user or this simple logic handles it.

      authPromise = supabaseClient.auth.signInWithPassword({
        phone: phone,
        password: password,
      });
    } else {
      authPromise = supabaseClient.auth.signInWithPassword({
        email: input,
        password: password,
      });
    }

    const { error } = await authPromise;

    if (error) {
      console.warn("Supabase auth failed, falling back to mock auth:", error.message);

      // Fallback to Mock Auth: CHECK LOCAL DB
      const storedUsers = localStorage.getItem('mock_users_db');
      const usersDb = storedUsers ? JSON.parse(storedUsers) : [];

      const foundUser = usersDb.find((u: any) => {
        const matches = isPhone ? (u.phone === input) : (u.email === input);
        return matches && u.password === password;
      });

      if (foundUser) {
        // Verify success
        console.log("Mock login successful");
        const sessionUser = { ...foundUser };
        delete sessionUser.password;

        localStorage.setItem('mock_user', JSON.stringify(sessionUser));

        toast({
          title: "تم تسجيل الدخول",
          description: `مرحباً بك، ${foundUser.user_metadata?.full_name || 'زائر'} (وضع محاكاة)`,
        });

        // استخدم التوجيه الخاص بـ Next لتجنّب net::ERR_ABORTED
        router.replace('/');
        return;
      } else {
        // Verify Failed
        toast({
          variant: "destructive",
          title: "خطأ في تسجيل الدخول",
          description: "بيانات الدخول غير صحيحة أو الحساب غير موجود (تأكد من إنشاء حساب أولاً).",
        });
        setLoading(false);
        return;
      }
      return;
    }

    setLoading(false);
    if (!error) {
      toast({
        title: "تم بنجاح",
        description: "تم تسجيل دخولك بنجاح.",
      });
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] bg-background">
      <Card className="w-full max-w-sm mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
          <CardDescription>أدخل بريدك الإلكتروني أو رقم هاتفك لتسجيل الدخول</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">البريد الإلكتروني أو الهاتف</Label>
              <Input
                id="email"
                type="text"
                placeholder="077... أو m@example.com"
                required
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              تسجيل الدخول
            </Button>
            <div className="text-center text-sm">
              ليس لديك حساب؟{' '}
              <Link href="/signup" className="underline text-primary">
                إنشاء حساب
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
