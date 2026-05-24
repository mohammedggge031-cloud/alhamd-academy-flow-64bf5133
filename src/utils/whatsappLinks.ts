/**
 * WhatsApp link utility - generates wa.me links with pre-filled messages
 * Used instead of automatic API sending to avoid costs.
 *
 * Bilingual: every builder accepts a `lang` ("ar" | "en"). The traditional
 * Arabic greeting is ALWAYS preserved at the top of every message (per
 * project memory: WhatsApp Communication Standards), but body labels are
 * translated for English-speaking guardians, students, and teachers.
 */

export type MsgLang = "ar" | "en";

const GREETING = "السلام عليكم ورحمة الله وبركاته";
const FOOTER_AR = "_أكاديمية الحمد لتحفيظ القرآن الكريم_";
const FOOTER_EN = "_Alhamd Academy for Quran Memorization_";

const footer = (lang: MsgLang) => (lang === "ar" ? FOOTER_AR : FOOTER_EN);

export function openWhatsApp(phone: string, message: string) {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  if (!cleanPhone) return;
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function buildHomeworkMessage(
  studentName: string,
  homework: string,
  lang: MsgLang = "ar"
): string {
  if (lang === "en") {
    return `📚 *Homework — Alhamd Academy*\n\n${GREETING}\n\n👤 Student: ${studentName}\n\n📝 Homework:\n${homework}\n\nGood luck! 🌟`;
  }
  return `📚 *واجب أكاديمية الحمد*\n\n${GREETING}\n\n👤 الطالب: ${studentName}\n\n📝 الواجب:\n${homework}\n\nبالتوفيق! 🌟`;
}

export function buildSessionReportMessage(
  studentName: string,
  level: string,
  notes: string,
  homework: string,
  sessionDate: string,
  lang: MsgLang = "ar"
): string {
  if (lang === "en") {
    let m = `📋 *Session Report — Alhamd Academy*\n\n${GREETING}\n\n👤 Student: ${studentName}\n📅 Date: ${sessionDate}\n`;
    if (level) m += `📊 Level: ${level}\n`;
    if (notes) m += `\n📝 Notes:\n${notes}\n`;
    if (homework) m += `\n📚 Homework:\n${homework}\n`;
    m += `\n${footer("en")}`;
    return m;
  }
  let m = `📋 *تقرير الحصة - أكاديمية الحمد*\n\n${GREETING}\n\n👤 الطالب: ${studentName}\n📅 التاريخ: ${sessionDate}\n`;
  if (level) m += `📊 المستوى: ${level}\n`;
  if (notes) m += `\n📝 ملاحظات الحصة:\n${notes}\n`;
  if (homework) m += `\n📚 الواجب:\n${homework}\n`;
  m += `\n${footer("ar")}`;
  return m;
}

export function buildSessionReminderMessage(
  recipientType: "student" | "teacher",
  studentName: string,
  teacherName: string,
  sessionDate: string,
  startTime: string,
  durationMinutes: number,
  lang: MsgLang = "ar"
): string {
  if (lang === "en") {
    if (recipientType === "student") {
      return `🕌 *Session Reminder — Alhamd Academy*\n\n${GREETING}\nHello ${studentName} 🌟\n\n📅 Session date: ${sessionDate}\n⏰ Time: ${startTime}\n👨‍🏫 Teacher: ${teacherName}\n⏱ Duration: ${durationMinutes} min\n\nWishing you a productive session! 📚`;
    }
    return `🕌 *Session Reminder — Alhamd Academy*\n\n${GREETING}\nHello ${teacherName}\n\n📅 Session date: ${sessionDate}\n⏰ Time: ${startTime}\n👤 Student: ${studentName}\n⏱ Duration: ${durationMinutes} min\n\nMay Allah reward you 📚`;
  }
  if (recipientType === "student") {
    return `🕌 *تذكير بحصة - أكاديمية الحمد*\n\n${GREETING} يا ${studentName} 🌟\n\n📅 موعد الحصة: ${sessionDate}\n⏰ الساعة: ${startTime}\n👨‍🏫 المعلم: ${teacherName}\n⏱ المدة: ${durationMinutes} دقيقة\n\nنتمنى لك حصة موفقة! 📚`;
  }
  return `🕌 *تذكير بحصة - أكاديمية الحمد*\n\n${GREETING} يا ${teacherName}\n\n📅 موعد الحصة: ${sessionDate}\n⏰ الساعة: ${startTime}\n👤 الطالب: ${studentName}\n⏱ المدة: ${durationMinutes} دقيقة\n\nجزاك الله خيراً 📚`;
}

export function buildInvoiceMessage(
  studentName: string,
  total: number,
  hours: number | null,
  dueDate: string | null,
  lang: MsgLang = "ar"
): string {
  if (lang === "en") {
    let msg = `💳 *Invoice — Alhamd Academy*\n\n${GREETING}\nHello ${studentName}\n\n`;
    msg += `💰 Amount: $${total}\n`;
    if (hours) msg += `⏱ Hours: ${hours}\n`;
    if (dueDate) msg += `📅 Due date: ${dueDate}\n`;
    msg += `\nKindly settle by the due date so sessions continue without interruption 🙏\n\n${footer("en")}`;
    return msg;
  }
  let msg = `💳 *فاتورة أكاديمية الحمد*\n\n${GREETING} يا ${studentName}\n\n`;
  msg += `💰 المبلغ: $${total}\n`;
  if (hours) msg += `⏱ عدد الساعات: ${hours}\n`;
  if (dueDate) msg += `📅 تاريخ الاستحقاق: ${dueDate}\n`;
  msg += `\nيرجى السداد في الموعد لضمان استمرار الحصص 🙏\n\n${footer("ar")}`;
  return msg;
}

export function buildPaidInvoiceMessage(
  studentName: string,
  total: number,
  hours: number | null,
  paidDate: string,
  lang: MsgLang = "ar"
): string {
  if (lang === "en") {
    let msg = `✅ *Payment Receipt — Alhamd Academy*\n\n`;
    msg += `${GREETING}\nHello ${studentName}\n\n`;
    msg += `Payment received successfully ✅\n\n`;
    msg += `💰 Amount paid: $${total}\n`;
    if (hours) msg += `⏱ Hours: ${hours}\n`;
    msg += `📅 Payment date: ${paidDate}\n\n`;
    msg += `May Allah bless you and reward you 🤲\n\n`;
    msg += footer("en");
    return msg;
  }
  let msg = `✅ *إيصال دفع - أكاديمية الحمد*\n\n`;
  msg += `${GREETING} يا ${studentName}\n\n`;
  msg += `تم استلام الدفع بنجاح ✅\n\n`;
  msg += `💰 المبلغ المدفوع: $${total}\n`;
  if (hours) msg += `⏱ عدد الساعات: ${hours}\n`;
  msg += `📅 تاريخ الدفع: ${paidDate}\n\n`;
  msg += `جزاكم الله خيراً وبارك الله فيكم 🤲\n\n`;
  msg += footer("ar");
  return msg;
}

export function buildMonthlyReportMessage(
  studentName: string,
  teacherName: string,
  reportMonth: string,
  overallGrade: string,
  quranProgress: string,
  strengths: string,
  weaknesses: string,
  recommendations: string,
  lang: MsgLang = "ar"
): string {
  if (lang === "en") {
    let msg = `📋 *Monthly Report — Alhamd Academy*\n\n${GREETING}\n\n`;
    msg += `👤 Student: ${studentName}\n`;
    msg += `👨‍🏫 Teacher: ${teacherName}\n`;
    msg += `📅 Month: ${reportMonth}\n`;
    if (overallGrade) msg += `📊 Overall grade: ${overallGrade}\n`;
    msg += `\n`;
    if (quranProgress) msg += `📖 Quran progress:\n${quranProgress}\n\n`;
    if (strengths) msg += `✅ Strengths:\n${strengths}\n\n`;
    if (weaknesses) msg += `⚠️ Areas to improve:\n${weaknesses}\n\n`;
    if (recommendations) msg += `💡 Recommendations:\n${recommendations}\n\n`;
    msg += footer("en");
    return msg;
  }
  let msg = `📋 *التقرير الشهري - أكاديمية الحمد*\n\n${GREETING}\n\n`;
  msg += `👤 الطالب: ${studentName}\n`;
  msg += `👨‍🏫 المعلم: ${teacherName}\n`;
  msg += `📅 الشهر: ${reportMonth}\n`;
  if (overallGrade) msg += `📊 التقييم العام: ${overallGrade}\n`;
  msg += `\n`;
  if (quranProgress) msg += `📖 تقدم القرآن:\n${quranProgress}\n\n`;
  if (strengths) msg += `✅ نقاط القوة:\n${strengths}\n\n`;
  if (weaknesses) msg += `⚠️ نقاط الضعف:\n${weaknesses}\n\n`;
  if (recommendations) msg += `💡 التوصيات:\n${recommendations}\n\n`;
  msg += footer("ar");
  return msg;
}
