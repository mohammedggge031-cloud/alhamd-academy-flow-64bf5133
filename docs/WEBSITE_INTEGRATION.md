# Alhamd Academy — Website Integration Contract (v1)

The ERP is the **single source of truth** for all teacher information. The public website is a **presentation layer only** and MUST NOT store, edit, or duplicate teacher data locally. It only calls the read-only API below and caches responses.

---

## Base URL

```
https://<project-ref>.functions.supabase.co/api-v1-public-teachers
https://<project-ref>.functions.supabase.co/api-v1-health
```

Both endpoints are public (no JWT required). Send the Supabase anon key in the `apikey` header for rate-limit tracking:

```
apikey: <PUBLISHABLE_ANON_KEY>
```

---

## GET /api-v1-public-teachers

Returns only teachers that satisfy ALL of:
- `is_active = true`
- `show_on_website = true`
- `deleted_at IS NULL` (soft-deleted teachers are hidden)
- For `lang=ar`: `show_on_arabic_website = true`
- For `lang=en`: `show_on_english_website = true`

### Query params

| Param            | Type   | Default          | Description                                                     |
|------------------|--------|------------------|-----------------------------------------------------------------|
| `lang`           | string | `en`             | `ar` or `en`. Localizes `job_title` and `bio`.                  |
| `page`           | int    | `1`              |                                                                 |
| `page_size`      | int    | `20` (max `100`) |                                                                 |
| `sort`           | string | `display_order`  | `display_order` \| `featured` \| `newest` \| `alphabetical`     |
| `id`             | uuid   | —                | Fetch a single teacher by id.                                   |
| `slug`           | string | —                | Fetch a single teacher by SEO slug (preferred over id).         |
| `featured_only`  | bool   | `false`          | Only featured teachers.                                         |
| `search`         | string | —                | Full-text on `job_title` and `bio` in both languages.           |
| `country`        | string | —                | Exact match.                                                    |
| `language`       | string | —                | Teacher speaks this language (array contains).                  |
| `gender`         | string | —                | `male` or `female`.                                             |
| `specialization` | string | —                | Array contains match.                                           |

### Response

```json
{
  "version": 1,
  "lang": "en",
  "generated_at": "2026-07-10T09:15:00.000Z",
  "last_updated": "2026-07-09T18:22:11.000Z",
  "pagination": { "page": 1, "page_size": 20, "total": 34, "total_pages": 2 },
  "teachers": [
    {
      "id": "…uuid…",
      "slug": "abdullah-ahmed",
      "name": "Abdullah Ahmed",
      "photo": {
        "thumbnail": "https://…",
        "medium":    "https://…",
        "large":     "https://…",
        "original":  "https://…"
      },
      "job_title": "Senior Quran Instructor",
      "bio": "…localized bio…",
      "qualification": "…",
      "academic_degree": "…",
      "ijazat": "…",
      "subjects": ["…"],
      "gender": "male",
      "country": "EG",
      "languages": ["ar", "en"],
      "teaching_audience": ["kids", "adults"],
      "specializations": ["tajweed", "hifz"],
      "experience_years": 12,
      "certificates": ["…"],
      "is_featured": true,
      "display_order": 1,
      "rating": 4.9,
      "students_count": 120,
      "published_at": "2026-06-01T…"
    }
  ]
}
```

Fields that the admin has hidden via `website_visible_fields` are simply omitted (undefined) from the response. `job_title` is always returned.

### Caching

- Response ships `Cache-Control: public, max-age=300, s-maxage=300` (5 min CDN + browser).
- Website is expected to add its own edge/CDN cache on top (recommended TTL: 5 minutes).
- Use `last_updated` in the response to invalidate caches when needed.

---

## GET /api-v1-health

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

- `200` when healthy, `503` when the database is unreachable.
- `Cache-Control: no-store`.

---

## SEO recommendations for the website

For each teacher page (e.g. `/teachers/abdullah-ahmed`), build head tags from the API response:

- `<title>` = `${name} — ${job_title} | Alhamd Academy`
- `<meta name="description">` = first 155 chars of `bio`
- `<link rel="canonical">` = self URL
- `<link rel="alternate" hreflang="ar" href="…/ar/teachers/{slug}">`
- `<link rel="alternate" hreflang="en" href="…/en/teachers/{slug}">`
- Open Graph: `og:title`, `og:description`, `og:image` = `photo.large`
- JSON-LD: `Person` schema with `name`, `jobTitle`, `image`, `knowsLanguage`.

---

## Rules

1. **NEVER** write teacher data on the website. No local database, no admin panel for teachers.
2. **NEVER** fetch private fields (email, phone, salary, schedules, students, payroll). They are not in the API response by design.
3. Handle empty responses gracefully — if no teachers are published for the requested language, hide the teacher section entirely.
4. Respect the pagination metadata — do not scrape all pages at once.
5. Version is baked into the URL (`api-v1-`). Any breaking change ships as `api-v2-` and both stay live for at least one deprecation cycle.

---

## Future

- Webhook push on publish (currently pull-only).
- Image variants become real (Supabase Image Transformations) once configured on the storage bucket.
- Optional API-key gating for search analytics.
