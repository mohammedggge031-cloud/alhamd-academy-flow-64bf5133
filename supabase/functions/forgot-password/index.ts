import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { identifier } = await req.json();
    if (!identifier || typeof identifier !== "string" || identifier.trim().length < 3) {
      throw new Error("يرجى إدخال رقم الهاتف أو البريد الإلكتروني");
    }

    const trimmed = identifier.trim();
    const isEmail = trimmed.includes("@");

    let userEmail = "";
    let userName = "";
    let userPhone = trimmed;

    if (isEmail) {
      // Find user by email
      const { data: users } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const found = users?.users?.find((u: any) => u.email?.toLowerCase() === trimmed.toLowerCase());
      if (!found) {
        // Don't reveal if user exists - just return success
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userEmail = found.email || "";
      userPhone = found.phone || trimmed;

      const { data: profile } = await adminClient
        .from("profiles")
        .select("full_name")
        .eq("user_id", found.id)
        .maybeSingle();
      userName = profile?.full_name || userEmail;
    } else {
      // Find user by phone (look in teacher emails pattern or phone)
      const sanitizedPhone = trimmed.replace(/[^0-9+]/g, "");
      const possibleEmail = `teacher_${sanitizedPhone.replace("+", "")}@alhamdacademy.net`;

      const { data: users } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const found = users?.users?.find(
        (u: any) => u.email?.toLowerCase() === possibleEmail.toLowerCase() || u.phone === sanitizedPhone
      );
      if (!found) {
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userEmail = found.email || "";
      userPhone = sanitizedPhone;

      const { data: profile } = await adminClient
        .from("profiles")
        .select("full_name")
        .eq("user_id", found.id)
        .maybeSingle();
      userName = profile?.full_name || sanitizedPhone;
    }

    // Send notification to all admins and managers
    const { data: adminManagerRoles } = await adminClient
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "manager"]);

    if (adminManagerRoles && adminManagerRoles.length > 0) {
      const groupId = crypto.randomUUID();
      const notifications = adminManagerRoles.map((r: any) => ({
        user_id: r.user_id,
        type: "password_reset_request",
        title: `طلب إعادة تعيين كلمة المرور`,
        body: `${userName} (${isEmail ? userEmail : userPhone}) يطلب إعادة تعيين كلمة المرور`,
        group_id: groupId,
        metadata: {
          requester_name: userName,
          requester_identifier: isEmail ? userEmail : userPhone,
          is_email: isEmail,
        },
      }));

      await adminClient.from("notifications").insert(notifications);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});