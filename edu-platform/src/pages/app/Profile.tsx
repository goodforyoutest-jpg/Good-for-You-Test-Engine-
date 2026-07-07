import { Link } from "react-router-dom";
import { Award, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useSessionStore } from "@/stores/sessionStore";
import { useProfileStore } from "@/stores/profileStore";

export default function Profile() {
  const user = useSessionStore((s) => s.user);
  const profile = useProfileStore((s) => s.profile);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-white/60">Profile</div>
        <h1 className="mt-1 text-2xl font-semibold text-white">Your learning identity</h1>
        <div className="mt-2 text-sm text-white/65">Achievements and settings will live here.</div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/10">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{user?.displayName || "Learner"}</div>
              <div className="text-xs text-white/55">{user?.email || "Not signed in"}</div>
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <div className="text-xs font-medium text-white/70">Learning profile</div>
            <div className="mt-2 text-sm text-white/70">
              {profile ? `${profile.targetLanguage.toUpperCase()} · ${profile.levelCode} · ${profile.goalFocus}` : "Not set"}
            </div>
            <div className="mt-3">
              <Link to="/onboarding">
                <Button variant="secondary" size="sm">
                  <Settings className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 md:col-span-2">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Award className="h-4 w-4 text-[color:var(--accent)]" />
            Achievements
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {["7-day streak", "First shadowing take", "100 vocab mastered"].map((x) => (
              <div key={x} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                <div className="text-sm font-medium text-white">{x}</div>
                <div className="mt-2 text-xs text-white/55">Locked</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-white/50">Unlock conditions will be evaluated after each session.</div>
        </div>
      </div>
    </div>
  );
}

