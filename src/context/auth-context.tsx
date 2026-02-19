"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabase";
import { initPushNotifications, removePushNotificationToken, showInAppNotification } from "@/lib/push-notifications";

const statusLabels: Record<string, string> = {
    pending: 'في الانتظار',
    confirmed: 'مؤكد',
    preparing: 'قيد التحضير',
    ready: 'جاهز للاستلام',
    delivered: 'تم التسليم',
    cancelled: 'ملغى',
};

interface AuthContextType {
    user: User | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        if (!supabaseClient) {
            setLoading(false);
            return;
        }

        // Get initial session
        supabaseClient.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);

            // Initialize push notifications if user is logged in
            if (session?.user) {
                initPushNotifications(session.user.id);
            }
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabaseClient.auth.onAuthStateChange((event, session) => {
            console.log('Auth state change event:', event);
            setUser(session?.user ?? null);
            setLoading(false);

            // Initialize/re-initialize push notifications on login or initial session
            if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
                console.log('Initializing push notifications for user:', session.user.id);
                initPushNotifications(session.user.id);
            }

            // Cleanup on logout
            if (event === 'SIGNED_OUT') {
                removePushNotificationToken();
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Supabase Realtime: Listen for order status changes
    useEffect(() => {
        if (!supabaseClient || !user) return;

        const channel = supabaseClient
            .channel('order-status-changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const newStatus = payload.new?.status;
                    const oldStatus = payload.old?.status;

                    // Only show notification when status actually changed
                    if (newStatus && newStatus !== oldStatus) {
                        const statusLabel = statusLabels[newStatus] || newStatus;
                        const orderId = (payload.new?.id || '').slice(0, 8);

                        showInAppNotification(
                            `📦 تحديث طلبك #${orderId}`,
                            `حالة طلبك تغيرت إلى: ${statusLabel}`,
                            'order'
                        );
                    }
                }
            )
            .subscribe();

        return () => {
            supabaseClient?.removeChannel(channel);
        };
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
