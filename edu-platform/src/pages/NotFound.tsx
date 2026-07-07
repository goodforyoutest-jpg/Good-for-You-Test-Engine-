import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-3xl bg-[color:var(--surface)] p-8 ring-1 ring-white/10">
      <div className="text-sm text-white/60">404</div>
      <h1 className="mt-2 text-2xl font-semibold text-white">Page not found</h1>
      <div className="mt-3 text-sm text-white/65">The route you opened does not exist.</div>
      <div className="mt-6">
        <Link to="/">
          <Button variant="secondary">Back to home</Button>
        </Link>
      </div>
    </div>
  );
}

