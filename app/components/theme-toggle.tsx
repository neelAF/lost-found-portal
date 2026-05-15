"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme, theme = "system" } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  const getIcon = () => {
    if (theme === "system") {
      return <Monitor size={18} />;
    }
    return isDark ? <Sun size={18} /> : <Moon size={18} />;
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="glass rounded-lg p-2 text-[var(--text)]"
      aria-label={`Current theme: ${theme}`}
      title={`Theme: ${theme}`}
    >
      {getIcon()}
    </button>
  );
}
