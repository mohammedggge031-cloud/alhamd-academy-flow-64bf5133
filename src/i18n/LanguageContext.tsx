import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import translations, { Lang, TranslationKey } from "./translations";

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
  dir: "ltr" | "rtl";
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("app-lang");
    if (saved === "ar" || saved === "en") return saved;
    return "en";
  });

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem("app-lang", newLang);
  };

  const t = (key: TranslationKey): string => {
    const entry = translations[key];
    return entry ? entry[lang] : key;
  };

  const dir = lang === "ar" ? "rtl" : "ltr";
  const isRtl = lang === "ar";

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    document.body.style.fontFamily = lang === "ar" 
      ? "'Cairo', sans-serif" 
      : "'Inter', 'Cairo', sans-serif";
  }, [lang, dir]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir, isRtl }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};
