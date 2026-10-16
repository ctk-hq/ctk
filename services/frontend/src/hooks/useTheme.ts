import { useEffect, useSyncExternalStore } from "react";
const changeEvent = "ctk-theme-change";
function subscribeTheme(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(changeEvent, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(changeEvent, listener);
  };
}
function getTheme() {
  return localStorage.getItem("dark-mode") || "";
}
function subscribePreference(listener: () => void) {
  const query = window.matchMedia?.("(prefers-color-scheme: dark)");
  query?.addEventListener("change", listener);
  return () => query?.removeEventListener("change", listener);
}
export function useTheme() {
  const stored = useSyncExternalStore(subscribeTheme, getTheme, () => "");
  const prefersDark = useSyncExternalStore(
    subscribePreference,
    () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false,
    () => false
  );
  const isDark = stored
    ? stored === "true" || stored === '"true"'
    : prefersDark;
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);
  const setDark = (value: boolean) => {
    localStorage.setItem("dark-mode", JSON.stringify(value));
    window.dispatchEvent(new Event(changeEvent));
  };
  return { isDark, setDark };
}
