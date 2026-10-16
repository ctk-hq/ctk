import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PROJECTS_FETCH_LIMIT } from "../../constants";
import ModalImport from "../modals/import";
import { IProject } from "../../types";
import { toaster } from "../../utils";
import Spinner from "../../components/global/Spinner";
import PreviewBlock from "./PreviewBlock";
import { useProjects } from "../../hooks/useProjects";
import { Plus } from "lucide-react";
import { importProject } from "../../hooks/useImportProject";
import { IImportFinalValues } from "../modals/import/form-utils";

const Projects = () => {
  const navigate = useNavigate();
  const [limit] = useState(PROJECTS_FETCH_LIMIT);
  const [offset, setOffset] = useState(0);
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const {
    isLoading,
    isError,
    error,
    data,
    isFetching,
    isPlaceholderData: isPreviousData
  } = useProjects(limit, offset);

  const onImportClick = () => {
    setShowImportModal(true);
  };

  const handleImport = (values: IImportFinalValues) => {
    setImporting(true);
    importProject(values)
      .then((resp: any) => {
        navigate(`/projects/${resp.name}`);
        toaster(`Imported!`, "success");
      })
      .catch(() => {
        toaster(`Something went wrong!`, "error");
      })
      .finally(() => {
        setImporting(false);
      });
  };

  const results = data?.results || [];
  return (
    <>
      {showImportModal && (
        <ModalImport
          onHide={() => setShowImportModal(false)}
          onImport={handleImport}
          importing={importing}
        />
      )}
      <div className="h-[calc(100dvh-4rem)] overflow-y-auto md:h-dvh md:pl-16">
        <main className="space-y-6 px-4 py-6 sm:px-6 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold">Projects</h1>
            {results.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={onImportClick}>
                  Import
                </Button>
                <Button asChild>
                  <Link to="/projects/new">Create new project</Link>
                </Button>
              </div>
            )}
          </div>
          {isFetching || isLoading ? (
            <div
              role="status"
              className="flex min-h-64 items-center justify-center gap-2 text-muted-foreground"
            >
              <Spinner className="size-4" />
              Loading projects…
            </div>
          ) : isError || error ? (
            <p role="alert" className="py-12 text-center text-destructive">
              Unable to load projects. Please try again.
            </p>
          ) : (
            <>
              {results.length ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {results.map((project: IProject) => (
                    <PreviewBlock key={project.uuid} project={project} />
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[calc(100dvh-12rem)] flex-col items-center justify-center gap-3 text-center">
                  <h2 className="text-lg font-medium">No projects</h2>
                  <p className="text-sm text-muted-foreground">
                    Get started by creating a new project
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <Button variant="outline" onClick={onImportClick}>
                      Import
                    </Button>
                    <Button asChild>
                      <Link to="/projects/new">
                        <Plus className="size-4" />
                        New project
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
              {data?.count > PROJECTS_FETCH_LIMIT && (
                <nav
                  aria-label="Project pages"
                  className="flex justify-center gap-2"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!data.previous}
                    onClick={() =>
                      setOffset((old) =>
                        Math.max(old - PROJECTS_FETCH_LIMIT, 0)
                      )
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPreviousData || !data.next}
                    onClick={() => {
                      if (!isPreviousData && data.next)
                        setOffset((old) => old + PROJECTS_FETCH_LIMIT);
                    }}
                  >
                    Next
                  </Button>
                </nav>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
};
export default Projects;
