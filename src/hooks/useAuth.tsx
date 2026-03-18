import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      setRole(data?.role ?? null);
    } catch {
      console.warn("Failed to fetch role, defaulting to null");
      setRole(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Safety timeout — never stay loading forever
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 5000);

    // 1) Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          await fetchRole(newSession.user.id);
        } else {
          setRole(null);
        }
        if (mounted) setLoading(false);
      }
    );

    // 2) Then check current session
    const isReturningSession = sessionStorage.getItem("auth_active");

    if (!isReturningSession) {
      // New browser session — clear any persisted auth from localStorage
      sessionStorage.setItem("auth_active", "1");
      supabase.auth.signOut().catch(() => {}).finally(() => {
        // onAuthStateChange will fire with null and set loading=false
        // but just in case, ensure loading stops
        if (mounted) setLoading(false);
      });
    } else {
      // Returning tab/refresh — load existing session
      supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
        if (!mounted) return;
        setSession(existingSession);
        setUser(existingSession?.user ?? null);
        if (existingSession?.user) {
          await fetchRole(existingSession.user.id);
        }
        if (mounted) setLoading(false);
      }).catch(() => {
        if (mounted) setLoading(false);
      });
    }

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
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
