import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpenText, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSessionStore } from "@/stores/sessionStore";

export function TopBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, signOut } = useSessionStore();

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[color:var(--bg)]/70 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="group inline-flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 ring-1 ring-white/10 transition group-hover:bg-white/10">
            <BookOpenText className="h-5 w-5 text-white/90" />
          </span>
          <span className="text-sm font-semibold tracking-wide text-white/90">{t("appName")}</span>
        </Link>

        <div className="flex items-center gap-2">
          <LanguageSwitcher className="hidden sm:inline-flex" />
          <ThemeToggle />

          {user ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                void signOut().then(() => navigate("/"));
              }}
            >
              <LogOut className="h-4 w-4" />
              {t("auth.logout")}
            </Button>
          ) : (
            <Button type="button" variant="secondary" size="sm" onClick={() => navigate("/auth/login")}>
              <LogIn className="h-4 w-4" />
              {t("ctaLogin")}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
