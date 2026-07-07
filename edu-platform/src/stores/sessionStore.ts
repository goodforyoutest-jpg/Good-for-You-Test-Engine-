import { create } from "zustand";
import { signOutUser } from "@/services/authService";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
};

type SessionState = {
  user: SessionUser | null;
  provider: "firebase" | "demo" | null;
  setUser: (user: SessionUser | null, provider: "firebase" | "demo") => void;
  signInDemo: (input: { email: string; displayName?: string }) => void;
  signOut: () => Promise<void>;
};

function readUser(): SessionUser | null {
  const raw = localStorage.getItem("sessionUser");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export const useSessionStore = create<SessionState>((set, get) => ({
  user: readUser(),
  provider: readUser() ? "demo" : null,
  setUser: (user, provider) => {
    if (provider === "demo") {
      if (user) localStorage.setItem("sessionUser", JSON.stringify(user));
      else localStorage.removeItem("sessionUser");
    } else {
      localStorage.removeItem("sessionUser");
    }
    set({ user, provider: user ? provider : null });
  },
  signInDemo: ({ email, displayName }) => {
    const user: SessionUser = {
      id: `demo_${Math.random().toString(36).slice(2)}`,
      email,
      displayName: displayName || email.split("@")[0] || "Learner",
    };
    localStorage.setItem("sessionUser", JSON.stringify(user));
    set({ user, provider: "demo" });
  },
  signOut: async () => {
    const provider = get().provider;
    if (provider === "firebase") {
      await signOutUser();
      return;
    }
    localStorage.removeItem("sessionUser");
    set({ user: null, provider: null });
  },
}));
