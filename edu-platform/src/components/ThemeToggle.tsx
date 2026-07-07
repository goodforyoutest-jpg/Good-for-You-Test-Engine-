import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/Button";

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const Icon = isDark ? Sun : Moon;

  return (
    <Button type="button" variant="ghost" size="sm" onClick={toggleTheme} aria-label="Toggle theme">
      <Icon className="h-4 w-4" />
    </Button>
  );
}

