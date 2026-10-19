import { Eye, EyeOff } from "lucide-react";
import { CallbackFunction } from "@/types";
import { Button } from "@/components/ui/button";
export default function VisibilitySwitch({
  isVisible,
  onToggle
}: {
  isVisible: boolean;
  onToggle: CallbackFunction;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-pressed={isVisible}
      aria-label={isVisible ? "Make project private" : "Make project public"}
      title={isVisible ? "Make project private" : "Make project public"}
      onClick={() => onToggle()}
    >
      {isVisible ? <Eye /> : <EyeOff />}
    </Button>
  );
}
