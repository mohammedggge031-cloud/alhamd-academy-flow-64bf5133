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
