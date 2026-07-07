import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, BookCopy, Filter } from "lucide-react";
import { Button } from "@/components/ui/Button";

const demoCourses = [
  { id: "en-a1", title: "English · A1 Foundations", desc: "Core survival phrases, pronunciation, and listening basics.", level: "A1" },
  { id: "ja-n5", title: "Japanese · JLPT N5 Starter", desc: "Kana, particles, and everyday dialogs with shadowing.", level: "N5" },
  { id: "ko-a1", title: "Korean · A1 Hangul & Rhythm", desc: "Hangul fluency, 받침, and short listening drills.", level: "A1" },
];

export default function Catalog() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm text-white/60">{t("nav.catalog")}</div>
          <h1 className="mt-1 text-2xl font-semibold text-white">Browse by level</h1>
          <div className="mt-2 text-sm text-white/65">Pick a course and jump into the learning player.</div>
        </div>
        <Button variant="secondary" size="sm">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {demoCourses.map((c) => (
          <div key={c.id} className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 text-sm font-medium text-white">
                <BookCopy className="h-4 w-4 text-[color:var(--accent)]" />
                {c.level}
              </div>
              <div className="text-xs text-white/55">6 lessons</div>
            </div>
            <div className="mt-3 text-lg font-semibold text-white">{c.title}</div>
            <div className="mt-2 text-sm text-white/65">{c.desc}</div>
            <div className="mt-5">
              <Link to={`/app/courses/${c.id}`}>
                <Button variant="secondary" className="w-full">
                  Open
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

