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
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get teachers marked for website display
    const { data: teachers, error } = await adminClient
      .from("teachers")
      .select("id, bio, academic_degree, ijazat, qualification, subjects, rating, students_count, gender, website_visible_fields, profiles!teachers_profile_user_id_fkey(full_name)")
      .eq("show_on_website", true)
      .eq("is_active", true);

    if (error) throw error;

    // Get profile photos for visible teachers
    const teacherIds = (teachers || []).map((t: any) => t.id);
    
    let docsMap: Record<string, string> = {};
    if (teacherIds.length > 0) {
      const { data: docs } = await adminClient
        .from("teacher_documents")
        .select("teacher_id, file_url")
        .in("teacher_id", teacherIds)
        .eq("document_type", "profile_photo");
      
      if (docs) {
        for (const doc of docs) {
          docsMap[doc.teacher_id] = doc.file_url;
        }
      }
    }

    // Filter fields based on website_visible_fields
    const result = (teachers || []).map((t: any) => {
      const fields = t.website_visible_fields || [];
      const entry: Record<string, any> = { id: t.id };

      if (fields.includes("name")) {
        entry.name = t.profiles?.full_name || "";
      }
      if (fields.includes("photo")) {
        entry.photo = docsMap[t.id] || null;
      }
      if (fields.includes("qualification")) {
        entry.qualification = t.qualification || "";
      }
      if (fields.includes("academic_degree")) {
        entry.academic_degree = t.academic_degree || "";
      }
      if (fields.includes("ijazat")) {
        entry.ijazat = t.ijazat || "";
      }
      if (fields.includes("bio")) {
        entry.bio = t.bio || "";
      }
      if (fields.includes("subjects")) {
        entry.subjects = t.subjects || [];
      }
      if (fields.includes("gender")) {
        entry.gender = t.gender || "male";
      }

      return entry;
    });

    return new Response(JSON.stringify({ teachers: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
