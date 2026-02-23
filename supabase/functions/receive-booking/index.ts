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

    // Validate required fields
    const fullName = (body.full_name || body.fullName || "").trim();
    const phone = (body.phone || "").trim();

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

    // Sanitize optional fields
    const email = (body.email || "").trim().slice(0, 255) || null;
    const courseInterest = (body.course_interest || body.courseInterest || "").trim().slice(0, 200) || null;
    const preferredDate = body.preferred_date || body.preferredDate || null;
    const preferredTime = (body.preferred_time || body.preferredTime || "").trim().slice(0, 100) || null;
    const timezone = (body.timezone || "").trim().slice(0, 100) || null;
    const message = (body.message || "").trim().slice(0, 2000) || null;

    // Email validation if provided
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

    console.log("New trial booking received:", data.id);

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
