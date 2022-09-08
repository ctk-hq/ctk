import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { Dictionary, omit } from "lodash";
import _ from "lodash";
import { GlobeAltIcon, CubeIcon, FolderAddIcon } from "@heroicons/react/solid";
import {
  IServiceNodeItem,
  IVolumeNodeItem,
  IServiceNodePosition,
  IProject,
  IProjectPayload
} from "../../types";
import eventBus from "../../events/eventBus";
import {
  createProject,
  useProject,
  useUpdateProject
} from "../../hooks/useProject";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import { nodeLibraries } from "../../utils/data/libraries";
import {
  getClientNodeItem,
  flattenLibraries,
  ensure,
  getClientNodesAndConnections,
  getMatchingSetIndex
} from "../../utils";
import { Canvas } from "../Canvas";
import Spinner from "../global/Spinner";
import ModalConfirmDelete from "../modals/ConfirmDelete";
import CreateServiceModal from "../modals/docker-compose/service/Create";
import ModalServiceEdit from "../modals/docker-compose/service/Edit";
import ModalNetwork from "../modals/docker-compose/network";
import CreateVolumeModal from "../modals/docker-compose/volume/CreateVolumeModal";
import EditVolumeModal from "../modals/docker-compose/volume/EditVolumeModal";
import { useTitle } from "../../hooks";
import CodeBox from "./CodeBox";
import Header from "./Header";
import { useMutation } from "react-query";

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
  const stateProjectRef = useRef();

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
  const [nodes, setNodes] = useState<Record<string, any>>({});
  const [connections, setConnections] = useState<[[string, string]] | []>([]);
  const [networks, setNetworks] = useState<Record<string, any>>({});
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
  stateProjectRef.current = data;

  const onNodeUpdate = (positionData: IServiceNodePosition) => {
    if (stateNodesRef.current) {
      const node = {
        ...stateNodesRef.current[positionData.key],
        ...positionData
      };
      setNodes({ ...stateNodesRef.current, [positionData.key]: node });
    }
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
    setNodes(clientNodeItems);
    setConnections(canvasData.canvas.connections);
    setNetworks(canvasData.canvas.networks);
    setCanvasPosition(canvasData.canvas.position);
  }, [data]);

  const onSave = (partial: any) => {
    const base: IProjectPayload = {
      name: data?.name ?? "",
      visibility: data?.visibility ?? 0,
      data: {
        canvas: {
          position: canvasPosition,
          nodes: nodes,
          connections: connections,
          networks: networks
        }
      }
    };

    const payload = { ...base, ...partial };

    if (uuid) {
      updateProjectMutation.mutate(payload);
    } else {
      createProjectMutation.mutate(payload);
    }
  };

  const onGraphUpdate = (graphData: any) => {
    const data = { ...graphData };
    data.networks = stateNetworksRef.current;
    eventBus.dispatch("FETCH_CODE", {
      message: data
    });
  };

  const onCanvasUpdate = (updatedCanvasPosition: any) => {
    setCanvasPosition({ ...canvasPosition, ...updatedCanvasPosition });
  };

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

  const getDependsOnKeys = (dependsOn: any): string[] => {
    let dependsOnKeys: string[] = [];

    if (dependsOn) {
      if (dependsOn.constructor === Object) {
        dependsOnKeys = Object.keys(dependsOn);
      }

      if (Array.isArray(dependsOn)) {
        dependsOnKeys = dependsOn as [];
      }
    }

    return dependsOnKeys;
  };

  const onUpdateEndpoint = (nodeItem: IServiceNodeItem) => {
    const key = nodeItem.key;

    if (connections.length) {
      const _connections = [...connections];

      _connections.forEach((conn: any) => {
        if (key === conn[0]) {
          const filtered = connections.filter((conn: any) => {
            return key !== conn[0];
          }) as any;

          setConnections(filtered);
          stateConnectionsRef.current = filtered;
        }
      });
    }

    const dependsOnData = nodeItem.serviceConfig.depends_on;
    const dependsOnKeys = getDependsOnKeys(dependsOnData);

    dependsOnKeys.forEach((dep: string) => {
      const depObject = Object.keys(nodes).find((key: string) => {
        const node = nodes[key];
        if (node.canvasConfig.node_name === dep) {
          return node;
        }
      });

      if (depObject) {
        onConnectionAttached([key, depObject]);
      }
    });

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
      const sourceDependsOn = sourceNode.serviceConfig.depends_on as any;

      if (targetServiceName) {
        const dependsOnKeys = getDependsOnKeys(sourceDependsOn);

        dependsOnKeys.forEach((key: string) => {
          if (key === targetServiceName) {
            if (Array.isArray(sourceDependsOn)) {
              _.remove(sourceDependsOn, (key) => key === targetServiceName);
            }

            if (sourceDependsOn && sourceDependsOn.constructor === Object) {
              delete sourceDependsOn[key];
            }
          }
        });

        if (!getDependsOnKeys(sourceDependsOn).length) {
          delete sourceNode.serviceConfig.depends_on;
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
      let sourceDependsOn = sourceNode.serviceConfig.depends_on as any;
      const dependsOnKeys = getDependsOnKeys(sourceDependsOn);

      if (sourceDependsOn) {
        if (targetServiceName) {
          if (!dependsOnKeys.includes(targetServiceName)) {
            if (Array.isArray(sourceDependsOn)) {
              sourceDependsOn.push(targetServiceName);
            }

            if (sourceDependsOn.constructor === Object) {
              sourceDependsOn[targetServiceName] = {
                condition: "service_healthy"
              };
            }
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
            <CreateServiceModal
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
            <Header
              onSave={onSave}
              isLoading={
                updateProjectMutation.isLoading ||
                createProjectMutation.isLoading
              }
              projectData={data}
              isAuthenticated={isAuthenticated}
            />

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
                <CodeBox />
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
