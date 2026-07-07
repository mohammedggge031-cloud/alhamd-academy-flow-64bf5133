import { MessageCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  openWhatsApp,
  buildHomeworkMessage,
  buildSessionReminderMessage,
  buildInvoiceMessage,
  MsgLang,
} from "@/utils/whatsappLinks";

type Context = "student" | "teacher" | "invoice";

interface Props {
  phone: string | null | undefined;
  displayName: string;
  context?: Context;
  extra?: {
    teacherName?: string;
    sessionDate?: string;
    startTime?: string;
    durationMinutes?: number;
    invoiceTotal?: number;
    invoiceHours?: number | null;
    invoiceDueDate?: string | null;
  };
  size?: "sm" | "icon";
}

const WhatsAppQuickMenu = ({ phone, displayName, context = "student", extra, size = "icon" }: Props) => {
  const { t, language } = useLanguage();
  const lang: MsgLang = language === "ar" ? "ar" : "en";

  if (!phone) return null;

  const send = (msg: string) => openWhatsApp(phone, msg);
  const sendGreeting = () =>
    send(
      lang === "ar"
        ? `السلام عليكم ورحمة الله وبركاته\n\n${displayName}`
        : `Assalamu Alaikum\n\n${displayName}`
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size={size === "icon" ? "icon" : "sm"}
          className="text-[#25D366] hover:text-[#25D366] hover:bg-[#25D366]/10"
          aria-label={t("whatsappActions")}
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t("whatsappActions")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={sendGreeting}>{t("waCustomMessage")}</DropdownMenuItem>

        {context === "student" && (
          <>
            <DropdownMenuItem
              onClick={() =>
                send(buildHomeworkMessage(displayName, lang === "ar" ? "..." : "...", lang))
              }
            >
              {t("waSendHomework")}
            </DropdownMenuItem>
            {extra?.teacherName && extra?.sessionDate && extra?.startTime && (
              <DropdownMenuItem
                onClick={() =>
                  send(
                    buildSessionReminderMessage(
                      "student",
                      displayName,
                      extra.teacherName!,
                      extra.sessionDate!,
                      extra.startTime!,
                      extra.durationMinutes ?? 60,
                      lang
                    )
                  )
                }
              >
                {t("waSessionReminder")}
              </DropdownMenuItem>
            )}
          </>
        )}

        {context === "invoice" && extra?.invoiceTotal !== undefined && (
          <DropdownMenuItem
            onClick={() =>
              send(
                buildInvoiceMessage(
                  displayName,
                  extra.invoiceTotal!,
                  extra.invoiceHours ?? null,
                  extra.invoiceDueDate ?? null,
                  lang
                )
              )
            }
          >
            {t("waSendInvoice")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default WhatsAppQuickMenu;
