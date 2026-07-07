import { type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
};

export function Button({ className, variant = "primary", size = "md", ...props }: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)]",
        "disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-9 px-3 text-sm" : "h-11 px-4 text-sm",
        variant === "primary" &&
          "bg-[color:var(--accent)] text-[color:var(--accent-foreground)] shadow-[0_12px_30px_-18px_rgba(0,0,0,0.65)] hover:brightness-110 active:brightness-95",
        variant === "secondary" &&
          "bg-[color:var(--surface-2)] text-[color:var(--fg)] ring-1 ring-white/10 hover:bg-[color:var(--surface-3)]",
        variant === "ghost" && "bg-transparent text-[color:var(--fg)] hover:bg-white/5",
        className,
      )}
      {...props}
    />
  );
}

