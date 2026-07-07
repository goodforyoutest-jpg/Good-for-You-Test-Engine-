import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSessionStore } from "@/stores/sessionStore";

export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useSessionStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
