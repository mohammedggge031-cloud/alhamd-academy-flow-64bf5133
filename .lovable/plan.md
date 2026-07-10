
# Alhamd Academy ERP – نظام مالى وأكاديمى شامل

خطة مبنية على المواصفات الكاملة. التنفيذ على 6 مراحل مستقلة قابلة للاختبار.

---

## 1) قاعدة البيانات (Migration واحد شامل)

### أ. جداول جديدة

**`subscription_packages`**
`name, hours, price, currency, validity_days, is_active`

**`student_ledger`** — مصدر الحقيقة الوحيد لرصيد الطالب
`student_id, entry_type, hours_delta, amount_delta, session_id?, invoice_id?, notes, created_by, created_at`
`entry_type`: `purchase | session_deducted | absence_charged | absence_refunded | manual_adjustment | refund | bonus_session`

**`teacher_ledger`** — مصدر الحقيقة لمستحقات المعلم
`teacher_id, entry_type, minutes, amount, session_id?, payroll_month (date), notes, created_by, created_at`
`entry_type`: `session_paid | waiting_paid | absence_paid_15min | bonus | deduction | salary_payout`

**`session_edit_requests`**
`session_id, teacher_id, requested_changes jsonb, reason, status (pending|approved|rejected), reviewed_by, reviewed_at`

**تحسين `audit_log` الحالى**: إضافة `ip inet` إن لم يكن موجوداً + Triggers Audit عامة على: `sessions, invoices, students, teachers, student_ledger, teacher_ledger, subscription_packages, user_roles, session_edit_requests`.

### ب. أعمدة إضافية

- `students`: `subscription_hours, subscription_start_date, subscription_end_date, subscription_status (active|expiring_soon|expired|none), current_package_id`
- `sessions`: `absence_reviewed bool default false, absence_decision (count_on_student|excused|teacher_fault|null), absence_reviewed_by, absence_reviewed_at, locked_by_teacher bool default false`
- `invoices`: `package_id?`

### ج. Views لعزل الأدوار
- `teacher_ledger_academic_view` — بدون `amount` — للـ Supervisor.
- `students_supervisor_view` — بدون أى حقول مالية.

### د. Functions & Triggers الأساسية

- `recalc_student_balance(_student_id)` → يحسب `remaining_hours = SUM(hours_delta)` من الـ ledger ويحدّث `students`.
- `recalc_subscription_status(_student_id)` → يضبط `subscription_status` حسب الرصيد والتاريخ.
- Trigger على `student_ledger AFTER INSERT/UPDATE/DELETE` → يستدعى الاثنين.
- Trigger على `invoices AFTER UPDATE` عند `status → paid`: ينشئ قيد `purchase` + يضبط تواريخ الاشتراك تلقائياً.
- Trigger على `sessions AFTER UPDATE`:
  - `→ completed`: قيد `session_deducted` + `session_paid` (يحل محل التعديل المباشر لـ `remaining_hours`).
  - `→ absent_student`: قيد `absence_charged` + `absence_paid_15min` + `absence_reviewed = false`.
- دالة `apply_absence_decision(session_id, decision, reason)`:
  - `count_on_student` → لا تغيير.
  - `excused` → قيد `absence_refunded` (سياسة المعلم قابلة للتخصيص).
  - `teacher_fault` → قيد `absence_refunded` + قيد سالب يلغى `absence_paid_15min`.
- دالة `add_bonus_session(student_id, hours, reason)` تنشئ قيد `bonus_session` فقط.
- Cron يومى (pg_cron) يستدعى `recalc_subscription_status` لكل الطلاب.

### هـ. تفكيك المنطق القديم
الترجرز الحالية `credit_student_on_invoice_paid` و `decrement_student_hours_on_session` تُستبدل بالترجرز الجديدة المبنية على الـ ledger. `remaining_hours` يصبح derived فقط (لا يُكتب مباشرة من أى كود).

### و. Backfill (نص واحد)
توليد قيود `purchase` من الفواتير المدفوعة الحالية + `session_deducted`/`session_paid` من الحصص المكتملة + `absence_*` من الحصص absent_student. اختبار: الرصيد المحسوب من الـ ledger = `remaining_hours` الحالى لكل طالب.

### ز. RLS و GRANTs
- `student_ledger`: Admin ALL، Supervisor SELECT، Teacher SELECT قيود طلابه فقط، Student/Parent قيوده الخاصة.
- `teacher_ledger`: Admin ALL، Supervisor SELECT عبر الـ view (بدون amount)، Teacher SELECT الخاص به.
- `subscription_packages`: Admin ALL، الباقون SELECT للنشط فقط.
- `session_edit_requests`: Teacher INSERT/SELECT الخاص به، Supervisor+Admin ALL.
- `audit_log`: SELECT للـ Admin فقط.
- GRANT كامل لكل جدول جديد.

---

## 2) واجهة الطلاب — Student Card & Alerts

- شريط تقدم لونى للرصيد: أخضر > 2، برتقالى = 2، أحمر = 1، رمادى = 0/expired.
- عرض `subscription_end_date` + الأيام المتبقية.
- زر **View Student Ledger** يفتح Dialog بكل الحركات.
- زر **Renew** يفتح Dialog اختيار باقة.
- قسم **Subscription Alerts** أعلى الصفحة بتبويبات: `1 Lesson | 2 Lessons | Expired | Expires within 7 Days`.

## 3) Sessions — Absence Review + Session Lock + Edit Requests

- قسم **Pending Absence Review** للـ Admin/Supervisor: قائمة الحصص `absence_reviewed = false` مع 3 أزرار قرار + ConfirmDialog.
- Teacher UI: بعد submit تصبح الحصة `locked_by_teacher = true` (readonly) + زر **Request Edit** ينشئ صف فى `session_edit_requests`.
- تبويب **Edit Requests** للـ Supervisor: approve → يطبّق التغيير عبر RPC، reject → يقفل الطلب.

## 4) Invoices — Purchase Package

- زر **Purchase Package** فى صفحة الفواتير:
  - اختيار طالب + باقة جاهزة من `subscription_packages` أو باقة مخصصة (hours + price + validity_days).
  - عند التحصيل: الـ trigger يفعّل الاشتراك تلقائياً (لا كود يدوى).

## 5) صفحة Finance جديدة (Admin فقط)

تبويبات:
- **Overview**: Income / Expenses / Net Profit / Outstanding Salaries + Chart شهرى.
- **Student Ledger**: بحث بطالب → كل الحركات + رصيد جارى + Excel export.
- **Teacher Ledger**: بحث بمعلم → مستحقات الشهر الحالى + سجل مدفوعات + زر **Pay Salary** ينشئ `salary_payout`.
- **Monthly / Yearly Reports**: تصدير Excel.
- **Packages**: CRUD لباقات الاشتراك.

## 6) Dashboard + Notifications + Audit

- Dashboard widgets: طلاب برصيد 1 / 2 / منتهى / حصص بانتظار المراجعة / صافى الشهر (Admin فقط).
- Notifications جديدة عبر `NotificationPanel` الحالى: `low_balance_1, low_balance_2, subscription_expires_tomorrow, absence_pending_review, edit_request_submitted`.
- صفحة **Audit Log** (Admin فقط): فلترة بالمستخدم/الجدول/التاريخ + عرض `before/after` JSON.

---

## Permissions Matrix

| الصفحة | Admin | Supervisor (`manager`) | Teacher |
|---|---|---|---|
| Dashboard | كامل | بدون الأرباح | Teacher Home فقط |
| Students | ✅ | ✅ بدون مالى | ❌ |
| Teachers | ✅ | ✅ | ❌ |
| Sessions | ✅ | ✅ | حصصه فقط |
| Absence Review | ✅ | ✅ | ❌ |
| Edit Requests | ✅ | ✅ | إرسال فقط |
| Invoices | ✅ | ❌ | ❌ |
| Finance | ✅ | ❌ | ❌ |
| Packages | ✅ | ❌ | ❌ |
| Audit Log | ✅ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ |

ملاحظة: دور "Supervisor" فى الـ enum اسمه `manager` — نبقيه كما هو ونسميه Supervisor فى الواجهة فقط (تجنّب migration مخاطر).

---

## ترتيب التنفيذ

1. **M1** — Migration + Backfill + Ledger triggers + Cron.
2. **M2** — Student Card ألوان + Ledger Dialog + Subscription Alerts + Packages CRUD + Purchase Package.
3. **M3** — Absence Review + Session Lock + Edit Requests.
4. **M4** — Finance Page (Overview/Ledgers/Reports/Payroll/Excel).
5. **M5** — Dashboard widgets + Notifications الجديدة + Audit Log page.
6. **M6** — RLS Tightening + Views + مراجعة أمان شاملة.

---

## قرارات افتراضية (قابلة للتغيير)

1. **Excused absence**: المعلم يحتفظ بالـ15 دقيقة.
2. **Subscription validity**: من `validity_days` فى الباقة (أو 30 يوم افتراضياً للباقة المخصصة).
3. **Expired policy**: عند مرور `subscription_end_date` → expired حتى لو الرصيد > 0.
4. **Edit Requests**: Supervisor يعتمد بدون الحاجة لـ Admin.

هل أبدأ بـ **M1** بهذه الافتراضات؟ أم عندك تعديل على أى قرار؟
