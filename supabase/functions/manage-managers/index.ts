import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRIMARY_ADMIN_EMAIL = "info@alhamdacademy.net";

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

    // Check caller role
    const { data: callerRoleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .in("role", ["admin"])
      .maybeSingle();

    if (!callerRoleData) throw new Error("المدير فقط يمكنه إدارة الحسابات");

    const body = await req.json();
    const { action, email, password, full_name, manager_user_id, dot_color, role: targetRole, target_user_id, new_password } = body;

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

      const assignRole = targetRole === "admin" ? "admin" : "manager";

      // Create user
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name.trim() },
      });
      if (createError) throw createError;

      const userId = newUser.user.id;

      // Assign role
      await adminClient.from("user_roles").insert({ user_id: userId, role: assignRole });

      // Set dot_color if provided
      if (dot_color) {
        await adminClient.from("profiles").update({ dot_color }).eq("user_id", userId);
      }

      return new Response(JSON.stringify({ success: true, user_id: userId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "list") {
      // List all managers AND admins (except primary admin - they see themselves)
      const { data: allRoles } = await adminClient
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["manager", "admin"]);

      if (!allRoles || allRoles.length === 0) {
        return new Response(JSON.stringify({ managers: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userIds = allRoles.map((m: any) => m.user_id);
      const roleMap = Object.fromEntries(allRoles.map((m: any) => [m.user_id, m.role]));

      const { data: profiles } = await adminClient
        .from("profiles")
        .select("user_id, full_name, dot_color")
        .in("user_id", userIds);

      const result = [];
      for (const profile of (profiles || [])) {
        const { data: userData } = await adminClient.auth.admin.getUserById(profile.user_id);
        const userEmail = userData?.user?.email || "";
        result.push({
          user_id: profile.user_id,
          full_name: profile.full_name,
          email: userEmail,
          dot_color: profile.dot_color || null,
          role: roleMap[profile.user_id] || "manager",
          is_primary: userEmail.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase(),
        });
      }

      // Sort: primary admin first, then admins, then managers
      result.sort((a, b) => {
        if (a.is_primary) return -1;
        if (b.is_primary) return 1;
        if (a.role === "admin" && b.role !== "admin") return -1;
        if (b.role === "admin" && a.role !== "admin") return 1;
        return 0;
      });

      return new Response(JSON.stringify({ managers: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "update_color") {
      if (!manager_user_id || !dot_color) throw new Error("معرف المستخدم واللون مطلوبان");
      
      await adminClient.from("profiles").update({ dot_color }).eq("user_id", manager_user_id);
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "delete") {
      if (!manager_user_id) throw new Error("معرف المستخدم مطلوب");

      // Check if target is the primary admin
      const { data: targetUser } = await adminClient.auth.admin.getUserById(manager_user_id);
      if (targetUser?.user?.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
        throw new Error("لا يمكن حذف حساب المدير الرئيسي");
      }

      // Cannot delete yourself
      if (manager_user_id === callerId) {
        throw new Error("لا يمكنك حذف حسابك الخاص");
      }

      // Verify target is manager or admin (not teacher via this route)
      const { data: targetRoleData } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", manager_user_id)
        .in("role", ["manager", "admin"])
        .maybeSingle();

      if (!targetRoleData) throw new Error("هذا المستخدم ليس مشرفاً أو مديراً");

      // Delete user (cascades)
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(manager_user_id);
      if (deleteError) throw deleteError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "reset_password") {
      // Only primary admin can reset others' passwords; other admins can only change their own
      if (!target_user_id || !new_password) throw new Error("معرف المستخدم وكلمة المرور الجديدة مطلوبان");
      if (typeof new_password !== "string" || new_password.length < 8 || new_password.length > 128) {
        throw new Error("كلمة المرور يجب أن تكون بين 8 و 128 حرف");
      }

      // Get caller email to check if primary admin
      const { data: callerUser } = await adminClient.auth.admin.getUserById(callerId);
      const callerEmail = callerUser?.user?.email?.toLowerCase() || "";
      const isPrimaryAdmin = callerEmail === PRIMARY_ADMIN_EMAIL.toLowerCase();

      if (target_user_id !== callerId && !isPrimaryAdmin) {
        throw new Error("المدير الرئيسي فقط يمكنه إعادة تعيين كلمات المرور للآخرين");
      }

      const { error: updateError } = await adminClient.auth.admin.updateUserById(target_user_id, {
        password: new_password,
      });
      if (updateError) throw updateError;

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