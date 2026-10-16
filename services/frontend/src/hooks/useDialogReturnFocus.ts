import { useEffect, useState } from "react";

// Creation can hand off directly to an editor while focus is still inside the
// closing dialog. Keep the application opener for that transition.
let applicationOpener: WeakRef<HTMLElement> | undefined;

export function useDialogReturnFocus() {
  const [target] = useState(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || active === document.body) {
      return {
        primary: applicationOpener?.deref(),
        fallback: null,
        remember: false
      };
    }
    if (active.closest('[role="dialog"], [role="alertdialog"]')) {
      return {
        primary: applicationOpener?.deref(),
        fallback: null,
        remember: false
      };
    }
    return {
      primary: active,
      fallback: active.closest<HTMLElement>("[data-canvas-node]"),
      remember: true
    };
  });

  useEffect(() => {
    const opener = target.fallback || target.primary;
    if (target.remember && opener) applicationOpener = new WeakRef(opener);
  }, [target]);

  return (event: Event) => {
    event.preventDefault();
    const opener = target.primary?.isConnected
      ? target.primary
      : target.fallback;
    if (opener?.isConnected) opener.focus();
  };
}
