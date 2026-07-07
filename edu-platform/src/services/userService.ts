import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { firestore } from "@/firebase/firebaseApp";
import type { LearnerProfile } from "@/stores/profileStore";

export type UserDoc = {
  uid: string;
  email: string | null;
  displayName: string | null;
  locale: string;
  createdAt?: unknown;
  learnerProfile?: LearnerProfile;
};

export async function upsertUserDoc(input: { uid: string; email: string | null; displayName: string | null; locale: string }) {
  const ref = doc(firestore, "users", input.uid);
  const payload: UserDoc = {
    uid: input.uid,
    email: input.email,
    displayName: input.displayName,
    locale: input.locale,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, payload, { merge: true });
}

export async function getUserDoc(uid: string) {
  const ref = doc(firestore, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

export async function saveLearnerProfile(uid: string, profile: LearnerProfile) {
  const ref = doc(firestore, "users", uid);
  await setDoc(ref, { learnerProfile: profile }, { merge: true });
}

