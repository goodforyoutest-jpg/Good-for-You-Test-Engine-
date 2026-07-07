import { create } from "zustand";
import i18n, { type SupportedLocale, supportedLocales } from "@/i18n/i18n";

type LocaleState = {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
};

function readInitialLocale(): SupportedLocale {
  const saved = localStorage.getItem("locale");
  if (saved && (supportedLocales as readonly string[]).includes(saved)) {
    return saved as SupportedLocale;
  }
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith("ja")) return "ja";
  if (nav.startsWith("ko")) return "ko";
  return "en";
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: readInitialLocale(),
  setLocale: (locale) => {
    localStorage.setItem("locale", locale);
    void i18n.changeLanguage(locale);
    set({ locale });
  },
}));

export function initLocale() {
  const locale = readInitialLocale();
  localStorage.setItem("locale", locale);
  void i18n.changeLanguage(locale);
  useLocaleStore.setState({ locale });
}

