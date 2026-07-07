import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useSessionStore } from "@/stores/sessionStore";
import { signInWithEmail } from "@/services/authService";

type LocationState = { from?: string };

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from;
  const { signInDemo } = useSessionStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => email.includes("@") && password.length >= 4, [email, password]);

  return (
    <div className="mx-auto max-w-md rounded-3xl bg-[color:var(--surface)] p-6 ring-1 ring-white/10 md:p-8">
      <h1 className="text-xl font-semibold text-white">{t("auth.titleLogin")}</h1>
      <p className="mt-2 text-sm text-white/65">{t("auth.demoHint")}</p>

      <div className="mt-6 space-y-3">
        <div>
          <div className="mb-1 text-xs font-medium text-white/70">{t("auth.email")}</div>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <div className="mb-1 text-xs font-medium text-white/70">{t("auth.password")}</div>
          <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type="password" />
        </div>
        <Button
          className="w-full"
          disabled={!canSubmit}
          onClick={async () => {
            setError(null);
            try {
              await signInWithEmail({ email, password });
              navigate(from || "/onboarding");
            } catch (e) {
              signInDemo({ email });
              setError("Firebase sign-in failed in this environment, so a local demo session was created.");
              navigate(from || "/onboarding");
            }
          }}
        >
          {t("auth.submitLogin")}
        </Button>
      </div>

      {error ? <div className="mt-4 rounded-2xl bg-white/5 p-3 text-xs text-white/70 ring-1 ring-white/10">{error}</div> : null}

      <div className="mt-6 text-sm text-white/70">
        No account?{" "}
        <Link to="/auth/signup" className="text-white hover:underline">
          {t("ctaSignup")}
        </Link>
      </div>
    </div>
  );
}
