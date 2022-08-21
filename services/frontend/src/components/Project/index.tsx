import { useParams } from "react-router-dom";
import Spinner from "../global/Spinner";
import { useProject } from "../../hooks/useProject";
import KubernetesProject from "./kubernetes";
import DockerComposeProject from "./docker-compose";
import { useTitle } from "../../hooks";

interface IProjectProps {
  isAuthenticated: boolean;
}

const Project = (props: IProjectProps) => {
  const { isAuthenticated } = props;
  const { uuid } = useParams<{ uuid: string }>();
  const { data, error, isFetching } = useProject(uuid);

  useTitle(
    [
      isFetching ? "" : data ? data.name : "New project",
      "Container Toolkit"
    ].join(" | ")
  );

  if (!isFetching && !error) {
    if (data.project_type === 0) {
      return (
        <DockerComposeProject isAuthenticated={isAuthenticated} data={data} />
      );
    }

    if (data.project_type === 1) {
      return (
        <KubernetesProject isAuthenticated={isAuthenticated} data={data} />
      );
    }
  }

  if (error) {
    return (
      <div
        className="text-center"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "calc(60vh - 120px)"
        }}
      >
        <h3 className="text-2xl font-medium text-gray-900">
          {(error as any)?.response.status === 404 ? <>404</> : <>Oops...</>}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Either this project does not exist, it is private or the link is
          wrong.
        </p>
      </div>
    );
  }

  return (
    <>
      {isFetching && (
        <div className="flex items-center justify-center items-stretch min-h-screen align-middle">
          <Spinner className="w-4 h-4 m-auto dark:text-blue-400 text-blue-600"></Spinner>
        </div>
      )}
    </>
  );
};

export default Project;
