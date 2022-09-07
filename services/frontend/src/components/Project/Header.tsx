import { useCallback, useEffect, useState } from "react";
import { CallbackFunction, IProject } from "../../types";
import Spinner from "../global/Spinner";
import VisibilitySwitch from "../global/VisibilitySwitch";

interface IManifestSelectProps {
  onSave: CallbackFunction;
  isLoading: boolean;
  projectData: IProject;
  isAuthenticated: boolean;
}

const ManifestSelect = (props: IManifestSelectProps) => {
  const { onSave, isLoading, projectData, isAuthenticated } = props;
  const [visibility, setVisibility] = useState(false);
  const [projectName, setProjectName] = useState("Untitled");

  const handleNameChange = useCallback((e: any) => {
    setProjectName(e.target.value);
  }, []);

  const handleSave = useCallback(() => {
    const data: any = {
      name: projectName,
      visibility: +visibility
    };

    onSave(data);
  }, []);

  useEffect(() => {
    if (!projectData) {
      return;
    }

    setProjectName(projectData.name);
    setVisibility(Boolean(projectData.visibility));
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
            value={projectName}
          />

          <div className="flex flex-col space-y-2 w-full justify-end mb-4  md:flex-row md:space-y-0 md:space-x-2 md:mb-0">
            {isAuthenticated && (
              <VisibilitySwitch
                isVisible={visibility}
                onToggle={() => {
                  setVisibility(!visibility);
                }}
              />
            )}

            <button
              onClick={() => handleSave()}
              type="button"
              className="btn-util text-white bg-green-600 hover:bg-green-700 sm:w-auto"
            >
              <div className="flex justify-center items-center space-x-2 mx-auto">
                {isLoading && <Spinner className="w-4 h-4 text-green-300" />}
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

export default ManifestSelect;
