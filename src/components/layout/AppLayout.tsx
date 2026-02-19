import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t, isRtl } = useLanguage();

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 z-50 w-64 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${
          isRtl
            ? `right-0 ${sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`
            : `left-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-card px-4 py-3 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-primary">{t("academyName")}</h1>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
