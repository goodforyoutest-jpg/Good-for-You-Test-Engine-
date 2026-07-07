import { Outlet } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { SideNav } from "@/components/SideNav";

export function ProtectedLayout() {
  return (
    <div className="min-h-dvh bg-[color:var(--bg)] text-[color:var(--fg)]">
      <TopBar />
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[240px_1fr]">
        <aside className="hidden md:block">
          <div className="sticky top-20 rounded-2xl bg-white/5 ring-1 ring-white/10">
            <SideNav />
          </div>
        </aside>
        <main className="rounded-2xl bg-[color:var(--surface)] ring-1 ring-white/10">
          <div className="p-5 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

