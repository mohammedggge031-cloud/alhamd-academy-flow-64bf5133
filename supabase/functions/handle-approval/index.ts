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
    const authHeader = req.headers.get("Authorization")!;
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

    const { request_id, action } = await req.json(); // action: 'approved' | 'rejected'

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
        // Keep the changes, clear pending status
        await adminClient
          .from("sessions")
          .update({ pending_approval: false, approval_status: "approved", original_data: null })
          .eq("id", request.session_id);
      } else if (action === "rejected" && request.original_data) {
        // Rollback to original data
        const rollback: any = {
          pending_approval: false,
          approval_status: "rejected",
          original_data: null,
        };
        // Restore original fields
        const orig = request.original_data;
        if (orig.session_date) rollback.session_date = orig.session_date;
        if (orig.start_time !== undefined) rollback.start_time = orig.start_time;
        if (orig.duration_minutes) rollback.duration_minutes = orig.duration_minutes;
        if (orig.status) rollback.status = orig.status;

        await adminClient
          .from("sessions")
          .update(rollback)
          .eq("id", request.session_id);
      } else {
        // Rejected but no original data, just clear pending
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
