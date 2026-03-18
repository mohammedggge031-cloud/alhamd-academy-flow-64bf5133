/**
 * WhatsApp link utility - generates wa.me links with pre-filled messages
 * Used instead of automatic API sending to avoid costs
 */

export function openWhatsApp(phone: string, message: string) {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  if (!cleanPhone) return;
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function buildHomeworkMessage(studentName: string, homework: string): string {
  return `📚 *واجب أكاديمية الحمد*\n\nالسلام عليكم\n\n👤 الطالب: ${studentName}\n\n📝 الواجب:\n${homework}\n\nبالتوفيق! 🌟`;
}

export function buildSessionReminderMessage(
  recipientType: "student" | "teacher",
  studentName: string,
  teacherName: string,
  sessionDate: string,
  startTime: string,
  durationMinutes: number
): string {
  if (recipientType === "student") {
    return `🕌 *تذكير بحصة - أكاديمية الحمد*\n\nالسلام عليكم يا ${studentName} 🌟\n\n📅 موعد الحصة: ${sessionDate}\n⏰ الساعة: ${startTime}\n👨‍🏫 المعلم: ${teacherName}\n⏱ المدة: ${durationMinutes} دقيقة\n\nنتمنى لك حصة موفقة! 📚`;
  }
  return `🕌 *تذكير بحصة - أكاديمية الحمد*\n\nالسلام عليكم يا ${teacherName}\n\n📅 موعد الحصة: ${sessionDate}\n⏰ الساعة: ${startTime}\n👤 الطالب: ${studentName}\n⏱ المدة: ${durationMinutes} دقيقة\n\nجزاك الله خيراً 📚`;
}

export function buildInvoiceMessage(
  studentName: string,
  total: number,
  hours: number | null,
  dueDate: string | null
): string {
  let msg = `💳 *فاتورة أكاديمية الحمد*\n\nالسلام عليكم يا ${studentName}\n\n`;
  msg += `💰 المبلغ: $${total}\n`;
  if (hours) msg += `⏱ عدد الساعات: ${hours}\n`;
  if (dueDate) msg += `📅 تاريخ الاستحقاق: ${dueDate}\n`;
  msg += `\nيرجى السداد في الموعد لضمان استمرار الحصص 🙏\n\n_أكاديمية الحمد لتحفيظ القرآن الكريم_`;
  return msg;
}

export function buildPaidInvoiceMessage(
  studentName: string,
  total: number,
  hours: number | null,
  paidDate: string
): string {
  let msg = `✅ *إيصال دفع - أكاديمية الحمد*\n\n`;
  msg += `السلام عليكم يا ${studentName}\n\n`;
  msg += `تم استلام الدفع بنجاح ✅\n\n`;
  msg += `💰 المبلغ المدفوع: $${total}\n`;
  if (hours) msg += `⏱ عدد الساعات: ${hours}\n`;
  msg += `📅 تاريخ الدفع: ${paidDate}\n\n`;
  msg += `جزاكم الله خيراً وبارك الله فيكم 🤲\n\n`;
  msg += `_أكاديمية الحمد لتحفيظ القرآن الكريم_`;
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
  recommendations: string
): string {
  let msg = `📋 *التقرير الشهري - أكاديمية الحمد*\n\n`;
  msg += `👤 الطالب: ${studentName}\n`;
  msg += `👨‍🏫 المعلم: ${teacherName}\n`;
  msg += `📅 الشهر: ${reportMonth}\n`;
  if (overallGrade) msg += `📊 التقييم العام: ${overallGrade}\n`;
  msg += `\n`;
  if (quranProgress) msg += `📖 تقدم القرآن:\n${quranProgress}\n\n`;
  if (strengths) msg += `✅ نقاط القوة:\n${strengths}\n\n`;
  if (weaknesses) msg += `⚠️ نقاط الضعف:\n${weaknesses}\n\n`;
  if (recommendations) msg += `💡 التوصيات:\n${recommendations}\n\n`;
  msg += `_أكاديمية الحمد لتحفيظ القرآن الكريم_`;
  return msg;
}
