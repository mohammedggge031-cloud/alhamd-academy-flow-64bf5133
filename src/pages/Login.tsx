import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Globe, Eye, EyeOff, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import logo from "@/assets/logo.jpeg";

const isEmailInput = (value: string) => value.includes("@");

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, lang, setLang } = useLanguage();

  const isEmail = useMemo(() => isEmailInput(identifier), [identifier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        const { error } = await signIn(trimmedEmail, password);
        if (error) throw new Error(t("loginInvalidEmail"));
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
      navigate("/");
    } catch (err: any) {
      toast({
        title: t("loginError"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-none shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-end px-2">
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setLang(lang === "en" ? "ar" : "en")}>
              <Globe className="h-3.5 w-3.5" />
              {lang === "en" ? "العربية" : "English"}
            </Button>
          </div>
          <div className="mx-auto">
            <img src={logo} alt="Alhamd Academy" className="h-20 w-20 rounded-xl object-contain mx-auto" />
          </div>
          <div>
            <CardTitle className="text-2xl">{t("academyName")}</CardTitle>
            <p className="text-muted-foreground text-sm mt-1">{t("academySubtitle")}</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("loginIdentifier")}</Label>
              <Input
                type="text"
                placeholder="email@example.com / +201001234567"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                dir="ltr"
                required
                autoComplete="username"
              />
              <p className="text-xs text-muted-foreground">
                {identifier.length > 0
                  ? isEmail ? `📧 ${t("loginDetectedEmail")}` : `📱 ${t("loginDetectedPhone")}`
                  : t("loginIdentifierHint")
                }
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t("loginPassword")}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  dir="ltr"
                  required
                  className="pe-10"
                  autoComplete="current-password"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={isLoading}>
              <LogIn className="h-4 w-4" />
              {isLoading ? t("loginLoading") : t("loginButton")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
