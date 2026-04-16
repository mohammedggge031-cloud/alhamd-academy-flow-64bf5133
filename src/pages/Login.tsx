import { useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Globe, Eye, EyeOff, LogIn, Loader2, HelpCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { markAuthSessionActive } from "@/lib/authSession";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import logo from "@/assets/logo.jpeg";

const isEmailInput = (value: string) => value.includes("@");

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const attemptsRef = useRef(0);
  const navigate = useNavigate();
  const { t, lang, setLang } = useLanguage();

  // Forgot password state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const isEmail = useMemo(() => isEmailInput(identifier), [identifier]);
  const isLockedOut = lockoutUntil !== null && Date.now() < lockoutUntil;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (isLockedOut) {
      const remaining = Math.ceil(((lockoutUntil ?? 0) - Date.now()) / 1000);
      const msg = `${t("tooManyAttempts")} ${remaining}s`;
      setLoginError(msg);
      toast.error(t("loginError"), { description: msg, duration: 8000 });
      return;
    }

    setIsLoading(true);

    try {
      if (!password || password.length > 128) {
        throw new Error(t("loginInvalidEmail"));
      }

      if (isEmail) {
        const trimmedEmail = identifier.trim().toLowerCase();
        if (!trimmedEmail || trimmedEmail.length > 255) {
          throw new Error(t("loginInvalidEmail"));
        }
        const { data, error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
        if (error || !data.session) throw new Error(t("loginInvalidEmail"));
      } else {
        const sanitizedPhone = identifier.replace(/[^0-9+]/g, "");
        if (!sanitizedPhone || sanitizedPhone.length < 8 || sanitizedPhone.length > 20) {
          throw new Error(t("loginInvalidEmail"));
        }
        const { data, error } = await supabase.functions.invoke("login-by-phone", {
          body: { phone: sanitizedPhone, password },
        });
        if (error) throw new Error(t("loginConnectionError"));
        if (data?.error) throw new Error(data.error);
        if (data?.session) {
          await supabase.auth.setSession(data.session);
        }
      }

      markAuthSessionActive();
      attemptsRef.current = 0;

      await new Promise((r) => setTimeout(r, 150));
      navigate("/");
    } catch (err: any) {
      attemptsRef.current += 1;
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setLockoutUntil(Date.now() + LOCKOUT_MS);
        attemptsRef.current = 0;
        setTimeout(() => setLockoutUntil(null), LOCKOUT_MS);
      }

      setLoginError(err.message);
      toast.error(t("loginError"), { description: err.message, duration: 8000 });
    } finally {
      setIsLoading(false);
    }
  }, [identifier, password, isEmail, isLockedOut, lockoutUntil, navigate, t]);

  const handleForgotPassword = async () => {
    if (!forgotIdentifier.trim()) return;
    setForgotLoading(true);
    try {
      const { error } = await supabase.functions.invoke("forgot-password", {
        body: { identifier: forgotIdentifier.trim() },
      });
      if (error) throw error;
      toast.success(t("success"), { description: t("forgotPasswordSent"), duration: 6000 });
      setForgotOpen(false);
      setForgotIdentifier("");
    } catch (err: any) {
      toast.error(t("error"), { description: err.message, duration: 8000 });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-72 h-72 bg-primary-foreground rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary-foreground rounded-full translate-x-1/3 translate-y-1/3" />
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-primary-foreground rounded-full -translate-x-1/2 -translate-y-1/2" />
      </div>

      <Card className="w-full max-w-md border border-primary-foreground/10 shadow-2xl bg-card/95 backdrop-blur-sm relative z-10">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-end px-2">
            <Button variant="outline" size="sm" className="gap-1 text-xs border-border hover:bg-accent" onClick={() => setLang(lang === "en" ? "ar" : "en")}>
              <Globe className="h-3.5 w-3.5" />
              {lang === "en" ? "العربية" : "English"}
            </Button>
          </div>
          <div className="mx-auto bg-primary rounded-2xl p-3 shadow-lg">
            <img src={logo} alt="Alhamd Academy" className="h-16 w-16 rounded-xl object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl text-foreground">{t("academyName")}</CardTitle>
            <p className="text-muted-foreground text-sm mt-1">{t("academySubtitle")}</p>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <div className="w-12 h-1 bg-primary rounded-full mx-auto mb-6" />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground font-medium">{t("loginIdentifier")}</Label>
              <Input
                type="text" placeholder="+201001234567" value={identifier}
                onChange={(e) => { setIdentifier(e.target.value); setLoginError(null); }} dir="ltr" required autoComplete="username"
                className="border-input bg-background focus-visible:ring-primary h-11"
              />
              <p className="text-xs text-muted-foreground">
                {identifier.length > 0 ? isEmail ? `📧 ${t("loginDetectedEmail")}` : `📱 ${t("loginDetectedPhone")}` : t("loginPhoneDefault")}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground font-medium">{t("loginPassword")}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"} placeholder="••••••••" value={password}
                  onChange={(e) => { setPassword(e.target.value); setLoginError(null); }} dir="ltr" required
                  className="pe-10 border-input bg-background focus-visible:ring-primary h-11" autoComplete="current-password"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {/* Inline error message - persistent */}
            {loginError && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}
            {isLockedOut && (
              <p className="text-xs text-destructive text-center animate-pulse">{t("tooManyAttempts")}</p>
            )}
            <Button type="submit" className="w-full gap-2 h-11 text-base bg-primary hover:bg-primary/90 shadow-md" disabled={isLoading || isLockedOut}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {isLoading ? t("loginLoading") : t("loginButton")}
            </Button>
          </form>

          {/* Forgot Password Link */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline inline-flex items-center gap-1"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              {t("forgotPassword")}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("forgotPassword")}</DialogTitle>
            <DialogDescription>{t("forgotPasswordDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>{t("forgotPasswordIdentifier")}</Label>
              <Input
                type="text"
                dir="ltr"
                value={forgotIdentifier}
                onChange={(e) => setForgotIdentifier(e.target.value)}
                placeholder="+201001234567 أو email@example.com"
              />
            </div>
            <Button
              className="w-full gap-2"
              onClick={handleForgotPassword}
              disabled={forgotLoading || !forgotIdentifier.trim()}
            >
              {forgotLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("sendRequest")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;