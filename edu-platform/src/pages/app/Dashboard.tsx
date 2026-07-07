import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, BookCopy, CheckCircle2, Clock, Compass, Flame } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useProfileStore } from "@/stores/profileStore";
import { useSessionStore } from "@/stores/sessionStore";

export default function Dashboard() {
  const { t } = useTranslation();
  const user = useSessionStore((s) => s.user);
  const profile = useProfileStore((s) => s.profile);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm text-white/60">{t("nav.dashboard")}</div>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            {user ? `Hi, ${user.displayName}` : "Hi"}
            <span className="text-white/40">.</span>
          </h1>
          <div className="mt-2 text-sm text-white/65">
            {profile ? `${profile.targetLanguage.toUpperCase()} · ${profile.levelCode} · ${profile.goalFocus}` : "Set your goals to get recommendations."}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/app/recommendations">
            <Button variant="secondary" size="sm">
              <Compass className="h-4 w-4" />
              {t("nav.recommendations")}
            </Button>
          </Link>
          <Link to="/app/catalog">
            <Button size="sm">
              <BookCopy className="h-4 w-4" />
              {t("nav.catalog")}
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-white">Today’s plan</div>
            <div className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-xs text-white/60 ring-1 ring-white/10">
              <Clock className="h-3.5 w-3.5" />
              12 min
            </div>
          </div>
          <div className="mt-3 space-y-2 text-sm text-white/65">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-white/40" />
              10 vocab review
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-white/40" />
              6 grammar drills
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-white/40" />
              1 listening clip
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-white/40" />
              1 shadowing take
            </div>
          </div>
          <div className="mt-5">
            <Link to="/app/catalog">
              <Button variant="secondary" className="w-full">
                Start session
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-white">Streak</div>
            <Flame className="h-4 w-4 text-[color:var(--accent)]" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-white">3</div>
          <div className="mt-1 text-sm text-white/65">days in a row</div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[45%] bg-[color:var(--accent)]" />
          </div>
          <div className="mt-2 text-xs text-white/50">Next milestone: 7-day badge</div>
        </div>

        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
          <div className="text-sm font-medium text-white">Skill balance</div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
              <div className="text-white/60">Vocabulary</div>
              <div className="mt-1 text-white">62%</div>
            </div>
            <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
              <div className="text-white/60">Grammar</div>
              <div className="mt-1 text-white">51%</div>
            </div>
            <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
              <div className="text-white/60">Listening</div>
              <div className="mt-1 text-white">48%</div>
            </div>
            <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
              <div className="text-white/60">Speaking</div>
              <div className="mt-1 text-white">39%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

