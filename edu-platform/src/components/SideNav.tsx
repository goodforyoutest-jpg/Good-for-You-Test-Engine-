import { type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookCopy, ChartNoAxesCombined, Compass, Flame, LayoutGrid, MessageSquareText, Trophy, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  to: string;
  labelKey: string;
  icon: ReactNode;
};

export function SideNav() {
  const { t } = useTranslation();

  const items: Item[] = [
    { to: "/app/dashboard", labelKey: "nav.dashboard", icon: <LayoutGrid className="h-4 w-4" /> },
    { to: "/app/catalog", labelKey: "nav.catalog", icon: <BookCopy className="h-4 w-4" /> },
    { to: "/app/progress", labelKey: "nav.progress", icon: <ChartNoAxesCombined className="h-4 w-4" /> },
    { to: "/app/recommendations", labelKey: "nav.recommendations", icon: <Compass className="h-4 w-4" /> },
    { to: "/app/community", labelKey: "nav.community", icon: <MessageSquareText className="h-4 w-4" /> },
    { to: "/app/community/challenges", labelKey: "nav.challenges", icon: <Trophy className="h-4 w-4" /> },
    { to: "/app/profile", labelKey: "nav.profile", icon: <User className="h-4 w-4" /> },
  ];

  return (
    <nav className="flex flex-col gap-1 p-2">
      <div className="px-2 pb-2 pt-1 text-[11px] font-medium uppercase tracking-widest text-white/40">Studio</div>
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          className={({ isActive }) =>
            cn(
              "flex h-10 items-center gap-2 rounded-xl px-3 text-sm text-white/70 transition",
              "hover:bg-white/5 hover:text-white",
              isActive && "bg-white/10 text-white ring-1 ring-white/10",
            )
          }
          end
        >
          {it.icon}
          <span>{t(it.labelKey)}</span>
        </NavLink>
      ))}
      <div className="mt-3 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 p-3 ring-1 ring-white/10">
        <div className="flex items-center gap-2 text-xs font-medium text-white/80">
          <Flame className="h-4 w-4 text-[color:var(--accent)]" />
          Focus streak
        </div>
        <div className="mt-2 text-xs text-white/55">Complete one micro-session today to keep the streak alive.</div>
      </div>
    </nav>
  );
}
