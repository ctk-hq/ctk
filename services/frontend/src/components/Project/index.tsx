import { useEffect, useState, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { debounce, Dictionary, omit } from "lodash";
import YAML from "yaml";
import { GlobeAltIcon, CubeIcon, FolderAddIcon } from "@heroicons/react/solid";
import randomWords from "random-words";
import {
  IProjectPayload,
  IServiceNodeItem,
  IVolumeNodeItem,
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
import { generatePayload } from "../../utils/generators";
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
import ModalServiceCreate from "../Modal/service/Create";
import ModalServiceEdit from "../Modal/service/Edit";
import ModalNetwork from "../Modal/network";
import CreateVolumeModal from "../Modal/volume/CreateVolumeModal";
import EditVolumeModal from "../Modal/volume/EditVolumeModal";
import CodeEditor from "../CodeEditor";
import { useTitle } from "../../hooks";
import VisibilitySwitch from "../global/VisibilitySwitch";

interface IProjectProps {
  isAuthenticated: boolean;
}

export default function Project(props: IProjectProps) {
  const { isAuthenticated } = props;
  const { uuid } = useParams<{ uuid: string }>();
  const { height } = useWindowDimensions();
  const { data, error, isFetching } = useProject(uuid);
  const stateNodesRef =
    useRef<Dictionary<IServiceNodeItem | IVolumeNodeItem>>();
  const stateConnectionsRef = useRef<[[string, string]] | []>();
  const stateNetworksRef = useRef({});

  const [isVisible, setIsVisible] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string>();
  const [formattedCode, setFormattedCode] = useState<string>("");
  const [showModalCreateService, setShowModalCreateService] = useState(false);
  const [showVolumesModal, setShowVolumesModal] = useState(false);
  const [showNetworksModal, setShowNetworksModal] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<IServiceNodeItem | null>(
    null
  );
  const [serviceToDelete, setServiceToDelete] =
    useState<IServiceNodeItem | null>(null);
  const [volumeToEdit, setVolumeToEdit] = useState<IVolumeNodeItem | null>(
    null
  );
  const [volumeToDelete, setVolumeToDelete] = useState<IVolumeNodeItem | null>(
    null
  );
  const [language, setLanguage] = useState("yaml");
  const [version, setVersion] = useState("3");
  const [copyText, setCopyText] = useState("Copy");
  const [nodes, setNodes] = useState<Record<string, any>>({});
  const [connections, setConnections] = useState<[[string, string]] | []>([]);
  const [networks, setNetworks] = useState<Record<string, any>>({});
  const [projectName, setProjectName] = useState(
    () =>
      randomWords({
        wordsPerString: 2,
        exactly: 1,
        separator: "-"
      } as any)[0]
  );

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

  useTitle(
    [
      isFetching ? "" : data ? data.name : "New project",
      "Container Toolkit"
    ].join(" | ")
  );

  stateNodesRef.current = nodes;
  stateConnectionsRef.current = connections;
  stateNetworksRef.current = networks;

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
      visibility: +isVisible,
      data: {
        canvas: {
          position: canvasPosition,
          nodes: nodes,
          connections: connections,
          networks: networks
        }
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
    setIsVisible(Boolean(data.visibility));
    setNodes(clientNodeItems);
    setConnections(canvasData.canvas.connections);
    setNetworks(canvasData.canvas.networks);
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
      debounce((payload) => {
        generateHttp(JSON.stringify(payload))
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
    const data = { ...graphData };
    data.version = version;
    data.networks = stateNetworksRef.current;
    const payload = generatePayload(data);
    debouncedOnGraphUpdate(payload);
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
    clientNodeItem.position = {
      left: 60 - canvasPosition.left,
      top: 30 - canvasPosition.top
    };
    setNodes({ ...nodes, [clientNodeItem.key]: clientNodeItem });

    if (clientNodeItem.type === "VOLUME") {
      setVolumeToEdit(clientNodeItem as unknown as IVolumeNodeItem);
    }

    if (clientNodeItem.type === "SERVICE") {
      setServiceToEdit(clientNodeItem as unknown as IServiceNodeItem);
    }
  };

  const onCreateNetwork = (values: any) => {
    setNetworks({ ...networks, [values.key]: values });
  };

  const onUpdateNetwork = (values: any) => {
    setNetworks({ ...networks, [values.key]: values });
  };

  const onDeleteNetwork = (uuid: string) => {
    const _networks = Object.keys(networks).reduce((ret: any, key) => {
      if (networks[key].key !== uuid) {
        ret[key] = networks[key];
      }

      return ret;
    }, {});

    setNetworks({ ..._networks });
  };

  const onUpdateEndpoint = (nodeItem: IServiceNodeItem) => {
    const key = nodeItem.key;

    if (Array.isArray(nodeItem.serviceConfig.depends_on)) {
      nodeItem.serviceConfig.depends_on.forEach((dep: string) => {
        const depObject = Object.keys(nodes).find((key: string) => {
          const node = nodes[key];
          if (node.canvasConfig.node_name === dep) {
            return node;
          }
        });

        onConnectionAttached([key, depObject]);
      });
    }
    setNodes({ ...nodes, [nodeItem.key]: nodeItem });
  };

  const onConnectionDetached = (data: any) => {
    if (
      !stateConnectionsRef.current ||
      stateConnectionsRef.current.length <= 0
    ) {
      return;
    }

    if (stateNodesRef.current) {
      const sourceNode = {
        ...stateNodesRef.current[data[0]]
      } as IServiceNodeItem;
      const targetNode = stateNodesRef.current[data[1]];
      const targetServiceName = targetNode.canvasConfig.node_name;
      const sourceDependsOn = sourceNode.serviceConfig.depends_on as string[];

      if (sourceDependsOn && sourceDependsOn.length) {
        if (targetServiceName) {
          const filtered = sourceDependsOn.filter(
            (nodeName: string) => nodeName !== targetServiceName
          );

          if (filtered.length) {
            sourceNode.serviceConfig.depends_on = filtered;
          } else {
            delete sourceNode.serviceConfig.depends_on;
          }
        }
      }
    }

    const _connections: [[string, string]] = [
      ...stateConnectionsRef.current
    ] as any;
    const existingIndex = getMatchingSetIndex(_connections, data);

    if (existingIndex !== -1) {
      _connections.splice(existingIndex, 1);
      setConnections(_connections);
      stateConnectionsRef.current = _connections;
    }
  };

  const onConnectionAttached = (data: any) => {
    if (stateNodesRef.current) {
      const sourceNode = {
        ...stateNodesRef.current[data[0]]
      } as IServiceNodeItem;
      const targetNode = stateNodesRef.current[data[1]];
      const targetServiceName = targetNode.canvasConfig.node_name;
      let sourceDependsOn = sourceNode.serviceConfig.depends_on as string[];

      if (sourceDependsOn && sourceDependsOn.length) {
        if (targetServiceName) {
          if (!sourceDependsOn.includes(targetServiceName)) {
            sourceDependsOn.push(targetServiceName);
          }
        }
      } else {
        if (targetServiceName) {
          sourceDependsOn = [targetServiceName];
        }
      }

      sourceNode.serviceConfig.depends_on = sourceDependsOn;
    }

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

  const onRemoveEndpoint = (node: IServiceNodeItem | IVolumeNodeItem) => {
    setNodes({ ...omit(nodes, node.key) });
    eventBus.dispatch("NODE_DELETED", { message: { node: node } });
  };

  const versionChange = (e: any) => {
    setVersion(e.target.value);
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

  useEffect(() => {
    eventBus.dispatch("GENERATE", {
      message: {
        id: ""
      }
    });
  }, [version]);

  if (!isFetching) {
    if (!error) {
      return (
        <>
          {showNetworksModal ? (
            <ModalNetwork
              networks={networks}
              onHide={() => setShowNetworksModal(false)}
              onCreateNetwork={(values: any) => onCreateNetwork(values)}
              onUpdateNetwork={(values: any) => onUpdateNetwork(values)}
              onDeleteNetwork={(uuid: string) => onDeleteNetwork(uuid)}
            />
          ) : null}

          {showVolumesModal ? (
            <CreateVolumeModal
              onHide={() => setShowVolumesModal(false)}
              onAddEndpoint={(values: any) => onAddEndpoint(values)}
            />
          ) : null}

          {showModalCreateService ? (
            <ModalServiceCreate
              onHide={() => setShowModalCreateService(false)}
              onAddEndpoint={(values: any) => onAddEndpoint(values)}
            />
          ) : null}

          {serviceToEdit ? (
            <ModalServiceEdit
              node={serviceToEdit}
              onHide={() => setServiceToEdit(null)}
              onUpdateEndpoint={(values: any) => onUpdateEndpoint(values)}
            />
          ) : null}

          {serviceToDelete ? (
            <ModalConfirmDelete
              onHide={() => setServiceToDelete(null)}
              onConfirm={() => {
                onRemoveEndpoint(serviceToDelete);
                setServiceToDelete(null);
              }}
            />
          ) : null}

          {volumeToEdit ? (
            <EditVolumeModal
              node={volumeToEdit}
              onHide={() => setVolumeToEdit(null)}
              onUpdateEndpoint={(values: any) => onUpdateEndpoint(values)}
            />
          ) : null}

          {volumeToDelete ? (
            <ModalConfirmDelete
              onHide={() => setServiceToDelete(null)}
              onConfirm={() => {
                onRemoveEndpoint(volumeToDelete);
                setVolumeToDelete(null);
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
                      isVisible={isVisible}
                      onToggle={() => {
                        setIsVisible(!isVisible);
                      }}
                    />
                  )}

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

            <div className="flex flex-grow relative">
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
                        <CubeIcon className="w-4" />
                        <span>Add service</span>
                      </button>

                      <button
                        className="flex space-x-1 btn-util"
                        type="button"
                        onClick={() => setShowVolumesModal(true)}
                      >
                        <FolderAddIcon className="w-4" />
                        <span>Add volume</span>
                      </button>

                      <button
                        className="flex space-x-1 btn-util"
                        type="button"
                        onClick={() => setShowNetworksModal(true)}
                      >
                        <GlobeAltIcon className="w-4" />
                        <span>Networks</span>
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
                    setServiceToEdit={(node: IServiceNodeItem) =>
                      setServiceToEdit(node)
                    }
                    setServiceToDelete={(node: IServiceNodeItem) =>
                      setServiceToDelete(node)
                    }
                    setVolumeToEdit={(node: IVolumeNodeItem) =>
                      setVolumeToEdit(node)
                    }
                    setVolumeToDelete={(node: IVolumeNodeItem) =>
                      setVolumeToDelete(node)
                    }
                  />
                </div>
              </div>

              <div className="group code-column w-1/2 md:w-1/3 absolute top-0 right-0 sm:relative z-40 md:z-30">
                <div
                  className={`absolute top-0 left-0 right-0 z-10 flex justify-end p-1 space-x-2 group-hover:visible invisible`}
                >
                  <select
                    id="version"
                    onChange={versionChange}
                    value={version}
                    className="input-util w-min pr-8"
                  >
                    <option value="1">v 1</option>
                    <option value="2">v 2</option>
                    <option value="3">v 3</option>
                  </select>

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
  }

  return (
    <div className="flex items-center justify-center items-stretch min-h-screen align-middle">
      <Spinner className="w-4 h-4 m-auto dark:text-blue-400 text-blue-600"></Spinner>
    </div>
  );
}
