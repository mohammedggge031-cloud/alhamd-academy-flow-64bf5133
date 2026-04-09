import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: string | null;
  loading: boolean;
  isAuthReady: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const fetchRole = async (userId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.warn("Failed to fetch role, defaulting to null", error);
        return null;
      }

      return data?.role ?? null;
    } catch (error) {
      console.warn("Failed to fetch role, defaulting to null", error);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    let roleRequestVersion = 0;

    const finalizeAuthInit = () => {
      if (!mounted) return;
      setIsAuthReady(true);
      setLoading(false);
    };

    const applyAuthState = async (nextSession: Session | null) => {
      const currentRoleRequest = ++roleRequestVersion;

      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setRole(null);
        return;
      }

      const nextRole = await fetchRole(nextSession.user.id);
      if (!mounted || currentRoleRequest !== roleRequestVersion) return;
      setRole(nextRole);
    };

    const safetyTimer = setTimeout(() => {
      finalizeAuthInit();
    }, 6000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applyAuthState(nextSession);
      finalizeAuthInit();
    });

    const restoreSession = async () => {
      try {
        const isReturningSession = sessionStorage.getItem("auth_active");

        if (!isReturningSession) {
          sessionStorage.setItem("auth_active", "1");
          await supabase.auth.signOut();
          await applyAuthState(null);
          return;
        }

        const { data: { session: existingSession } } = await supabase.auth.getSession();
        await applyAuthState(existingSession);
      } catch (error) {
        console.warn("Auth initialization failed", error);
        await applyAuthState(null);
      } finally {
        finalizeAuthInit();
      }
    };

    void restoreSession();

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    // Clear all cached data BEFORE signing out to prevent data leakage
    try {
      const { queryClient } = await import("@/App");
      queryClient.clear();
    } catch (e) {
      console.warn("Failed to clear query cache:", e);
    }
    
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, isAuthReady, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
