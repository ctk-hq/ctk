import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
export default function DarkModeSwitch() {
  const { isDark, setDark } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setDark(!isDark)}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
