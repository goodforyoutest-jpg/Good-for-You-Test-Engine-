import { subscribeAuth } from "@/services/authService";
import { upsertUserDoc, getUserDoc } from "@/services/userService";
import { useSessionStore } from "@/stores/sessionStore";
import { useLocaleStore } from "@/stores/localeStore";
import { useProfileStore } from "@/stores/profileStore";

export function initSessionSync() {
  return subscribeAuth(async (fbUser) => {
    if (!fbUser) {
      useSessionStore.getState().setUser(null, "firebase");
      return;
    }

    const locale = useLocaleStore.getState().locale;
    await upsertUserDoc({
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName,
      locale,
    });

    useSessionStore.getState().setUser(
      {
        id: fbUser.uid,
        email: fbUser.email || "",
        displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "Learner",
      },
      "firebase",
    );

    const doc = await getUserDoc(fbUser.uid);
    if (doc?.learnerProfile) {
      useProfileStore.getState().setProfile(doc.learnerProfile);
    }
  });
}

