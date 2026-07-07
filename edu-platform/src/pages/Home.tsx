import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, AudioLines, BookOpenCheck, Globe, Mic, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-white/10 to-white/5 p-6 ring-1 ring-white/10 md:p-10">
      <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(800px_circle_at_20%_20%,rgba(232,191,74,0.18),transparent_60%),radial-gradient(700px_circle_at_80%_70%,rgba(72,141,214,0.16),transparent_60%)]" />

      <div className="relative grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-white/70 ring-1 ring-white/10">
            <Sparkles className="h-3.5 w-3.5 text-[color:var(--accent)]" />
            {t("tagline")}
          </div>

          <h1 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-white md:text-5xl">
            Immersive, leveled language learning—built to feel like practice, not homework.
          </h1>

          <p className="mt-4 max-w-2xl text-pretty text-sm leading-6 text-white/70 md:text-base">
            Courses are structured by level. Each lesson blends vocabulary, grammar drills, shadowing, and listening training.
            Progress stays visible, recommendations stay personal, and community incentives keep you consistent.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/auth/signup">
              <Button>
                {t("ctaSignup")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth/login">
              <Button variant="secondary">{t("ctaLogin")}</Button>
            </Link>
            <Link to="/app/dashboard" className="text-sm text-white/70 hover:text-white">
              {t("ctaStart")}
            </Link>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <BookOpenCheck className="h-4 w-4 text-[color:var(--accent)]" />
                Leveled courses
              </div>
              <div className="mt-2 text-sm text-white/65">A1–C2, JLPT, and custom tracks across languages.</div>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <AudioLines className="h-4 w-4 text-[color:var(--accent)]" />
                Skill modules
              </div>
              <div className="mt-2 text-sm text-white/65">Vocab SRS, grammar drills, listening, and shadowing.</div>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <Globe className="h-4 w-4 text-[color:var(--accent)]" />
                Multilingual UI
              </div>
              <div className="mt-2 text-sm text-white/65">English, Japanese, Korean—and expandable resources.</div>
            </div>
          </div>
        </div>

        <div className="relative rounded-3xl bg-[color:var(--surface)] p-5 ring-1 ring-white/10">
          <div className="text-xs font-medium uppercase tracking-widest text-white/45">Module preview</div>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <Mic className="h-4 w-4 text-[color:var(--accent)]" />
                  Shadowing
                </div>
                <div className="text-xs text-white/55">00:45</div>
              </div>
              <div className="mt-2 text-sm text-white/65">Play → repeat → record → compare. Speed control included.</div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[62%] bg-[color:var(--accent)]" />
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <Sparkles className="h-4 w-4 text-[color:var(--accent)]" />
                  Review queue
                </div>
                <div className="text-xs text-white/55">8 items</div>
              </div>
              <div className="mt-2 text-sm text-white/65">Weak points automatically return with spaced repetition.</div>
            </div>

            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="text-sm font-medium text-white">Today’s micro-session</div>
              <div className="mt-2 text-sm text-white/65">
                10 vocab → 6 grammar → 1 listening clip → 1 shadowing take
              </div>
              <div className="mt-4">
                <Button variant="secondary" className="w-full">
                  {t("ctaStart")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
