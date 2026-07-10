# Alhamd Academy — Website Integration Package (v1, Production)

This is the **final, production-ready** integration package for the Website team. Give this document to the Website developers as-is. Nothing else is required to start.

The ERP is the **single source of truth** for teacher data. The Website is a **presentation layer only** — it must never store, edit, or duplicate teacher records.

---

## 1. Production API URLs

Base host:

```
https://xoymllyfwvbnbxsbbinu.functions.supabase.co
```

| Purpose               | Method | URL                                                                                                       |
|-----------------------|--------|-----------------------------------------------------------------------------------------------------------|
| Teachers list         | GET    | `https://xoymllyfwvbnbxsbbinu.functions.supabase.co/api-v1-public-teachers`                               |
| Single teacher (slug) | GET    | `https://xoymllyfwvbnbxsbbinu.functions.supabase.co/api-v1-public-teachers?slug={slug}&lang={ar\|en}`     |
| Single teacher (id)   | GET    | `https://xoymllyfwvbnbxsbbinu.functions.supabase.co/api-v1-public-teachers?id={uuid}&lang={ar\|en}`       |
| Health check          | GET    | `https://xoymllyfwvbnbxsbbinu.functions.supabase.co/api-v1-health`                                        |

Versioning: the version is baked into the path (`api-v1-…`). Any breaking change will ship as `api-v2-…` and both will run in parallel for at least one deprecation cycle.

---

## 2. Authentication

The endpoints are **public and read-only**. No user login, no JWT, no signed request. However, the Supabase edge platform requires an `apikey` header for every request — this is a **publishable anon key** and is safe to expose in a browser or a server-side fetcher.

**Required header on every request:**

```
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhveW1sbHlmd3ZibmJ4c2JiaW51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NjY5NTAsImV4cCI6MjA4NzA0Mjk1MH0.VtVtZLEAj6jc3hVDISLHsux2dvbCOPZ5HRPZwC0Hc-A
```

Recommended usage:
- Store the key in the Website's environment as `ERP_API_KEY` (server-side) or `NEXT_PUBLIC_ERP_API_KEY` (if fetching from the browser).
- No other authentication is required.
- No `Authorization: Bearer …` header. No cookies. No CSRF token.

---

## 3. Request Examples

All examples use `curl`. Replace the `apikey` value with the one from section 2.

### 3.1 English teachers (default)

```bash
curl "https://xoymllyfwvbnbxsbbinu.functions.supabase.co/api-v1-public-teachers?lang=en&page=1&page_size=20" \
  -H "apikey: <ANON_KEY>"
```

### 3.2 Arabic teachers

```bash
curl "https://xoymllyfwvbnbxsbbinu.functions.supabase.co/api-v1-public-teachers?lang=ar&page=1&page_size=20" \
  -H "apikey: <ANON_KEY>"
```

### 3.3 Featured teachers (homepage strip)

```bash
curl "https://xoymllyfwvbnbxsbbinu.functions.supabase.co/api-v1-public-teachers?lang=en&featured_only=true&sort=featured&page_size=6" \
  -H "apikey: <ANON_KEY>"
```

### 3.4 Pagination

```bash
curl "https://xoymllyfwvbnbxsbbinu.functions.supabase.co/api-v1-public-teachers?lang=en&page=2&page_size=12&sort=display_order" \
  -H "apikey: <ANON_KEY>"
```

### 3.5 Search

```bash
curl "https://xoymllyfwvbnbxsbbinu.functions.supabase.co/api-v1-public-teachers?lang=en&search=tajweed" \
  -H "apikey: <ANON_KEY>"
```

### 3.6 Filters

Filter by country, language spoken, gender, or specialization. All filters are combinable.

```bash
# Egyptian male teachers who speak English and specialize in Hifz
curl "https://xoymllyfwvbnbxsbbinu.functions.supabase.co/api-v1-public-teachers?lang=en&country=EG&language=en&gender=male&specialization=hifz" \
  -H "apikey: <ANON_KEY>"
```

### 3.7 Single teacher by slug (SEO route)

```bash
curl "https://xoymllyfwvbnbxsbbinu.functions.supabase.co/api-v1-public-teachers?slug=abdullah-ahmed&lang=en" \
  -H "apikey: <ANON_KEY>"
```

### 3.8 Health check

```bash
curl "https://xoymllyfwvbnbxsbbinu.functions.supabase.co/api-v1-health" \
  -H "apikey: <ANON_KEY>"
```

### Query parameter reference

| Param            | Type   | Default          | Allowed values                                              |
|------------------|--------|------------------|-------------------------------------------------------------|
| `lang`           | string | `en`             | `ar`, `en`                                                  |
| `page`           | int    | `1`              | ≥ 1                                                         |
| `page_size`      | int    | `20`             | 1 – 100                                                     |
| `sort`           | string | `display_order`  | `display_order`, `featured`, `newest`, `alphabetical`       |
| `id`             | uuid   | —                | single teacher lookup                                       |
| `slug`           | string | —                | single teacher lookup by SEO slug (preferred)               |
| `featured_only`  | bool   | `false`          | `true`, `false`                                             |
| `search`         | string | —                | free text, matches job title + bio in both languages        |
| `country`        | string | —                | ISO country code, e.g. `EG`, `SA`                           |
| `language`       | string | —                | language the teacher speaks, e.g. `ar`, `en`                |
| `gender`         | string | —                | `male`, `female`                                            |
| `specialization` | string | —                | e.g. `tajweed`, `hifz`, `qiraat`, `arabic`                  |

---

## 4. Response Examples

### 4.1 `GET /api-v1-public-teachers` (list, English)

`200 OK`

```json
{
  "version": 1,
  "lang": "en",
  "generated_at": "2026-07-10T09:15:00.000Z",
  "last_updated": "2026-07-09T18:22:11.000Z",
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 34,
    "total_pages": 2
  },
  "teachers": [
    {
      "id": "6b0a0b7a-2c3d-4e5f-9a1b-2c3d4e5f6a7b",
      "slug": "abdullah-ahmed",
      "name": "Abdullah Ahmed",
      "photo": {
        "thumbnail": "https://xoymllyfwvbnbxsbbinu.supabase.co/storage/v1/object/public/teacher-files/…",
        "medium":    "https://xoymllyfwvbnbxsbbinu.supabase.co/storage/v1/object/public/teacher-files/…",
        "large":     "https://xoymllyfwvbnbxsbbinu.supabase.co/storage/v1/object/public/teacher-files/…",
        "original":  "https://xoymllyfwvbnbxsbbinu.supabase.co/storage/v1/object/public/teacher-files/…"
      },
      "job_title": "Senior Quran Instructor",
      "bio": "Abdullah has over 12 years of experience teaching Quran and Tajweed to students of all ages.",
      "qualification": "Bachelor of Islamic Studies — Al-Azhar University",
      "academic_degree": "Bachelor",
      "ijazat": "Ijazah in Hafs 'an 'Asim",
      "subjects": ["Quran", "Tajweed", "Arabic"],
      "gender": "male",
      "country": "EG",
      "languages": ["ar", "en"],
      "teaching_audience": ["kids", "adults"],
      "specializations": ["tajweed", "hifz"],
      "experience_years": 12,
      "certificates": ["Ijazah — Hafs", "Tajweed Diploma"],
      "is_featured": true,
      "display_order": 1,
      "rating": 4.9,
      "students_count": 120,
      "published_at": "2026-06-01T10:00:00.000Z"
    }
  ]
}
```

### 4.2 `GET /api-v1-public-teachers?lang=ar` (list, Arabic)

`200 OK`

```json
{
  "version": 1,
  "lang": "ar",
  "generated_at": "2026-07-10T09:15:00.000Z",
  "last_updated": "2026-07-09T18:22:11.000Z",
  "pagination": { "page": 1, "page_size": 20, "total": 30, "total_pages": 2 },
  "teachers": [
    {
      "id": "6b0a0b7a-2c3d-4e5f-9a1b-2c3d4e5f6a7b",
      "slug": "abdullah-ahmed",
      "name": "عبد الله أحمد",
      "photo": { "thumbnail": "…", "medium": "…", "large": "…", "original": "…" },
      "job_title": "معلم قرآن أول",
      "bio": "معلم قرآن وتجويد بخبرة تزيد عن 12 عامًا في تدريس الأطفال والكبار.",
      "qualification": "بكالوريوس الدراسات الإسلامية — جامعة الأزهر",
      "academic_degree": "بكالوريوس",
      "ijazat": "إجازة في رواية حفص عن عاصم",
      "subjects": ["القرآن", "التجويد", "العربية"],
      "gender": "male",
      "country": "EG",
      "languages": ["ar", "en"],
      "teaching_audience": ["kids", "adults"],
      "specializations": ["tajweed", "hifz"],
      "experience_years": 12,
      "certificates": ["إجازة حفص", "دبلوم التجويد"],
      "is_featured": true,
      "display_order": 1,
      "rating": 4.9,
      "students_count": 120,
      "published_at": "2026-06-01T10:00:00.000Z"
    }
  ]
}
```

### 4.3 Single teacher

`200 OK` — same shape as the list, but with exactly one item in `teachers` and pagination totals of `1`.

### 4.4 Empty result (nothing published for that language)

`200 OK`

```json
{
  "version": 1,
  "lang": "en",
  "generated_at": "2026-07-10T09:15:00.000Z",
  "last_updated": null,
  "pagination": { "page": 1, "page_size": 20, "total": 0, "total_pages": 1 },
  "teachers": []
}
```

Website behavior: hide the Teachers section entirely when `teachers` is empty.

### 4.5 `GET /api-v1-health`

`200 OK`

```json
{
  "status": "ok",
  "version": 1,
  "api": "alhamd-academy-erp",
  "database": "ok",
  "database_error": null,
  "server_time": "2026-07-10T09:15:00.000Z"
}
```

`503 Service Unavailable` when the database is unreachable — the Website should treat any non-200 as "ERP down" and fall back to the last cached response.

### 4.6 Error response

`500` / `4xx`

```json
{ "version": 1, "error": "human readable message" }
```

---

## 5. Website Integration Instructions

### 5.1 Website Admin Panel — one switch only

Create a new "Teachers" section in the Website Admin Panel. It must contain **exactly one control**:

- **Enable Teachers Section** — boolean toggle, persisted in the Website's own settings store.

No other teacher-related setting belongs in the Website admin. In particular the Website must NOT expose: create teacher, edit teacher, delete teacher, upload photo, edit bio, translate, publish, feature, reorder. All of these live in the ERP.

### 5.2 Behavior when the switch is OFF

- The `/teachers` route (both `/en/teachers` and `/ar/teachers`) returns 404 or redirects home.
- The homepage Teachers section is not rendered at all.
- The Website makes **no requests** to the ERP API — no prefetch, no build-time fetch, no client fetch.
- Any cached teacher data may remain but must not be shown.

### 5.3 Behavior when the switch is ON

- The `/teachers` route is registered and rendered.
- The homepage renders the Teachers section in its predefined location.
- The Website calls `GET /api-v1-public-teachers` with the current UI language (`lang=ar` on Arabic pages, `lang=en` on English pages).
- The Website displays only what the API returns — no local overrides, no local filtering, no local edits.
- If the API returns `teachers: []`, the section is hidden gracefully (no empty state on the homepage; on the `/teachers` page a neutral "No teachers available yet" message is acceptable).

### 5.4 Recommended fetch strategy

- **Server-side fetch** for SEO (SSR / SSG / ISR). Revalidate every 5 minutes.
- Cache the response for 5 minutes (`Cache-Control: public, max-age=300` is already returned by the API — respect it).
- Use `last_updated` from the payload as a cache key if you need on-demand invalidation.
- On fetch error, serve the last known good payload; never surface a raw error to the visitor.

### 5.5 Routing

| Language | List page URL              | Detail page URL                                |
|----------|----------------------------|------------------------------------------------|
| English  | `/en/teachers`             | `/en/teachers/{slug}`                          |
| Arabic   | `/ar/teachers` (RTL)       | `/ar/teachers/{slug}`                          |

Use the `slug` field from the API for detail URLs. Both languages share the same slug so `hreflang` alternates cleanly.

### 5.6 SEO (per teacher page)

Build the head tags from the response:

- `<title>` = `${name} — ${job_title} | Alhamd Academy`
- `<meta name="description">` = first 155 chars of `bio`
- `<link rel="canonical" href="https://<site>/{lang}/teachers/{slug}">`
- `<link rel="alternate" hreflang="en" href="https://<site>/en/teachers/{slug}">`
- `<link rel="alternate" hreflang="ar" href="https://<site>/ar/teachers/{slug}">`
- Open Graph: `og:title`, `og:description`, `og:image` = `photo.large`
- JSON-LD: `Person` schema with `name`, `jobTitle`, `image`, `knowsLanguage`.

### 5.7 Hard rules

1. Never create, edit, or delete a teacher record on the Website side.
2. Never fetch or display private fields (email, phone, salary, schedules, students, payroll). They are not in the API by design.
3. Never bypass the language switch — `lang=ar` on Arabic pages, `lang=en` on English pages, always.
4. Never scrape all pages in parallel — honor the pagination metadata.
5. Never persist ERP data in the Website's database. In-memory / CDN cache only.
6. Never call the API when the "Enable Teachers Section" switch is OFF.

---

## 6. Integration Checklist

Before the Website team starts implementation, confirm every item below:

**Access & environment**
- [ ] Production base URL saved: `https://xoymllyfwvbnbxsbbinu.functions.supabase.co`
- [ ] `ERP_API_KEY` (anon key) stored in the Website's environment variables
- [ ] Health endpoint reachable and returning `status: "ok"`

**Admin panel**
- [ ] "Teachers" section added to the Website Admin Panel
- [ ] Contains exactly one control: **Enable Teachers Section** (boolean)
- [ ] Setting persisted in the Website's own store
- [ ] OFF state verified: `/teachers` hidden, homepage strip hidden, zero API calls

**Data flow**
- [ ] ON state verified: `/teachers` renders, homepage strip renders
- [ ] `lang=ar` requested on Arabic pages, `lang=en` on English pages
- [ ] Pagination working (`page`, `page_size`, `total_pages` honored)
- [ ] Sort options tested (`display_order`, `featured`, `newest`, `alphabetical`)
- [ ] Featured filter tested (`featured_only=true`) for the homepage strip
- [ ] Search tested (`search=…`)
- [ ] Filters tested (`country`, `language`, `gender`, `specialization`)
- [ ] Single teacher fetch tested via `slug=…`
- [ ] Empty response tested — section hides gracefully

**Presentation**
- [ ] `photo.large` used on detail pages, `photo.medium` on cards, `photo.thumbnail` in lists
- [ ] Localized `job_title` and `bio` rendered from the API response, never from local strings
- [ ] Fields omitted by the ERP (fields not present in the response) are not rendered
- [ ] RTL layout applied on Arabic pages

**SEO**
- [ ] Per-teacher `<title>`, `<meta description>`, canonical, `hreflang` alternates set
- [ ] Open Graph tags set with `photo.large`
- [ ] JSON-LD `Person` schema emitted
- [ ] Sitemap includes `/{lang}/teachers` and every `/{lang}/teachers/{slug}` on both languages

**Resilience**
- [ ] 5-minute cache honored (respect `Cache-Control` from API)
- [ ] Fallback to last known good payload on API error
- [ ] No user-facing error when ERP is unreachable

**Governance**
- [ ] No local database table for teachers on the Website
- [ ] No create/edit/delete UI for teachers anywhere on the Website
- [ ] No private field ever displayed
- [ ] Website acknowledged that the ERP is the sole source of truth

---

Once every checkbox is ticked, the Website team can ship. Any change requests (new fields, new filters, breaking changes) go to the ERP team — the Website never patches the schema on its own.
