import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PROJECTS_FETCH_LIMIT } from "../../constants";
import ModalImport from "../modals/import";
import { IProject } from "../../types";
import { toaster } from "../../utils";
import Spinner from "../../components/global/Spinner";
import PreviewBlock from "./PreviewBlock";
import { useProjects } from "../../hooks/useProjects";
import { PlusIcon } from "@heroicons/react/outline";
import { importProject } from "../../hooks/useImportProject";
import { IImportFinalValues } from "../modals/import/form-utils";

const Projects = () => {
  const navigate = useNavigate();
  const [limit] = useState(PROJECTS_FETCH_LIMIT);
  const [offset, setOffset] = useState(0);
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const { isLoading, isError, error, data, isFetching, isPreviousData } =
    useProjects(limit, offset);

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
      .catch((e: any) => {
        toaster(`Something went wrong!`, "error");
      })
      .finally(() => {
        setImporting(false);
      });
  };

  return (
    <>
      {showImportModal ? (
        <ModalImport
          onHide={() => setShowImportModal(false)}
          onImport={(values: IImportFinalValues) => handleImport(values)}
          importing={importing}
        />
      ) : null}

      <div className="md:pl-16 flex flex-col flex-1">
        <main>
          <div className="py-6">
            <div className="flex flex-col sm:flex-row justify-between px-4 sm:px-6 md:px-8">
              <h1 className="text-2xl font-semibold dark:text-white text-gray-900">
                Projects
              </h1>

              {data && data.results.length > 0 && (
                <div className="flex justify-end space-x-1">
                  <button
                    onClick={onImportClick}
                    className="btn-util text-white bg-blue-600 hover:bg-blue-700 sm:w-auto"
                  >
                    <span>Import</span>
                  </button>

                  <Link
                    className="btn-util text-white bg-blue-600 hover:bg-blue-700 sm:w-auto"
                    to="/projects/new"
                  >
                    <span>Create new project</span>
                  </Link>
                </div>
              )}
            </div>

            <div className="px-4 sm:px-6 md:px-8">
              {!isFetching && !isLoading && (
                <>
                  <div className="py-4">
                    {error && (
                      <div className="text-center">
                        <h3 className="mt-12 text-sm font-medium text-gray-900 dark:text-white">
                          Something went wrong...
                        </h3>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {data.results.length > 0 &&
                        data.results.map((project: IProject) => {
                          return (
                            <div key={`${project.uuid}`}>
                              <PreviewBlock project={project} />
                            </div>
                          );
                        })}
                    </div>

                    {data.results.length === 0 && (
                      <div
                        className="text-center"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                          alignItems: "center",
                          minHeight: "calc(100vh - 160px)"
                        }}
                      >
                        <h3 className="mt-2 text-lg font-medium text-gray-900">
                          No projects
                        </h3>
                        <p className="mt-1 text-base text-gray-500">
                          Get started by creating a new project
                        </p>
                        <div className="flex flex-col md:flex-row mt-6 items-center space-y-2 md:space-y-0 space-x-2">
                          <button onClick={onImportClick} className="btn-util">
                            <span>Import</span>
                          </button>

                          <Link to="/projects/new" className="btn-util">
                            <span className="flex space-x-1 items-center">
                              <PlusIcon
                                className="h-3 w-3"
                                aria-hidden="true"
                              />
                              <span>New project</span>
                            </span>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>

                  {data.count > PROJECTS_FETCH_LIMIT && (
                    <div className="flex justify-center space-x-1 my-4">
                      <button
                        className={`
                          text-xs border-dotted border-b
                          ${
                            !data.previous
                              ? "text-gray-500 border-gray-500"
                              : "text-blue-600 border-blue-600"
                          }
                        `}
                        onClick={() =>
                          setOffset((old) =>
                            Math.max(old - PROJECTS_FETCH_LIMIT, 0)
                          )
                        }
                        disabled={!data.previous}
                      >
                        Previous
                      </button>
                      <button
                        className={`
                          text-xs border-dotted border-b
                          ${
                            !data.next
                              ? "text-gray-500 border-gray-500"
                              : "text-blue-600 border-blue-600"
                          }
                        `}
                        onClick={() => {
                          if (!isPreviousData && data.next) {
                            setOffset((old) => old + PROJECTS_FETCH_LIMIT);
                          }
                        }}
                        disabled={isPreviousData || !data.next}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {(isFetching || isLoading) && (
        <div className="flex items-center justify-center items-stretch min-h-screen align-middle">
          <Spinner className="w-4 h-4 m-auto dark:text-blue-400 text-blue-600"></Spinner>
        </div>
      )}
    </>
  );
};

export default Projects;
