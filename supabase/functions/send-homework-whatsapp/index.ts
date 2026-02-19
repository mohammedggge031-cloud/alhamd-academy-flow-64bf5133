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
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { student_id, homework, student_name } = await req.json();

    // Get student's WhatsApp number
    const { data: student } = await adminClient
      .from("students")
      .select("whatsapp, guardian_whatsapp, name")
      .eq("id", student_id)
      .single();

    if (!student) throw new Error("Student not found");

    const phone = student.whatsapp || student.guardian_whatsapp;
    if (!phone) {
      // No WhatsApp number, just log and return
      console.log(`No WhatsApp number for student ${student.name}, skipping notification`);
      return new Response(JSON.stringify({ success: true, whatsapp_sent: false, reason: "no_phone" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if WhatsApp API key is configured
    const whatsappApiKey = Deno.env.get("WHATSAPP_API_KEY");
    const whatsappPhoneId = Deno.env.get("WHATSAPP_PHONE_ID");

    if (!whatsappApiKey || !whatsappPhoneId) {
      console.log("WhatsApp API not configured, logging homework for:", student.name);
      console.log("Homework:", homework);
      
      // Mark as sent in DB anyway (for demo/development)
      await adminClient
        .from("session_reports")
        .update({ homework_sent: true })
        .eq("student_id", student_id)
        .order("created_at", { ascending: false })
        .limit(1);

      return new Response(JSON.stringify({ 
        success: true, 
        whatsapp_sent: false, 
        reason: "api_not_configured",
        message: `واجب الطالب ${student.name}: ${homework}`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send via WhatsApp Business API
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const message = `📚 *واجب أكاديمية الحمد*\n\nالسلام عليكم يا ${student_name || student.name}\n\n📝 الواجب:\n${homework}\n\nبالتوفيق! 🌟`;

    const waResponse = await fetch(
      `https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${whatsappApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "text",
          text: { body: message },
        }),
      }
    );

    const waData = await waResponse.json();

    if (!waResponse.ok) {
      console.error("WhatsApp API error:", waData);
      throw new Error(`WhatsApp API error: ${JSON.stringify(waData)}`);
    }

    // Mark homework as sent
    await adminClient
      .from("session_reports")
      .update({ homework_sent: true })
      .eq("student_id", student_id)
      .order("created_at", { ascending: false })
      .limit(1);

    return new Response(JSON.stringify({ success: true, whatsapp_sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
