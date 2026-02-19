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

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("غير مصرح");

    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("غير مصرح");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { student_id, homework, student_name } = await req.json();

    // Input validation
    if (!student_id || typeof student_id !== "string") {
      throw new Error("معرف الطالب مطلوب");
    }
    if (!homework || typeof homework !== "string" || homework.length > 2000) {
      throw new Error("الواجب مطلوب ويجب أن يكون أقل من 2000 حرف");
    }

    // Get student's WhatsApp number
    const { data: student } = await adminClient
      .from("students")
      .select("whatsapp, guardian_whatsapp, name")
      .eq("id", student_id)
      .single();

    if (!student) throw new Error("الطالب غير موجود");

    const phone = student.whatsapp || student.guardian_whatsapp;
    if (!phone) {
      return new Response(JSON.stringify({ success: true, whatsapp_sent: false, reason: "no_phone" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const whatsappApiKey = Deno.env.get("WHATSAPP_API_KEY");
    const whatsappPhoneId = Deno.env.get("WHATSAPP_PHONE_ID");

    if (!whatsappApiKey || !whatsappPhoneId) {
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
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const safeName = String(student_name || student.name).slice(0, 100);
    const safeHomework = homework.slice(0, 2000);
    const message = `📚 *واجب أكاديمية الحمد*\n\nالسلام عليكم يا ${safeName}\n\n📝 الواجب:\n${safeHomework}\n\nبالتوفيق! 🌟`;

    const waResponse = await fetch(
      `https://graph.facebook.com/v18.0/${encodeURIComponent(whatsappPhoneId)}/messages`,
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

    if (!waResponse.ok) {
      const waData = await waResponse.json();
      console.error("WhatsApp API error:", waData);
      throw new Error("فشل إرسال رسالة الواتساب");
    }

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
