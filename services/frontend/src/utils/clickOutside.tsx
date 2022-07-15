import { useEffect } from "react";

/**
 * Use it from the component that needs outside clicks.
 *
 * import { useClickOutside } from "../../utils/clickOutside";
 *
 * const drop = createRef<HTMLDivElement>();
 * useClickOutside(drop, () => {
 *   // do stuff...
 * });
 *
 * @param ref
 * @param onClickOutside
 */
export const useClickOutside = (ref: any, onClickOutside: any) => {
  useEffect(() => {
    const listener = (event: any) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }

      onClickOutside(event);
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, onClickOutside]);
};
