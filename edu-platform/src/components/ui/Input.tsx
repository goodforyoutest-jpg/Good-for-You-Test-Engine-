import { type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: Props) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl bg-[color:var(--surface-2)] px-3 text-sm text-[color:var(--fg)]",
        "ring-1 ring-white/10 placeholder:text-white/35",
        "focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]",
        className,
      )}
      {...props}
    />
  );
}

