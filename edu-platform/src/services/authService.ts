import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { firebaseAuth } from "@/firebase/firebaseApp";

export async function signUpWithEmail(input: { email: string; password: string; displayName: string }) {
  const cred = await createUserWithEmailAndPassword(firebaseAuth, input.email, input.password);
  await updateProfile(cred.user, { displayName: input.displayName });
  return cred.user;
}

export async function signInWithEmail(input: { email: string; password: string }) {
  const cred = await signInWithEmailAndPassword(firebaseAuth, input.email, input.password);
  return cred.user;
}

export async function signOutUser() {
  await signOut(firebaseAuth);
}

export function subscribeAuth(callback: (user: typeof firebaseAuth.currentUser) => void) {
  return onAuthStateChanged(firebaseAuth, callback);
}

