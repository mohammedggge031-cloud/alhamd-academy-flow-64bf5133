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

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("غير مصرح");
    }

    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error("غير مصرح");

    const callerId = claimsData.claims.sub as string;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Only admin can manage managers
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) throw new Error("المدير الرئيسي فقط يمكنه إدارة المشرفين");

    const { action, email, password, full_name, manager_user_id, dot_color } = await req.json();

    if (action === "create") {
      // Validate inputs
      if (!email || typeof email !== "string" || !email.includes("@") || email.length > 255) {
        throw new Error("بريد إلكتروني غير صالح");
      }
      if (!password || typeof password !== "string" || password.length < 8 || password.length > 128) {
        throw new Error("كلمة المرور يجب أن تكون بين 8 و 128 حرف");
      }
      if (!full_name || typeof full_name !== "string" || full_name.trim().length === 0) {
        throw new Error("الاسم مطلوب");
      }

      // Create user
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name.trim() },
      });
      if (createError) throw createError;

      const userId = newUser.user.id;

      // Assign manager role
      await adminClient.from("user_roles").insert({ user_id: userId, role: "manager" });

      // Set dot_color if provided
      if (dot_color) {
        await adminClient.from("profiles").update({ dot_color }).eq("user_id", userId);
      }

      return new Response(JSON.stringify({ success: true, user_id: userId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "list") {
      // List all managers
      const { data: managers } = await adminClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "manager");

      if (!managers || managers.length === 0) {
        return new Response(JSON.stringify({ managers: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const managerIds = managers.map((m: any) => m.user_id);
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("user_id, full_name, dot_color")
        .in("user_id", managerIds);

      // Get emails from auth
      const result = [];
      for (const profile of (profiles || [])) {
        const { data: userData } = await adminClient.auth.admin.getUserById(profile.user_id);
        result.push({
          user_id: profile.user_id,
          full_name: profile.full_name,
          email: userData?.user?.email || "",
          dot_color: profile.dot_color || null,
        });
      }

      return new Response(JSON.stringify({ managers: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "update_color") {
      if (!manager_user_id || !dot_color) throw new Error("معرف المشرف واللون مطلوبان");
      
      await adminClient.from("profiles").update({ dot_color }).eq("user_id", manager_user_id);
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "delete") {
      if (!manager_user_id) throw new Error("معرف المشرف مطلوب");

      // Verify target is actually a manager
      const { data: targetRole } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", manager_user_id)
        .eq("role", "manager")
        .maybeSingle();

      if (!targetRole) throw new Error("هذا المستخدم ليس مشرفاً");

      // Delete user (cascades to user_roles and profiles)
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(manager_user_id);
      if (deleteError) throw deleteError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      throw new Error("إجراء غير صالح");
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
