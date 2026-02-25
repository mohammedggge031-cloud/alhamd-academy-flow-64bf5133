import logoUrl from "@/assets/logo.jpeg";
import type { Lang } from "@/i18n/translations";

interface ReportData {
  studentName: string;
  teacherName: string;
  reportMonth: string;
  overallGrade: string;
  gradeLabelAr: string;
  attendanceRating: string;
  attendanceLabelAr: string;
  quranProgress: string;
  arabicIslamicStudies: string;
  strengths: string;
  weaknesses: string;
  behaviorNotes: string;
  recommendations: string;
  lang: Lang;
}

export function generateReportHTML(data: ReportData): string {
  const isAr = data.lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const monthLabel = new Date(data.reportMonth).toLocaleDateString(
    isAr ? "ar-EG" : "en-US",
    { year: "numeric", month: "long" }
  );

  const sections: string[] = [];

  if (data.quranProgress) {
    sections.push(`
      <div class="section">
        <div class="section-title">
          <span class="icon">📖</span> ${isAr ? "القرآن الكريم والتجويد" : "Quran & Tajweed"}
        </div>
        <p>${data.quranProgress}</p>
      </div>
    `);
  }

  if (data.arabicIslamicStudies) {
    sections.push(`
      <div class="section">
        <div class="section-title">
          <span class="icon">📚</span> ${isAr ? "اللغة العربية والدراسات الإسلامية" : "Arabic & Islamic Studies"}
        </div>
        <p>${data.arabicIslamicStudies}</p>
      </div>
    `);
  }

  if (data.strengths) {
    sections.push(`
      <div class="section success">
        <div class="section-title">
          <span class="icon">✅</span> ${isAr ? "نقاط القوة" : "Strengths"}
        </div>
        <p>${data.strengths}</p>
      </div>
    `);
  }

  if (data.weaknesses) {
    sections.push(`
      <div class="section warning">
        <div class="section-title">
          <span class="icon">⚠️</span> ${isAr ? "نقاط الضعف" : "Weaknesses"}
        </div>
        <p>${data.weaknesses}</p>
      </div>
    `);
  }

  if (data.behaviorNotes) {
    sections.push(`
      <div class="section">
        <div class="section-title">
          <span class="icon">💬</span> ${isAr ? "ملاحظات سلوكية" : "Behavior Notes"}
        </div>
        <p>${data.behaviorNotes}</p>
      </div>
    `);
  }

  if (data.recommendations) {
    sections.push(`
      <div class="section highlight">
        <div class="section-title">
          <span class="icon">💡</span> ${isAr ? "التوصيات" : "Recommendations"}
        </div>
        <p>${data.recommendations}</p>
      </div>
    `);
  }

  const gradeColors: Record<string, string> = {
    A: "#16a34a", B: "#2563eb", C: "#f59e0b", D: "#f97316", F: "#ef4444",
  };
  const gradeColor = gradeColors[data.overallGrade] || "#6b7280";

  // Convert imported logo to absolute URL
  const absoluteLogo = new URL(logoUrl, window.location.origin).href;

  return `<!DOCTYPE html>
<html lang="${isAr ? "ar" : "en"}" dir="${dir}">
<head>
<meta charset="UTF-8">
<title>${isAr ? "التقرير الشهري" : "Monthly Report"} - ${data.studentName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
  
  * { margin: 0; padding: 0; box-sizing: border-box; }
  
  body {
    font-family: 'Tajawal', sans-serif;
    background: #f8fafc;
    color: #1e293b;
    direction: ${dir};
    padding: 0;
  }
  
  .page {
    max-width: 800px;
    margin: 0 auto;
    background: white;
    min-height: 100vh;
  }
  
  .header {
    background: linear-gradient(135deg, #1e3a5f 0%, #0f2640 100%);
    color: white;
    padding: 32px 40px;
    display: flex;
    align-items: center;
    gap: 24px;
  }
  
  .logo {
    width: 80px;
    height: 80px;
    border-radius: 16px;
    object-fit: contain;
    background: white;
    padding: 4px;
    flex-shrink: 0;
  }
  
  .header-text h1 {
    font-size: 28px;
    font-weight: 800;
    margin-bottom: 4px;
  }
  
  .header-text p {
    font-size: 14px;
    opacity: 0.85;
  }
  
  .meta-bar {
    background: #f1f5f9;
    padding: 20px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    border-bottom: 2px solid #e2e8f0;
  }
  
  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .meta-label {
    font-size: 11px;
    text-transform: uppercase;
    color: #64748b;
    font-weight: 700;
    letter-spacing: 0.5px;
  }
  
  .meta-value {
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
  }
  
  .grade-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: ${gradeColor}15;
    color: ${gradeColor};
    border: 2px solid ${gradeColor};
    border-radius: 12px;
    padding: 6px 16px;
    font-size: 16px;
    font-weight: 700;
  }
  
  .attendance-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #dbeafe;
    color: #1d4ed8;
    border-radius: 8px;
    padding: 4px 12px;
    font-size: 13px;
    font-weight: 600;
  }
  
  .content {
    padding: 32px 40px;
  }
  
  .section {
    margin-bottom: 24px;
    padding: 20px;
    background: #f8fafc;
    border-radius: 12px;
    border-${isAr ? "right" : "left"}: 4px solid #2563eb;
  }
  
  .section.success {
    border-${isAr ? "right" : "left"}-color: #16a34a;
    background: #f0fdf4;
  }
  
  .section.warning {
    border-${isAr ? "right" : "left"}-color: #f59e0b;
    background: #fffbeb;
  }
  
  .section.highlight {
    border-${isAr ? "right" : "left"}-color: #8b5cf6;
    background: #f5f3ff;
  }
  
  .section-title {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 10px;
    color: #334155;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .icon { font-size: 18px; }
  
  .section p {
    font-size: 14px;
    line-height: 1.8;
    color: #475569;
    white-space: pre-wrap;
  }
  
  .footer {
    text-align: center;
    padding: 24px 40px;
    border-top: 2px solid #e2e8f0;
    color: #94a3b8;
    font-size: 12px;
  }
  
  .footer strong { color: #64748b; }
  
  @media print {
    body { background: white; padding: 0; }
    .page { box-shadow: none; }
    .no-print { display: none !important; }
  }
  
  .print-btn {
    position: fixed;
    bottom: 24px;
    ${isAr ? "left" : "right"}: 24px;
    background: #1e3a5f;
    color: white;
    border: none;
    padding: 14px 28px;
    border-radius: 12px;
    font-family: 'Tajawal', sans-serif;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 100;
  }
  
  .print-btn:hover { background: #0f2640; }
</style>
</head>
<body>
  <div class="page">
    <div class="header">
      <img src="${absoluteLogo}" alt="Alhamd Academy" class="logo" />
      <div class="header-text">
        <h1>${isAr ? "أكاديمية الحمد" : "Alhamd Academy"}</h1>
        <p>${isAr ? "التقرير الشهري للطالب" : "Monthly Student Report"}</p>
      </div>
    </div>
    
    <div class="meta-bar">
      <div class="meta-item">
        <span class="meta-label">${isAr ? "الطالب" : "Student"}</span>
        <span class="meta-value">${data.studentName}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">${isAr ? "المعلم" : "Teacher"}</span>
        <span class="meta-value">${data.teacherName}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">${isAr ? "الشهر" : "Month"}</span>
        <span class="meta-value">${monthLabel}</span>
      </div>
      ${data.overallGrade ? `
      <div class="meta-item">
        <span class="meta-label">${isAr ? "التقدير" : "Grade"}</span>
        <span class="grade-badge">${data.gradeLabelAr}</span>
      </div>` : ""}
      ${data.attendanceRating ? `
      <div class="meta-item">
        <span class="meta-label">${isAr ? "الحضور" : "Attendance"}</span>
        <span class="attendance-badge">📊 ${data.attendanceLabelAr}</span>
      </div>` : ""}
    </div>
    
    <div class="content">
      ${sections.join("")}
    </div>
    
    <div class="footer">
      <p>${isAr ? "تم إصدار هذا التقرير من نظام" : "This report was generated by"} <strong>${isAr ? "أكاديمية الحمد" : "Alhamd Academy"}</strong></p>
    </div>
  </div>
  
  <button class="print-btn no-print" onclick="window.print()">
    🖨️ ${isAr ? "طباعة / تحميل PDF" : "Print / Download PDF"}
  </button>
</body>
</html>`;
}

export function openReportPreview(data: ReportData) {
  const html = generateReportHTML(data);
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export function generateWhatsAppText(data: ReportData): string {
  const isAr = data.lang === "ar";
  const monthLabel = new Date(data.reportMonth).toLocaleDateString(
    isAr ? "ar-EG" : "en-US",
    { year: "numeric", month: "long" }
  );

  const lines: string[] = [];
  lines.push(`*${isAr ? "📋 أكاديمية الحمد - التقرير الشهري" : "📋 Alhamd Academy - Monthly Report"}*`);
  lines.push("");
  lines.push(`👤 *${isAr ? "الطالب" : "Student"}:* ${data.studentName}`);
  lines.push(`📅 *${isAr ? "الشهر" : "Month"}:* ${monthLabel}`);
  if (data.overallGrade) lines.push(`🎯 *${isAr ? "التقدير العام" : "Grade"}:* ${data.gradeLabelAr}`);
  if (data.attendanceRating) lines.push(`📊 *${isAr ? "الحضور" : "Attendance"}:* ${data.attendanceLabelAr}`);

  if (data.quranProgress) {
    lines.push("");
    lines.push(`📖 *${isAr ? "القرآن والتجويد" : "Quran & Tajweed"}:*`);
    lines.push(data.quranProgress);
  }
  if (data.arabicIslamicStudies) {
    lines.push("");
    lines.push(`📚 *${isAr ? "اللغة العربية والدراسات الإسلامية" : "Arabic & Islamic Studies"}:*`);
    lines.push(data.arabicIslamicStudies);
  }
  if (data.strengths) {
    lines.push("");
    lines.push(`✅ *${isAr ? "نقاط القوة" : "Strengths"}:*`);
    lines.push(data.strengths);
  }
  if (data.weaknesses) {
    lines.push("");
    lines.push(`⚠️ *${isAr ? "نقاط الضعف" : "Weaknesses"}:*`);
    lines.push(data.weaknesses);
  }
  if (data.behaviorNotes) {
    lines.push("");
    lines.push(`💬 *${isAr ? "ملاحظات سلوكية" : "Behavior"}:*`);
    lines.push(data.behaviorNotes);
  }
  if (data.recommendations) {
    lines.push("");
    lines.push(`💡 *${isAr ? "التوصيات" : "Recommendations"}:*`);
    lines.push(data.recommendations);
  }

  lines.push("");
  lines.push(`_${isAr ? "أكاديمية الحمد لتحفيظ القرآن الكريم" : "Alhamd Academy for Quran Memorization"}_`);

  return lines.join("\n");
}
