// Alhamd Academy — Public Teachers API v1
// Single source of truth for the public website. Read-only, bilingual, paginated.
// URL: /functions/v1/api-v1-public-teachers?lang=en|ar&page=1&page_size=20&sort=display_order|featured|newest|alphabetical
//   Optional: id=<uuid>, slug=<slug>, featured_only=true, search=..., country=..., language=..., gender=..., specialization=...

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const API_VERSION = 1;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "X-API-Version": String(API_VERSION),
      ...extra,
    },
  });
}

function pickLocalized(row: any, lang: "ar" | "en") {
  if (lang === "ar") {
    return {
      job_title: row.job_title_ar || row.job_title_en || "",
      bio: row.bio_ar || row.bio_en || row.bio || "",
    };
  }
  return {
    job_title: row.job_title_en || row.job_title_ar || "",
    bio: row.bio_en || row.bio || row.bio_ar || "",
  };
}

function buildPhotoVariants(url: string | null) {
  if (!url) return null;
  // Storage-agnostic: same URL for all variants for now. Website can add ?width=... on Supabase render endpoints later.
  return { thumbnail: url, medium: url, large: url, original: url };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "method_not_allowed" }, 405);

  try {
    const url = new URL(req.url);
    const p = url.searchParams;

    const lang = (p.get("lang") === "ar" ? "ar" : "en") as "ar" | "en";
    const page = Math.max(1, parseInt(p.get("page") || "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(p.get("page_size") || "20", 10) || 20));
    const sort = p.get("sort") || "display_order";
    const id = p.get("id");
    const slug = p.get("slug");
    const featuredOnly = p.get("featured_only") === "true";
    const search = p.get("search")?.trim();
    const country = p.get("country")?.trim();
    const language = p.get("language")?.trim();
    const gender = p.get("gender")?.trim();
    const specialization = p.get("specialization")?.trim();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    let query = admin
      .from("teachers")
      .select(
        `id, slug, job_title_en, job_title_ar, bio_en, bio_ar, bio, about,
         academic_degree, ijazat, qualification, subjects, rating, students_count, gender,
         country, languages, teaching_audience, specializations, experience_years, certificates,
         is_featured, display_order, published_at, website_visible_fields,
         profiles!teachers_user_id_fkey(full_name)`,
        { count: "exact" },
      )
      .eq("is_active", true)
      .eq("show_on_website", true)
      .is("deleted_at", null);

    if (lang === "ar") query = query.eq("show_on_arabic_website", true);
    else query = query.eq("show_on_english_website", true);

    if (id) query = query.eq("id", id);
    if (slug) query = query.eq("slug", slug);
    if (featuredOnly) query = query.eq("is_featured", true);
    if (country) query = query.eq("country", country);
    if (gender) query = query.eq("gender", gender);
    if (language) query = query.contains("languages", [language]);
    if (specialization) query = query.contains("specializations", [specialization]);
    if (search) {
      const s = `%${search}%`;
      query = query.or(
        `job_title_en.ilike.${s},job_title_ar.ilike.${s},bio_en.ilike.${s},bio_ar.ilike.${s}`,
      );
    }

    switch (sort) {
      case "featured":
        query = query.order("is_featured", { ascending: false }).order("display_order", { ascending: true });
        break;
      case "newest":
        query = query.order("published_at", { ascending: false, nullsFirst: false });
        break;
      case "alphabetical":
        query = query.order(lang === "ar" ? "job_title_ar" : "job_title_en", { ascending: true });
        break;
      default:
        query = query.order("display_order", { ascending: true }).order("is_featured", { ascending: false });
    }

    // Single-record lookup bypasses pagination
    const isSingle = !!(id || slug);
    if (!isSingle) {
      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);
    }

    const { data: teachers, error, count } = await query;
    if (error) throw error;

    // Attach profile photos
    const teacherIds = (teachers || []).map((t: any) => t.id);
    const photoMap: Record<string, string> = {};
    if (teacherIds.length > 0) {
      const { data: docs } = await admin
        .from("teacher_documents")
        .select("teacher_id, file_url")
        .in("teacher_id", teacherIds)
        .eq("document_type", "profile_photo");
      for (const d of docs || []) photoMap[d.teacher_id] = d.file_url;
    }

    const items = (teachers || []).map((t: any) => {
      const loc = pickLocalized(t, lang);
      const fields: string[] = t.website_visible_fields || [];
      const includeIf = (k: string, v: any) => (fields.length === 0 || fields.includes(k) ? v : undefined);
      return {
        id: t.id,
        slug: t.slug,
        name: includeIf("name", t.profiles?.full_name || ""),
        photo: includeIf("photo", buildPhotoVariants(photoMap[t.id] || null)),
        job_title: loc.job_title,
        bio: includeIf("bio", loc.bio),
        qualification: includeIf("qualification", t.qualification || ""),
        academic_degree: includeIf("academic_degree", t.academic_degree || ""),
        ijazat: includeIf("ijazat", t.ijazat || ""),
        subjects: includeIf("subjects", t.subjects || []),
        gender: includeIf("gender", t.gender || null),
        country: t.country || null,
        languages: t.languages || [],
        teaching_audience: t.teaching_audience || [],
        specializations: t.specializations || [],
        experience_years: t.experience_years,
        certificates: t.certificates || [],
        is_featured: t.is_featured,
        display_order: t.display_order,
        rating: t.rating,
        students_count: t.students_count,
        published_at: t.published_at,
      };
    });

    const total = count ?? items.length;
    const totalPages = isSingle ? 1 : Math.max(1, Math.ceil(total / pageSize));

    const now = new Date().toISOString();
    const lastUpdated = items.reduce<string | null>((acc, it: any) => {
      if (!it.published_at) return acc;
      return !acc || it.published_at > acc ? it.published_at : acc;
    }, null);

    return json({
      version: API_VERSION,
      lang,
      generated_at: now,
      last_updated: lastUpdated,
      pagination: isSingle
        ? { page: 1, page_size: items.length, total: items.length, total_pages: 1 }
        : { page, page_size: pageSize, total, total_pages: totalPages },
      teachers: items,
    });
  } catch (err) {
    console.error("api-v1-public-teachers error:", err);
    return json({ version: API_VERSION, error: (err as Error).message }, 500);
  }
});
