import { create } from "zustand";

export type GoalFocus = "speaking" | "listening" | "exam" | "balanced";

export type LearnerProfile = {
  targetLanguage: string;
  levelCode: string;
  goalFocus: GoalFocus;
};

type ProfileState = {
  profile: LearnerProfile | null;
  setProfile: (profile: LearnerProfile) => void;
};

function readProfile(): LearnerProfile | null {
  const raw = localStorage.getItem("learnerProfile");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LearnerProfile;
  } catch {
    return null;
  }
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: readProfile(),
  setProfile: (profile) => {
    localStorage.setItem("learnerProfile", JSON.stringify(profile));
    set({ profile });
  },
}));

