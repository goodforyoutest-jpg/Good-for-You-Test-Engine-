import { CalendarDays, ChartNoAxesCombined, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function Progress() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm text-white/60">Progress</div>
          <h1 className="mt-1 text-2xl font-semibold text-white">Track what improves</h1>
          <div className="mt-2 text-sm text-white/65">Skill mastery, streaks, and lesson completion live here.</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button variant="secondary" size="sm">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <ChartNoAxesCombined className="h-4 w-4 text-[color:var(--accent)]" />
            Mastery
          </div>
          <div className="mt-3 space-y-2 text-sm text-white/65">
            <div className="flex items-center justify-between">
              <span>Vocabulary</span>
              <span className="text-white">62%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[62%] bg-[color:var(--accent)]" />
            </div>
            <div className="flex items-center justify-between">
              <span>Listening</span>
              <span className="text-white">48%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[48%] bg-[color:var(--accent)]" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 md:col-span-2">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <CalendarDays className="h-4 w-4 text-[color:var(--accent)]" />
            Streak calendar
          </div>
          <div className="mt-4 grid grid-cols-7 gap-2">
            {Array.from({ length: 28 }).map((_, i) => (
              <div
                key={i}
                className={[
                  "aspect-square rounded-lg ring-1 ring-white/10",
                  i % 3 === 0 ? "bg-[color:var(--accent)]/40" : "bg-white/5",
                ].join(" ")}
              />
            ))}
          </div>
          <div className="mt-3 text-xs text-white/50">Real data will be connected once progress events are recorded.</div>
        </div>
      </div>
    </div>
  );
}

