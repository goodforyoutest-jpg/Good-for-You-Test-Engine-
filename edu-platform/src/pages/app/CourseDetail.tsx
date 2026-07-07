import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, AudioLines, BookOpenCheck, Mic, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

const demoLessons = [
  { id: "l1", title: "Warm-up: sounds + rhythm", minutes: 8 },
  { id: "l2", title: "Core phrases + shadowing", minutes: 12 },
  { id: "l3", title: "Grammar: sentence building", minutes: 10 },
];

export default function CourseDetail() {
  const { courseId } = useParams();

  const title = useMemo(() => {
    if (!courseId) return "Course";
    if (courseId.includes("ja")) return "Japanese · JLPT Starter";
    if (courseId.includes("ko")) return "Korean · Hangul & Rhythm";
    return "English · Foundations";
  }, [courseId]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-b from-white/10 to-white/5 p-6 ring-1 ring-white/10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-white/70 ring-1 ring-white/10">
              <Sparkles className="h-3.5 w-3.5 text-[color:var(--accent)]" />
              Level-driven curriculum
            </div>
            <h1 className="mt-4 text-2xl font-semibold text-white md:text-3xl">{title}</h1>
            <div className="mt-2 text-sm text-white/65">Each lesson blends vocab, grammar, listening, and shadowing.</div>
          </div>
          <Link to="/app/learn/l1">
            <Button>
              Resume
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <BookOpenCheck className="h-4 w-4 text-[color:var(--accent)]" />
            Vocabulary + Grammar
          </div>
          <div className="mt-2 text-sm text-white/65">Interactive drills with immediate feedback.</div>
        </div>
        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <AudioLines className="h-4 w-4 text-[color:var(--accent)]" />
            Listening
          </div>
          <div className="mt-2 text-sm text-white/65">Segment replay, dictation, and comprehension checks.</div>
        </div>
        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Mic className="h-4 w-4 text-[color:var(--accent)]" />
            Shadowing
          </div>
          <div className="mt-2 text-sm text-white/65">Record your take and compare with reference audio.</div>
        </div>
      </div>

      <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
        <div className="text-sm font-medium text-white">Lessons</div>
        <div className="mt-4 space-y-2">
          {demoLessons.map((l) => (
            <Link
              key={l.id}
              to={`/app/learn/${l.id}`}
              className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/75 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
            >
              <span>{l.title}</span>
              <span className="text-xs text-white/55">{l.minutes} min</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

