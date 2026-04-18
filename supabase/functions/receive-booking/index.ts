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

    const email = sanitize((body.email || "")).slice(0, 255) || null;
    const courseInterest = sanitize((body.course_interest || body.courseInterest || "")).slice(0, 200) || null;
    const preferredDate = body.preferred_date || body.preferredDate || null;
    const preferredTime = sanitize((body.preferred_time || body.preferredTime || "")).slice(0, 100) || null;
    const timezone = sanitize((body.timezone || "")).slice(0, 100) || null;
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

    // Rate limit: max 3 bookings per phone within 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existing, count } = await supabase
      .from("trial_bookings")
      .select("id", { count: "exact" })
      .eq("phone", phone)
      .gte("created_at", since);

    const recentCount = count ?? (existing?.length ?? 0);
    if (recentCount >= 3) {
      return new Response(
        JSON.stringify({
          success: false,
          rate_limited: true,
          message: "Maximum 3 bookings per phone number within 24 hours. Please try again later.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabase.from("trial_bookings").insert({
      full_name: fullName,
      email,
      phone,
      course_interest: courseInterest,
      preferred_date: preferredDate,
      preferred_time: preferredTime,
      timezone,
      message,
      status: "new",
      is_read: false,
    }).select("id").single();

    if (error) {
      console.error("Insert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to save booking" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id, message: "Booking received successfully" }),
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
