import { Outlet } from "react-router-dom";
import { TopBar } from "@/components/TopBar";

export function PublicLayout() {
  return (
    <div className="min-h-dvh bg-[color:var(--bg)] text-[color:var(--fg)]">
      <TopBar />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <Outlet />
      </main>
    </div>
  );
}

