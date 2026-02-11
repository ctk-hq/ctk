import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { CallbackFunction } from "../../../types";

interface IVisibilitySwitchProps {
  onToggle: CallbackFunction;
  isVisible: boolean;
}

const VisibilitySwitch = (props: IVisibilitySwitchProps) => {
  const { isVisible, onToggle } = props;

  return (
    <div className="flex flex items-center justify-end">
      <button
        onClick={onToggle}
        id="theme-toggle"
        type="button"
        className="
          btn-util
          bg-white
          focus:ring-0
          text-gray-500
          hover:bg-white
          hover:text-gray-800
          focus:outline-none
          text-sm"
      >
        {isVisible ? (
          <EyeIcon id="theme-toggle-light-icon" className="w-5 h-5" />
        ) : (
          <EyeSlashIcon id="theme-toggle-dark-icon" className="w-5 h-5" />
        )}
      </button>
    </div>
  );
};

export default VisibilitySwitch;
