import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

    const fullName = (body.full_name || body.fullName || "").trim();
    const phone = (body.phone || "").trim();
    const planName = (body.plan_name || body.planName || "").trim();

    if (!fullName || fullName.length < 2 || fullName.length > 200) {
      return new Response(
        JSON.stringify({ error: "Valid full name is required (2-200 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!phone || phone.length < 6 || phone.length > 30) {
      return new Response(
        JSON.stringify({ error: "Valid phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!planName || planName.length < 1 || planName.length > 200) {
      return new Response(
        JSON.stringify({ error: "Plan name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email = (body.email || "").trim().slice(0, 255) || null;
    const planPrice = (body.plan_price || body.planPrice || "").trim().slice(0, 100) || null;
    const sessionsPerWeek = (body.sessions_per_week || body.sessionsPerWeek || "").trim().slice(0, 100) || null;
    const message = (body.message || "").trim().slice(0, 2000) || null;

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

    console.log("New subscription request received:", data.id);

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
