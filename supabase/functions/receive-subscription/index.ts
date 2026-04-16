import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Strip HTML tags and trim */
function sanitize(val: string): string {
  return val.replace(/<[^>]*>/g, "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();

    const fullName = sanitize((body.full_name || body.fullName || "")).slice(0, 200);
    const phone = sanitize((body.phone || "")).slice(0, 30);
    const planName = sanitize((body.plan_name || body.planName || "")).slice(0, 200);

    if (!fullName || fullName.length < 2) {
      return new Response(
        JSON.stringify({ error: "Valid full name is required (2-200 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!phone || phone.length < 6) {
      return new Response(
        JSON.stringify({ error: "Valid phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!planName || planName.length < 1) {
      return new Response(
        JSON.stringify({ error: "Plan name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email = sanitize((body.email || "")).slice(0, 255) || null;
    const planPrice = sanitize((body.plan_price || body.planPrice || "")).slice(0, 100) || null;
    const sessionsPerWeek = sanitize((body.sessions_per_week || body.sessionsPerWeek || "")).slice(0, 100) || null;
    const message = sanitize((body.message || "")).slice(0, 2000) || null;

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Duplicate check: same phone + same plan within 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from("subscription_requests")
      .select("id")
      .eq("phone", phone)
      .eq("plan_name", planName)
      .gte("created_at", since)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ success: true, duplicate: true, message: "Subscription request already received" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabase.from("subscription_requests").insert({
      full_name: fullName,
      email,
      phone,
      plan_name: planName,
      plan_price: planPrice,
      sessions_per_week: sessionsPerWeek,
      message,
      status: "new",
      is_read: false,
    }).select("id").single();

    if (error) {
      console.error("Insert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to save subscription request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id, message: "Subscription request received successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
