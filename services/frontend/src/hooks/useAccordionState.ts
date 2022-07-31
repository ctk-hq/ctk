import { useCallback, useState } from "react";

export interface IAccordionState {
  open: boolean;
  toggle: () => void;
}

export const useAccordionState = (
  id: string,
  defaultOpen: boolean
): IAccordionState => {
  const [open, setOpen] = useState(() => {
    let configuration: Record<string, boolean> = {};
    const item = localStorage.getItem("accordions");
    if (item) {
      configuration = JSON.parse(item);
    }

    if (configuration[id] === undefined) {
      configuration[id] = defaultOpen;
      localStorage.setItem(
        "accordions",
        JSON.stringify(configuration, null, 4)
      );
    }

    return configuration[id];
  });

  const handleToggle = useCallback(() => {
    const item = localStorage.getItem("accordions");
    if (!item) {
      throw new Error(
        "Cannot find 'accordions' in local storage, which should exist at this point. Refreshing should fix the issue, but something/somebody deleted 'accordions' from local storage."
      );
    }
    const configuration = JSON.parse(item);
    setOpen((open) => {
      const result = !open;
      configuration[id] = result;
      localStorage.setItem(
        "accordions",
        JSON.stringify(configuration, null, 4)
      );
      return result;
    });
  }, []);

  return {
    toggle: handleToggle,
    open
  };
};
