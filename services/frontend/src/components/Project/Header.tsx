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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import VisibilitySwitch from "../global/VisibilitySwitch";
import { BACKEND_ENABLED } from "@/constants";

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
    <header className="shrink-0 border-b bg-background px-4 py-3">
      <form
        className="flex items-center justify-between gap-3"
        autoComplete="off"
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
      >
        <Input
          className="min-w-0 flex-1 md:max-w-sm"
          aria-label="Project name"
          placeholder="Project name"
          autoComplete="off"
          id="name"
          name="name"
          onChange={handleNameChange}
          onKeyDown={handleNameKeyDown}
          value={projectName}
        />
        {BACKEND_ENABLED && (
          <div className="flex shrink-0 items-center gap-2">
            {isAuthenticated && (
              <VisibilitySwitch
                isVisible={visibility}
                onToggle={handleVisibilityToggle}
              />
            )}
            <Button onClick={() => handleSave()} disabled={isLoading}>
              {isLoading && <Spinner className="size-4" />}Save
            </Button>
          </div>
        )}
      </form>
    </header>
  );
};
export default Header;
