import { type ReactNode, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { AudioLines, BookText, Mic, Puzzle } from "lucide-react";
import { Button } from "@/components/ui/Button";

type ModuleType = "vocab" | "grammar" | "listening" | "shadowing";

const modules: Array<{ type: ModuleType; title: string; icon: ReactNode; desc: string }> = [
  { type: "vocab", title: "Vocabulary", icon: <BookText className="h-4 w-4" />, desc: "Flashcards + spaced repetition." },
  { type: "grammar", title: "Grammar", icon: <Puzzle className="h-4 w-4" />, desc: "Drills with explanations." },
  { type: "listening", title: "Listening", icon: <AudioLines className="h-4 w-4" />, desc: "Replay-by-segment + dictation." },
  { type: "shadowing", title: "Shadowing", icon: <Mic className="h-4 w-4" />, desc: "Record + compare." },
];

export default function Learn() {
  const { lessonId } = useParams();
  const [active, setActive] = useState<ModuleType>("vocab");

  const headline = useMemo(() => {
    if (!lessonId) return "Lesson";
    if (lessonId === "l2") return "Core phrases + shadowing";
    if (lessonId === "l3") return "Grammar: sentence building";
    return "Warm-up: sounds + rhythm";
  }, [lessonId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm text-white/60">Learning Player</div>
          <h1 className="mt-1 text-2xl font-semibold text-white">{headline}</h1>
          <div className="mt-2 text-sm text-white/65">This is the MVP shell; interactive modules are implemented next.</div>
        </div>
        <Button variant="secondary" size="sm">
          Save checkpoint
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <div className="rounded-3xl bg-white/5 p-3 ring-1 ring-white/10">
          <div className="px-2 pb-2 pt-1 text-[11px] font-medium uppercase tracking-widest text-white/40">Modules</div>
          <div className="space-y-2">
            {modules.map((m) => (
              <button
                key={m.type}
                type="button"
                onClick={() => setActive(m.type)}
                className={[
                  "w-full rounded-2xl px-3 py-3 text-left ring-1 transition",
                  active === m.type
                    ? "bg-white/10 text-white ring-white/15"
                    : "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="text-[color:var(--accent)]">{m.icon}</span>
                  {m.title}
                </div>
                <div className="mt-1 text-xs text-white/55">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
          <div className="text-sm font-medium text-white">Module: {modules.find((m) => m.type === active)?.title}</div>
          <div className="mt-2 text-sm text-white/65">
            Next step: implement real exercises (SRS cards, grammar checks, listening clips, and recording).
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="text-xs font-medium text-white/70">Goal</div>
              <div className="mt-2 text-sm text-white/70">Short, interactive reps. Immediate feedback. Track mastery.</div>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="text-xs font-medium text-white/70">Progress</div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[18%] bg-[color:var(--accent)]" />
              </div>
              <div className="mt-2 text-xs text-white/50">18% complete</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
