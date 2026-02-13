import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { CallbackFunction, IProject } from "../../types";
import Spinner from "../global/Spinner";
import VisibilitySwitch from "../global/VisibilitySwitch";

interface IHeaderProps {
  onSave: CallbackFunction;
  isLoading: boolean;
  projectData: IProject;
  isAuthenticated: boolean;
}

interface IHeaderSaveOptions {
  autosave?: boolean;
}

const Header = (props: IHeaderProps) => {
  const { onSave, isLoading, projectData, isAuthenticated } = props;
  const [visibility, setVisibility] = useState(false);
  const [projectName, setProjectName] = useState("Untitled");

  const visibilityRef = useRef(false);
  const projectNameRef = useRef("Untitled");

  const handleSave = useCallback(
    (options: IHeaderSaveOptions = {}) => {
      const data: any = {
        name: projectNameRef.current,
        visibility: +visibilityRef.current
      };

      onSave(data, options);
    },
    [onSave]
  );

  const handleNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const nextName = e.target.value;
      setProjectName(nextName);
      projectNameRef.current = nextName;
      handleSave({ autosave: true });
    },
    [handleSave]
  );

  const handleNameKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") {
        return;
      }

      e.preventDefault();
      handleSave();
    },
    [handleSave]
  );

  const handleVisibilityToggle = useCallback(() => {
    const nextVisibility = !visibilityRef.current;
    setVisibility(nextVisibility);
    visibilityRef.current = nextVisibility;
    handleSave();
  }, [handleSave]);

  useEffect(() => {
    if (!projectData) {
      return;
    }

    setProjectName(projectData.name);
    setVisibility(Boolean(projectData.visibility));

    visibilityRef.current = Boolean(projectData.visibility);
    projectNameRef.current = projectData.name;
  }, [projectData]);

  return (
    <>
      <div className="px-4 py-3 border-b border-gray-200">
        <form
          className="flex flex-col space-y-2 md:space-y-0 md:flex-row md:justify-between items-center"
          autoComplete="off"
        >
          <input
            className={`
              bg-gray-100
              appearance-none
              w-full
              md:w-1/2
              lg:w-1/3
              block
              text-gray-700
              border
              border-gray-100
              dark:bg-gray-900
              dark:text-white
              dark:border-gray-900
              rounded
              py-2
              px-3
              leading-tight
              focus:outline-none
              focus:border-indigo-400
              focus:ring-0
            `}
            type="text"
            placeholder="Project name"
            autoComplete="off"
            id="name"
            name="name"
            onChange={handleNameChange}
            onKeyDown={handleNameKeyDown}
            value={projectName}
          />

          <div className="flex flex-col space-y-2 w-full justify-end mb-4  md:flex-row md:space-y-0 md:space-x-2 md:mb-0">
            {isAuthenticated && (
              <VisibilitySwitch
                isVisible={visibility}
                onToggle={handleVisibilityToggle}
              />
            )}

            <button
              onClick={() => handleSave()}
              type="button"
              className="btn-util text-white bg-green-600 hover:bg-green-700 sm:w-auto"
            >
              <div className="flex justify-center items-center space-x-2 mx-auto">
                {isLoading && <Spinner className="w-4 h-4 text-green-300" />}
                <span>Save</span>
              </div>
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default Header;
