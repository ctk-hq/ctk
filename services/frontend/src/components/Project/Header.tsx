import { useCallback, useEffect, useRef, useState } from "react";
import { CallbackFunction, IProject } from "../../types";
import Spinner from "../global/Spinner";
import { Button } from "@/components/ui/button";
import VisibilitySwitch from "../global/VisibilitySwitch";
import { BACKEND_ENABLED } from "@/constants";
import ProjectNameField from "./ProjectNameField";

interface IHeaderProps {
  onSave: CallbackFunction;
  isLoading: boolean;
  projectData: IProject | undefined;
  isAuthenticated: boolean;
  canEdit?: boolean;
  onSwitch: (uuid: string) => Promise<void>;
  onSignIn: () => void;
}

interface IHeaderSaveOptions {
  autosave?: boolean;
}

const Header = (props: IHeaderProps) => {
  const {
    onSave,
    isLoading,
    projectData,
    isAuthenticated,
    onSwitch,
    onSignIn,
    canEdit = true
  } = props;
  const [visibility, setVisibility] = useState(false);
  const [projectName, setProjectName] = useState("Untitled");

  const visibilityRef = useRef(false);
  const projectNameRef = useRef("Untitled");
  const initializedProject = useRef<string | undefined>(undefined);

  const handleSave = useCallback(
    (options: IHeaderSaveOptions = {}) => {
      if (!BACKEND_ENABLED) return;

      const data: any = {
        name: projectNameRef.current,
        visibility: +visibilityRef.current
      };

      onSave(data, options);
    },
    [onSave]
  );

  const handleNameChange = useCallback(
    (nextName: string) => {
      setProjectName(nextName);
      projectNameRef.current = nextName;
      handleSave({ autosave: true });
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
    if (!projectData || initializedProject.current === projectData.uuid) {
      return;
    }

    setProjectName(projectData.name);
    initializedProject.current = projectData.uuid;
    setVisibility(Boolean(projectData.visibility));

    visibilityRef.current = Boolean(projectData.visibility);
    projectNameRef.current = projectData.name;
  }, [projectData]);

  return (
    <header className="shrink-0 border-b bg-background px-4 py-3">
      <form
        className="flex items-center justify-between gap-3"
        autoComplete="off"
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
      >
        <ProjectNameField
          name={projectName}
          projectUuid={projectData?.uuid}
          canSwitch={BACKEND_ENABLED && isAuthenticated}
          disabled={isLoading}
          onRename={handleNameChange}
          onCommit={() => handleSave()}
          onSwitch={onSwitch}
        />
        {BACKEND_ENABLED && (
          <div className="flex shrink-0 items-center gap-2">
            {isAuthenticated && canEdit && (
              <VisibilitySwitch
                isVisible={visibility}
                onToggle={handleVisibilityToggle}
              />
            )}
            {isAuthenticated && !canEdit ? (
              <span className="text-sm text-muted-foreground">
                Read-only project
              </span>
            ) : isAuthenticated ? (
              <Button
                type="button"
                onClick={() => handleSave()}
                disabled={isLoading}
              >
                {isLoading && <Spinner className="size-4" />}Save
              </Button>
            ) : (
              <Button type="button" onClick={onSignIn}>
                Log in to save
              </Button>
            )}
          </div>
        )}
      </form>
    </header>
  );
};
export default Header;
