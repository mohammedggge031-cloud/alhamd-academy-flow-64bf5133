import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.jpeg";

type LoginMode = "email" | "phone";

const Login = () => {
  const [mode, setMode] = useState<LoginMode>("phone");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "email") {
        const { error } = await signIn(email, password);
        if (error) throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      } else {
        // Login by phone via edge function
        const { data, error } = await supabase.functions.invoke("login-by-phone", {
          body: { phone, password },
        });
        if (error) throw new Error("خطأ في الاتصال");
        if (data?.error) throw new Error(data.error);
        if (data?.session) {
          await supabase.auth.setSession(data.session);
        }
      }
      navigate("/");
    } catch (err: any) {
      toast({
        title: "خطأ في تسجيل الدخول",
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
          <div className="mx-auto">
            <img src={logo} alt="Alhamd Academy" className="h-16 w-16 rounded-xl object-contain mx-auto" />
          </div>
          <div>
            <CardTitle className="text-2xl">أكاديمية الحمد</CardTitle>
            <p className="text-muted-foreground text-sm mt-1">لتحفيظ القرآن الكريم</p>
          </div>
        </CardHeader>
        <CardContent>
          {/* Login mode tabs */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            <Button
              type="button"
              variant={mode === "phone" ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setMode("phone")}
            >
              <Phone className="h-4 w-4" />
              رقم الموبايل
            </Button>
            <Button
              type="button"
              variant={mode === "email" ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setMode("email")}
            >
              <Mail className="h-4 w-4" />
              البريد الإلكتروني
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "email" ? (
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input
                  type="email"
                  placeholder="admin@alhamd.academy"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>رقم الموبايل (الواتساب)</Label>
                <Input
                  type="tel"
                  placeholder="+201001234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>كلمة المرور</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
                required
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={isLoading}>
              <Lock className="h-4 w-4" />
              {isLoading ? "جاري الدخول..." : "تسجيل الدخول"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
