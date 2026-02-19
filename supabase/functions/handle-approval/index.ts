import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    if (!authHeader) throw new Error("غير مصرح - لم يتم تقديم رمز المصادقة");

    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("غير مصرح");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw new Error("غير مصرح - المدير فقط");

    const { request_id, action } = await req.json();

    // Input validation
    if (!request_id || typeof request_id !== "string") {
      throw new Error("معرف الطلب مطلوب");
    }
    if (!action || !["approved", "rejected"].includes(action)) {
      throw new Error("الإجراء يجب أن يكون 'approved' أو 'rejected'");
    }

    // Get the approval request
    const { data: request, error: reqError } = await adminClient
      .from("approval_requests")
      .select("*")
      .eq("id", request_id)
      .single();
    if (reqError || !request) throw new Error("طلب غير موجود");

    // Update approval request status
    await adminClient
      .from("approval_requests")
      .update({ status: action })
      .eq("id", request_id);

    if (request.session_id) {
      if (action === "approved") {
        await adminClient
          .from("sessions")
          .update({ pending_approval: false, approval_status: "approved", original_data: null })
          .eq("id", request.session_id);
      } else if (action === "rejected" && request.original_data) {
        const rollback: Record<string, unknown> = {
          pending_approval: false,
          approval_status: "rejected",
          original_data: null,
        };
        const orig = request.original_data as Record<string, unknown>;
        if (orig.session_date) rollback.session_date = orig.session_date;
        if (orig.start_time !== undefined) rollback.start_time = orig.start_time;
        if (orig.duration_minutes) rollback.duration_minutes = orig.duration_minutes;
        if (orig.status) rollback.status = orig.status;

        await adminClient
          .from("sessions")
          .update(rollback)
          .eq("id", request.session_id);
      } else {
        await adminClient
          .from("sessions")
          .update({ pending_approval: false, approval_status: "rejected" })
          .eq("id", request.session_id);
      }
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
