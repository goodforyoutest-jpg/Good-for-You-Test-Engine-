import { Crown, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";

const leaderboard = [
  { name: "Mina", points: 320 },
  { name: "Jun", points: 280 },
  { name: "You", points: 190 },
  { name: "Sora", points: 175 },
];

export default function Challenges() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-white/60">Challenges</div>
        <h1 className="mt-1 text-2xl font-semibold text-white">Achievement incentives</h1>
        <div className="mt-2 text-sm text-white/65">Weekly goals, points, and friendly competition.</div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Zap className="h-4 w-4 text-[color:var(--accent)]" />
              Weekly sprint
            </div>
            <Button variant="secondary" size="sm">
              Join
            </Button>
          </div>
          <div className="mt-3 text-sm text-white/65">Complete 5 micro-sessions + 2 shadowing takes.</div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[38%] bg-[color:var(--accent)]" />
          </div>
          <div className="mt-2 text-xs text-white/50">38% complete · Reward: 120 points</div>
        </div>

        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Trophy className="h-4 w-4 text-[color:var(--accent)]" />
            Leaderboard
          </div>
          <div className="mt-4 space-y-2">
            {leaderboard.map((x, idx) => (
              <div key={x.name} className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
                <div className="flex items-center gap-2 text-sm text-white/75">
                  <span className="w-5 text-xs text-white/45">{idx + 1}</span>
                  <span className="font-medium text-white">{x.name}</span>
                  {idx === 0 ? <Crown className="h-4 w-4 text-[color:var(--accent)]" /> : null}
                </div>
                <div className="text-xs text-white/55">{x.points}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-white/50">Points will be computed from real progress events.</div>
        </div>
      </div>
    </div>
  );
}

