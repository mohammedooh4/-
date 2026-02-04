"use client"

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabaseClient } from '@/lib/supabase';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for mock user in localStorage first (or if Supabase is missing)
    const checkUser = () => {
      const mockUserStr = typeof window !== 'undefined' ? localStorage.getItem('mock_user') : null;
      if (mockUserStr) {
        try {
          const mockUser = JSON.parse(mockUserStr);
          setUser(mockUser as User);
          setLoading(false);
          return; // Stop here if we have a mock user
        } catch (e) {
          console.error("Failed to parse mock user", e);
        }
      }

      if (!supabaseClient) {
        setLoading(false);
        return;
      }

      // onAuthStateChange is the single source of truth.
      // It fires once on initial load, and again whenever the auth state changes.
      const { data: authListener } = supabaseClient.auth.onAuthStateChange(
        (event: AuthChangeEvent, session: Session | null) => {
          // If we have a real session, prefer it.
          if (session?.user) {
            setUser(session.user);
          } else {
            // If no real session, check logic again or keep null (unless we want to persist mock check)
            // For simplicity, if Supabase says null, we revert to null OR check mock again?
            // Let's re-check mock user to be safe if user considers themselves logged in via mock
            const currentMock = typeof window !== 'undefined' ? localStorage.getItem('mock_user') : null;
            if (currentMock) {
              setUser(JSON.parse(currentMock));
            } else {
              setUser(null);
            }
          }
          setLoading(false);
        }
      );

      return () => {
        authListener?.subscription.unsubscribe();
      };
    };

    checkUser();
  }, []);

  const value = {
    user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
