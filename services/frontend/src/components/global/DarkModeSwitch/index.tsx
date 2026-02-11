import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useDarkMode } from "./userDarkMode";

const DarkModeSwitch = () => {
  const [isDark, setIsDark] = useDarkMode();

  return (
    <div className="flex flex items-center">
      <button
        onClick={() => setIsDark(!isDark)}
        id="theme-toggle"
        type="button"
        className="
          text-gray-500
          dark:text-gray-200
          hover:bg-gray-100
          dark:hover:bg-gray-900
          focus:outline-none
          dark:focus:ring-gray-700
          rounded-lg
          text-sm
          p-2.5"
      >
        {isDark ? (
          <SunIcon id="theme-toggle-light-icon" className="w-5 h-5" />
        ) : (
          <MoonIcon id="theme-toggle-dark-icon" className="w-5 h-5" />
        )}
      </button>
    </div>
  );
};

export default DarkModeSwitch;
