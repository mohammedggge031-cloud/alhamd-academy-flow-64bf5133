import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours
const AUTH_INIT_TIMEOUT_MS = 6000;

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

  // Track whether initial session has been resolved
  const initResolvedRef = useRef(false);
  const roleVersionRef = useRef(0);
  const mountedRef = useRef(true);

  const fetchRole = async (userId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        console.warn("Failed to fetch role:", error.message);
        return null;
      }
      return data?.role ?? null;
    } catch {
      return null;
    }
  };

  const finalizeInit = useCallback(() => {
    if (initResolvedRef.current) return;
    initResolvedRef.current = true;
    if (!mountedRef.current) return;
    setIsAuthReady(true);
    setLoading(false);
  }, []);

  const applySession = useCallback(async (nextSession: Session | null) => {
    const version = ++roleVersionRef.current;
    if (!mountedRef.current) return;

    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user) {
      setRole(null);
      return;
    }

    const nextRole = await fetchRole(nextSession.user.id);
    // Stale guard: if another applySession ran after us, discard
    if (!mountedRef.current || version !== roleVersionRef.current) return;
    setRole(nextRole);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    initResolvedRef.current = false;

    // Safety timeout — always become ready eventually
    const safetyTimer = setTimeout(finalizeInit, AUTH_INIT_TIMEOUT_MS);

    // 1. Set up auth listener FIRST (Supabase best practice)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, nextSession) => {
        // For INITIAL_SESSION, let restoreSession handle it to avoid race
        if (event === "INITIAL_SESSION") return;

        // SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.
        await applySession(nextSession);
        finalizeInit();
      }
    );

    // 2. Restore session manually
    const restoreSession = async () => {
      try {
        const isReturning = sessionStorage.getItem("auth_active");

        if (!isReturning) {
          // New browser tab — enforce session-based persistence
          sessionStorage.setItem("auth_active", "1");
          // Sign out quietly without triggering a full state reset
          await supabase.auth.signOut();
          await applySession(null);
          finalizeInit();
          return;
        }

        // Returning session (same tab, page refresh)
        const { data: { session: existing } } = await supabase.auth.getSession();
        await applySession(existing);
      } catch (err) {
        console.warn("Auth restore failed:", err);
        await applySession(null);
      } finally {
        finalizeInit();
      }
    };

    restoreSession();

    return () => {
      mountedRef.current = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [applySession, finalizeInit]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.session) {
      // Mark session active & apply immediately (don't wait for event)
      sessionStorage.setItem("auth_active", "1");
      await applySession(data.session);
    }
    return { error };
  }, [applySession]);

  const signOut = useCallback(async () => {
    try {
      const { queryClient } = await import("@/lib/queryClient");
      queryClient.clear();
    } catch {
      // ignore
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  }, []);

  // ---- Idle timeout ----
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (!user) return;
    sessionStorage.setItem("last_activity", Date.now().toString());
    idleTimer.current = setTimeout(() => {
      console.log("Session expired — idle timeout");
      signOut();
    }, IDLE_TIMEOUT_MS);
  }, [user, signOut]);

  useEffect(() => {
    if (!user) return;

    const lastActivity = sessionStorage.getItem("last_activity");
    if (lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity, 10);
      if (elapsed >= IDLE_TIMEOUT_MS) {
        signOut();
        return;
      }
    }

    const events = ["mousedown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdleTimer));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [user, resetIdleTimer, signOut]);

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
