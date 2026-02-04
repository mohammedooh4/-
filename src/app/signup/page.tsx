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

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if (!supabaseClient) {
      toast({ variant: "destructive", title: "Error", description: "Supabase not initialized" });
      setLoading(false);
      return;
    }

    const input = emailOrPhone.trim();
    const isPhone = /^[0-9+]/.test(input);

    let result;

    if (isPhone) {
      let phone = input;
      if (phone.startsWith('07')) {
        phone = phone.replace(/^0/, '+964');
      }

      result = await supabaseClient.auth.signUp({
        phone: phone,
        password: password,
        options: { data: { full_name: fullName } }
      });
    } else {
      result = await supabaseClient.auth.signUp({
        email: input,
        password: password,
        options: { data: { full_name: fullName } }
      });
    }

    const { data, error } = result;

    if (error || (data.user && data.user.identities?.length === 0)) {
      console.warn("Supabase signup failed/exists, falling back to mock auth:", error?.message);

      // Mock User Creation
      const mockUser = {
        id: crypto.randomUUID(),
        email: isPhone ? undefined : input,
        phone: isPhone ? input : undefined,
        password: password, // Store password for mock auth check
        user_metadata: { full_name: fullName },
        created_at: new Date().toISOString(),
        aud: 'authenticated',
        role: 'authenticated',
        app_metadata: { provider: isPhone ? 'phone' : 'email' },
      };

      // Save to local "database" of users
      const storedUsers = localStorage.getItem('mock_users_db');
      const usersDb = storedUsers ? JSON.parse(storedUsers) : [];

      // Remove password from session object but keep in DB
      const sessionUser = { ...mockUser };
      delete (sessionUser as any).password;

      usersDb.push(mockUser);
      localStorage.setItem('mock_users_db', JSON.stringify(usersDb));

      // Set current session
      localStorage.setItem('mock_user', JSON.stringify(sessionUser));

      toast({
        title: "تم إنشاء الحساب",
        description: "تم إنشاء حسابك وتسجيل الدخول (وضع محاكاة).",
      });

      // استخدم التوجيه الخاص بـ Next لتفادي net::ERR_ABORTED
      router.replace('/');
      return;
    }

    setLoading(false);

    // Success path (real auth)
    if (data.user) {
      toast({
        title: "✅ تم الإنشاء بنجاح",
        description: isPhone ? "تم إنشاء حسابك برقم الهاتف." : "تم إنشاء حسابك. يرجى التحقق من بريدك الإلكتروني.",
      });
      router.push('/login');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] bg-background">
      <Card className="w-full max-w-sm mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">إنشاء حساب</CardTitle>
          <CardDescription>أدخل معلوماتك لإنشاء حساب جديد</CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="full-name">الاسم الكامل</Label>
              <Input
                id="full-name"
                type="text"
                placeholder="الاسم الكامل"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">البريد الإلكتروني أو الهاتف</Label>
              <Input
                id="email"
                type="text"
                placeholder="077... أو m@example.com"
                required
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                placeholder="******"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              إنشاء حساب
            </Button>
            <div className="text-center text-sm">
              لديك حساب بالفعل؟{' '}
              <Link href="/login" className="underline text-primary">
                تسجيل الدخول
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
