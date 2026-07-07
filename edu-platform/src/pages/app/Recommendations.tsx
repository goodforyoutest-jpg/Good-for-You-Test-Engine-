import { Compass, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { useProfileStore } from "@/stores/profileStore";

export default function Recommendations() {
  const profile = useProfileStore((s) => s.profile);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm text-white/60">Learning path</div>
          <h1 className="mt-1 text-2xl font-semibold text-white">Personalized recommendations</h1>
          <div className="mt-2 text-sm text-white/65">
            {profile ? `Optimized for ${profile.goalFocus} at ${profile.levelCode}.` : "Complete onboarding to unlock personalized suggestions."}
          </div>
        </div>
        <Link to="/app/catalog">
          <Button variant="secondary" size="sm">
            Browse courses
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 md:col-span-2">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Compass className="h-4 w-4 text-[color:var(--accent)]" />
            Next steps
          </div>
          <div className="mt-4 space-y-2">
            {["Review 8 vocab items", "Lesson: sentence rhythm", "Listening: short dialog A"].map((s) => (
              <div key={s} className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
                <div className="flex items-center gap-2 text-sm text-white/75">
                  <CheckCircle2 className="h-4 w-4 text-white/40" />
                  {s}
                </div>
                <Button size="sm" variant="ghost">
                  Start
                </Button>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
          <div className="text-sm font-medium text-white">Why these?</div>
          <div className="mt-3 space-y-2 text-sm text-white/65">
            <div>1) Weak speaking mastery → more shadowing.</div>
            <div>2) Recent misses in grammar drills → targeted practice.</div>
            <div>3) Goal focus → balance review vs. new content.</div>
          </div>
          <div className="mt-4 text-xs text-white/50">This panel becomes data-backed once progress tracking is live.</div>
        </div>
      </div>
    </div>
  );
}

