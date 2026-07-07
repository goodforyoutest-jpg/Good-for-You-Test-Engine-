import { useLocaleStore } from "@/stores/localeStore";
import { supportedLocales, type SupportedLocale } from "@/i18n/i18n";
import { cn } from "@/lib/utils";

const labels: Record<SupportedLocale, string> = {
  en: "EN",
  ja: "日本語",
  ko: "한국어",
};

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocaleStore();

  return (
    <div
      className={cn(
        "inline-flex h-10 items-center rounded-xl bg-white/5 p-1 ring-1 ring-white/10",
        className,
      )}
      role="tablist"
      aria-label="Language"
    >
      {supportedLocales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          className={cn(
            "h-8 rounded-lg px-2 text-xs font-medium transition",
            l === locale ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10",
          )}
          role="tab"
          aria-selected={l === locale}
        >
          {labels[l]}
        </button>
      ))}
    </div>
  );
}

