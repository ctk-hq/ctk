import { useEffect, useState, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { debounce, Dictionary, omit } from "lodash";
import YAML from "yaml";
import { PlusIcon } from "@heroicons/react/solid";
import {
  IProjectPayload,
  IClientNodeItem,
  IServiceNodePosition,
  IProject
} from "../../types";
import eventBus from "../../events/eventBus";
import { useMutation } from "react-query";
import {
  useProject,
  useUpdateProject,
  createProject
} from "../../hooks/useProject";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import { flattenGraphData } from "../../utils/generators";
import { nodeLibraries } from "../../utils/data/libraries";
import {
  getClientNodeItem,
  flattenLibraries,
  ensure,
  getClientNodesAndConnections,
  getMatchingSetIndex
} from "../../utils";
import { checkHttpStatus } from "../../services/helpers";
import { generateHttp } from "../../services/generate";
import { Canvas } from "../Canvas";
import Spinner from "../global/Spinner";
import ModalConfirmDelete from "../Modal/ConfirmDelete";
import ModalServiceCreate from "../Modal/Service/Create";
import ModalServiceEdit from "../Modal/Service/Edit";
import ModalNetwork from "../Modal/Network";
import CodeEditor from "../CodeEditor";

export default function Project() {
  const { uuid } = useParams<{ uuid: string }>();
  const { height } = useWindowDimensions();
  const { data, error, isFetching } = useProject(uuid);
  const stateNodesRef = useRef<Dictionary<IClientNodeItem>>();
  const stateConnectionsRef = useRef<[[string, string]] | []>();

  const [generatedCode, setGeneratedCode] = useState<string>();
  const [formattedCode, setFormattedCode] = useState<string>("");
  const [showModalCreateService, setShowModalCreateService] = useState(false);
  const [showVolumesModal, setShowVolumesModal] = useState(false);
  const [showNetworksModal, setShowNetworksModal] = useState(false);
  const [nodeForEdit, setNodeForEdit] = useState<IClientNodeItem | null>(null);
  const [nodeForDelete, setNodeForDelete] = useState<IClientNodeItem | null>(
    null
  );
  const [language, setLanguage] = useState("yaml");
  const [copyText, setCopyText] = useState("Copy");
  const [nodes, setNodes] = useState({});
  const [connections, setConnections] = useState<[[string, string]] | []>([]);
  const [projectName, setProjectName] = useState("Untitled");
  const [canvasPosition, setCanvasPosition] = useState({
    top: 0,
    left: 0,
    scale: 1
  });
  const updateProjectMutation = useUpdateProject(uuid);
  const createProjectMutation = useMutation(
    (payload: IProjectPayload) => {
      return createProject(payload);
    },
    {
      onSuccess: (project: IProject) => {
        window.location.replace(`/projects/${project.uuid}`);
      }
    }
  );

  stateNodesRef.current = nodes;
  stateConnectionsRef.current = connections;

  const handleNameChange = (e: any) => {
    setProjectName(e.target.value);
  };

  const onNodeUpdate = (positionData: IServiceNodePosition) => {
    if (stateNodesRef.current) {
      const node = {
        ...stateNodesRef.current[positionData.key],
        ...positionData
      };
      setNodes({ ...stateNodesRef.current, [positionData.key]: node });
    }
  };

  const onSave = () => {
    const payload: IProjectPayload = {
      name: projectName,
      data: {
        canvas: {
          position: canvasPosition,
          nodes: nodes,
          connections: connections
        },
        configs: [],
        networks: [],
        secrets: [],
        services: nodes,
        version: 3,
        volumes: []
      }
    };

    if (uuid) {
      updateProjectMutation.mutate(payload);
    } else {
      createProjectMutation.mutate(payload);
    }
  };

  const setViewHeight = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
  };

  const copy = () => {
    navigator.clipboard.writeText(formattedCode);
    setCopyText("Copied");

    setTimeout(() => {
      setCopyText("Copy");
    }, 300);
  };

  useEffect(() => {
    if (!data) {
      return;
    }

    const canvasData = JSON.parse(data.data);
    const nodesAsList = Object.keys(canvasData.canvas.nodes).map(
      (k) => canvasData.canvas.nodes[k]
    );
    const clientNodeItems = getClientNodesAndConnections(
      nodesAsList,
      nodeLibraries
    );

    setProjectName(data.name);
    setNodes(clientNodeItems);
    setConnections(canvasData.canvas.connections);
    setCanvasPosition(canvasData.canvas.position);
  }, [data]);

  const debouncedOnCodeChange = useMemo(
    () =>
      debounce((code: string) => {
        //formik.setFieldValue("code", e, false);
      }, 700),
    []
  );

  const debouncedOnGraphUpdate = useMemo(
    () =>
      debounce((graphData) => {
        const flatData = flattenGraphData(graphData);
        generateHttp(flatData)
          .then(checkHttpStatus)
          .then((data) => {
            if (data["code"].length) {
              for (let i = 0; i < data["code"].length; ++i) {
                data["code"][i] = data["code"][i].replace(/(\r\n|\n|\r)/gm, "");
              }

              const code = data["code"].join("\n");
              setGeneratedCode(code);
            }
          })
          .catch(() => undefined)
          .finally(() => undefined);
      }, 600),
    []
  );

  const onCodeUpdate = (code: string) => {
    debouncedOnCodeChange(code);
  };

  const onGraphUpdate = (graphData: any) => {
    debouncedOnGraphUpdate(graphData);
  };

  const onCanvasUpdate = (updatedCanvasPosition: any) => {
    setCanvasPosition({ ...canvasPosition, ...updatedCanvasPosition });
  };

  useEffect(() => {
    const handler = () => {
      setViewHeight();
    };

    window.addEventListener("resize", handler);
    setViewHeight();

    return () => {
      window.removeEventListener("resize", handler);
    };
  }, []);

  const onAddEndpoint = (values: any) => {
    const sections = flattenLibraries(nodeLibraries);
    const clientNodeItem = getClientNodeItem(
      values,
      ensure(sections.find((l) => l.type === values.type))
    );
    clientNodeItem.position = { left: 60, top: 30 };
    setNodes({ ...nodes, [clientNodeItem.key]: clientNodeItem });
  };

  const onUpdateEndpoint = (nodeItem: IClientNodeItem) => {
    setNodes({ ...nodes, [nodeItem.key]: nodeItem });
  };

  const onConnectionDetached = (data: any) => {
    if (
      !stateConnectionsRef.current ||
      stateConnectionsRef.current.length <= 0
    ) {
      return;
    }

    const _connections: [[string, string]] = [
      ...stateConnectionsRef.current
    ] as any;
    const existingIndex = getMatchingSetIndex(_connections, data);

    if (existingIndex !== -1) {
      _connections.splice(existingIndex, 1);
    }

    setConnections(_connections);
  };

  const onConnectionAttached = (data: any) => {
    if (stateConnectionsRef.current && stateConnectionsRef.current.length > 0) {
      const _connections: [[string, string]] = [
        ...stateConnectionsRef.current
      ] as any;
      const existingIndex = getMatchingSetIndex(_connections, data);
      if (existingIndex === -1) {
        _connections.push(data);
      }
      setConnections(_connections);
    } else {
      setConnections([data]);
    }
  };

  const onRemoveEndpoint = (node: IClientNodeItem) => {
    setNodes({ ...omit(nodes, node.key) });
    eventBus.dispatch("NODE_DELETED", { message: { node: node } });
  };

  useEffect(() => {
    if (!generatedCode) {
      return;
    }

    if (language === "json") {
      setFormattedCode(JSON.stringify(YAML.parse(generatedCode), null, 2));
    }

    if (language === "yaml") {
      setFormattedCode(generatedCode);
    }
  }, [language, generatedCode]);

  if (!isFetching) {
    if (!error) {
      return (
        <>
          {showNetworksModal ? (
            <ModalNetwork onHide={() => setShowNetworksModal(false)} />
          ) : null}

          {showModalCreateService ? (
            <ModalServiceCreate
              onHide={() => setShowModalCreateService(false)}
              onAddEndpoint={(values: any) => onAddEndpoint(values)}
            />
          ) : null}

          {nodeForEdit ? (
            <ModalServiceEdit
              node={nodeForEdit}
              onHide={() => setNodeForEdit(null)}
              onUpdateEndpoint={(values: any) => onUpdateEndpoint(values)}
            />
          ) : null}

          {nodeForDelete ? (
            <ModalConfirmDelete
              onHide={() => setNodeForDelete(null)}
              onConfirm={() => {
                onRemoveEndpoint(nodeForDelete);
                setNodeForDelete(null);
              }}
            />
          ) : null}

          <div className="md:pl-16 flex flex-col flex-1">
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
                  placeholder="Untitled"
                  autoComplete="off"
                  id="name"
                  name="name"
                  onChange={handleNameChange}
                  value={projectName}
                />

                <div className="flex flex-col space-y-2 w-full justify-end mb-4  md:flex-row md:space-y-0 md:space-x-2 md:mb-0">
                  <button
                    onClick={() => {
                      window.location.replace("/projects/new");
                    }}
                    type="button"
                    className="btn-util text-black bg-gray-200 hover:bg-gray-300 sm:w-auto"
                  >
                    <div className="flex justify-center items-center space-x-2 mx-auto">
                      <span>New</span>
                    </div>
                  </button>

                  <button
                    onClick={() => onSave()}
                    type="button"
                    className="btn-util text-white bg-green-600 hover:bg-green-700 sm:w-auto"
                  >
                    <div className="flex justify-center items-center space-x-2 mx-auto">
                      {updateProjectMutation.isLoading && (
                        <Spinner className="w-4 h-4 text-green-300" />
                      )}
                      {createProjectMutation.isLoading && (
                        <Spinner className="w-4 h-4 text-green-300" />
                      )}
                      <span>Save</span>
                    </div>
                  </button>
                </div>
              </form>
            </div>

            <div className="flex flex-grow relative flex-col md:flex-row">
              <div
                className="w-full overflow-hidden md:w-2/3 z-40"
                style={{ height: height - 64 }}
              >
                <div className="relative h-full">
                  <div className="absolute top-0 right-0 z-40">
                    <div className="flex space-x-2 p-2">
                      <button
                        className="flex space-x-1 btn-util"
                        type="button"
                        onClick={() => setShowModalCreateService(true)}
                      >
                        <PlusIcon className="w-3" />
                        <span>Service</span>
                      </button>
                      <button
                        className="btn-util"
                        type="button"
                        onClick={() => setShowVolumesModal(true)}
                      >
                        Volumes
                      </button>
                      <button
                        className="btn-util"
                        type="button"
                        onClick={() => setShowNetworksModal(true)}
                      >
                        Networks
                      </button>
                    </div>
                  </div>

                  <Canvas
                    nodes={nodes}
                    connections={connections}
                    canvasPosition={canvasPosition}
                    onNodeUpdate={(node: IServiceNodePosition) =>
                      onNodeUpdate(node)
                    }
                    onGraphUpdate={(graphData: any) => onGraphUpdate(graphData)}
                    onCanvasUpdate={(canvasData: any) =>
                      onCanvasUpdate(canvasData)
                    }
                    onConnectionAttached={(connectionData: any) =>
                      onConnectionAttached(connectionData)
                    }
                    onConnectionDetached={(connectionData: any) =>
                      onConnectionDetached(connectionData)
                    }
                    setNodeForEdit={(node: IClientNodeItem) =>
                      setNodeForEdit(node)
                    }
                    setNodeForDelete={(node: IClientNodeItem) =>
                      setNodeForDelete(node)
                    }
                  />
                </div>
              </div>
              <div className="relative group code-column w-full md:w-1/3">
                <div
                  className={`absolute top-0 left-0 right-0 z-10 flex justify-end p-1 space-x-2 group-hover:visible invisible`}
                >
                  <button
                    className={`btn-util ${
                      language === "json" ? `btn-util-selected` : ``
                    }`}
                    onClick={() => setLanguage("json")}
                  >
                    json
                  </button>
                  <button
                    className={`btn-util ${
                      language === "yaml" ? `btn-util-selected` : ``
                    }`}
                    onClick={() => setLanguage("yaml")}
                  >
                    yaml
                  </button>
                  <button className="btn-util" type="button" onClick={copy}>
                    {copyText}
                  </button>
                </div>

                <CodeEditor
                  data={formattedCode}
                  language={language}
                  onChange={(e: any) => {
                    onCodeUpdate(e);
                  }}
                  disabled={true}
                  lineWrapping={false}
                  height={height - 64}
                />
              </div>
            </div>
          </div>
        </>
      );
    } else {
      return <>Something went wrong</>;
    }
  }

  return (
    <div className="flex items-center justify-center items-stretch min-h-screen align-middle">
      <Spinner className="w-4 h-4 m-auto dark:text-blue-400 text-blue-600"></Spinner>
    </div>
  );
}
