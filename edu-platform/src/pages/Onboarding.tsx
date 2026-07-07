import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { useProfileStore, type GoalFocus } from "@/stores/profileStore";
import { useLocaleStore } from "@/stores/localeStore";

const targetLanguages = [
  { code: "en", label: "English" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
];

const levels = ["A1", "A2", "B1", "B2", "C1", "C2", "N5", "N4", "N3", "N2", "N1"];

const goals: Array<{ value: GoalFocus; label: string }> = [
  { value: "balanced", label: "Balanced" },
  { value: "speaking", label: "Speaking" },
  { value: "listening", label: "Listening" },
  { value: "exam", label: "Exam prep" },
];

export default function Onboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, setProfile } = useProfileStore();
  const { locale, setLocale } = useLocaleStore();

  const [targetLanguage, setTargetLanguage] = useState(profile?.targetLanguage || "en");
  const [levelCode, setLevelCode] = useState(profile?.levelCode || "A1");
  const [goalFocus, setGoalFocus] = useState<GoalFocus>(profile?.goalFocus || "balanced");

  const canSave = useMemo(() => Boolean(targetLanguage && levelCode && goalFocus), [goalFocus, levelCode, targetLanguage]);

  return (
    <div className="mx-auto max-w-2xl rounded-3xl bg-[color:var(--surface)] p-6 ring-1 ring-white/10 md:p-10">
      <h1 className="text-2xl font-semibold text-white">{t("onboarding.title")}</h1>
      <p className="mt-2 text-sm text-white/65">
        This config drives course levels, daily plans, and how we prioritize review vs. new content.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <div className="text-xs font-medium text-white/70">{t("onboarding.uiLanguage")}</div>
          <select
            className="mt-2 h-11 w-full rounded-xl bg-[color:var(--surface-2)] px-3 text-sm text-white ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
            value={locale}
            onChange={(e) => setLocale(e.target.value as typeof locale)}
          >
            <option value="en">English</option>
            <option value="ja">日本語</option>
            <option value="ko">한국어</option>
          </select>
        </div>

        <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <div className="text-xs font-medium text-white/70">{t("onboarding.targetLanguage")}</div>
          <select
            className="mt-2 h-11 w-full rounded-xl bg-[color:var(--surface-2)] px-3 text-sm text-white ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
          >
            {targetLanguages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <div className="text-xs font-medium text-white/70">{t("onboarding.level")}</div>
          <select
            className="mt-2 h-11 w-full rounded-xl bg-[color:var(--surface-2)] px-3 text-sm text-white ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
            value={levelCode}
            onChange={(e) => setLevelCode(e.target.value)}
          >
            {levels.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
        <div className="text-xs font-medium text-white/70">{t("onboarding.goal")}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {goals.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => setGoalFocus(g.value)}
              className={[
                "h-10 rounded-xl px-3 text-sm font-medium ring-1 transition",
                g.value === goalFocus
                  ? "bg-[color:var(--accent)] text-[color:var(--accent-foreground)] ring-transparent"
                  : "bg-white/5 text-white/75 ring-white/10 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-end gap-3">
        <Button
          disabled={!canSave}
          onClick={() => {
            setProfile({ targetLanguage, levelCode, goalFocus });
            navigate("/app/dashboard");
          }}
        >
          {t("onboarding.save")}
        </Button>
      </div>
    </div>
  );
}

