import { type ReactNode } from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle-group";
import { cn } from "@/lib/utils";
import {
  segmentedControlItem,
  segmentedControlList
} from "./segmented-control-styles";

interface SegmentedControlProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly { value: T; label: string; content?: ReactNode }[];
  "aria-label": string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  className,
  "aria-label": label
}: SegmentedControlProps<T>) {
  return (
    <TogglePrimitive.Root
      type="single"
      value={value}
      onValueChange={(nextValue) => {
        // These settings always need one selection, unlike optional form toggles.
        const option = options.find((option) => option.value === nextValue);
        if (option) onValueChange(option.value);
      }}
      aria-label={label}
      className={cn(segmentedControlList, className)}
    >
      {options.map((option) => (
        <TogglePrimitive.Item
          key={option.value}
          value={option.value}
          aria-label={option.label}
          className={segmentedControlItem}
        >
          {option.content ?? option.label}
        </TogglePrimitive.Item>
      ))}
    </TogglePrimitive.Root>
  );
}
