import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Dictionary, omit } from "lodash";
import {
  GlobeAltIcon,
  CubeIcon,
  FolderPlusIcon
} from "@heroicons/react/24/outline";
import {
  IServiceNodeItem,
  IVolumeNodeItem,
  INetworkNodeItem,
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
import { composeToCanvasGraph } from "../../utils/compose";

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
  const suppressGraphToCodeSyncRef = useRef(false);
  const suppressGraphToCodeSyncTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAutosaveBaselineRef = useRef(false);
  const lastSavedSnapshotRef = useRef<string>("");

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

  const suppressGraphToCodeSync = useCallback((durationMs = 1200) => {
    suppressGraphToCodeSyncRef.current = true;

    if (suppressGraphToCodeSyncTimeoutRef.current) {
      clearTimeout(suppressGraphToCodeSyncTimeoutRef.current);
    }

    suppressGraphToCodeSyncTimeoutRef.current = setTimeout(() => {
      suppressGraphToCodeSyncRef.current = false;
      suppressGraphToCodeSyncTimeoutRef.current = null;
    }, durationMs);
  }, []);

  useEffect(() => {
    return () => {
      if (suppressGraphToCodeSyncTimeoutRef.current) {
        clearTimeout(suppressGraphToCodeSyncTimeoutRef.current);
      }
    };
  }, []);

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
    const buildPayload = (nextPartial: any = {}) => {
      const base: IProjectPayload = {
        name: data?.name ?? "",
        visibility: data?.visibility ?? 0,
        data: {
          canvas: {
            position: canvasPosition,
            nodes: stateNodesRef.current,
            connections: stateConnectionsRef.current,
            networks: stateNetworksRef.current
          }
        }
      };

      return { ...base, ...nextPartial };
    };

    const payload = buildPayload(partial);
    const payloadSnapshot = JSON.stringify(payload);

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }

    if (uuid) {
      updateProjectMutation.mutate(
        {
          payload,
          silent: false
        },
        {
          onSuccess: () => {
            lastSavedSnapshotRef.current = payloadSnapshot;
          }
        }
      );
      return;
    }

    createProjectMutation.mutate(payload);
  };

  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    hasAutosaveBaselineRef.current = false;
    lastSavedSnapshotRef.current = "";

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }
  }, [uuid]);

  useEffect(() => {
    if (!uuid || !data) {
      return;
    }

    const buildPayload = () =>
      ({
        name: data?.name ?? "",
        visibility: data?.visibility ?? 0,
        data: {
          canvas: {
            position: canvasPosition,
            nodes: stateNodesRef.current,
            connections: stateConnectionsRef.current,
            networks: stateNetworksRef.current
          }
        }
      }) as IProjectPayload;

    const snapshot = JSON.stringify(buildPayload());

    if (!hasAutosaveBaselineRef.current) {
      hasAutosaveBaselineRef.current = true;
      lastSavedSnapshotRef.current = snapshot;
      return;
    }

    if (snapshot === lastSavedSnapshotRef.current) {
      return;
    }

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(() => {
      const autosavePayload = buildPayload();
      const autosaveSnapshot = JSON.stringify(autosavePayload);

      if (autosaveSnapshot === lastSavedSnapshotRef.current) {
        return;
      }

      updateProjectMutation.mutate(
        {
          payload: autosavePayload,
          silent: true
        },
        {
          onSuccess: () => {
            lastSavedSnapshotRef.current = autosaveSnapshot;
          }
        }
      );
      autosaveTimeoutRef.current = null;
    }, 1200);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
    };
  }, [
    uuid,
    data,
    nodes,
    connections,
    networks,
    canvasPosition,
    updateProjectMutation
  ]);

  const onGraphUpdate = (graphData: any) => {
    if (suppressGraphToCodeSyncRef.current) {
      return;
    }

    const data = { ...graphData };
    data.networks = stateNetworksRef.current;
    eventBus.dispatch("FETCH_CODE", {
      message: data
    });
  };

  const onCodeUpdate = useCallback(
    (composeData: unknown): string => {
      suppressGraphToCodeSync();

      const nextGraph = composeToCanvasGraph(
        composeData,
        (stateNodesRef.current as Dictionary<
          IServiceNodeItem | IVolumeNodeItem
        >) || {},
        (stateNetworksRef.current as Record<string, INetworkNodeItem>) || {}
      );

      stateNodesRef.current = nextGraph.nodes;
      stateConnectionsRef.current = nextGraph.connections as [[string, string]];
      stateNetworksRef.current = nextGraph.networks as any;

      setNodes(nextGraph.nodes);
      setConnections(nextGraph.connections as [[string, string]]);
      setNetworks(nextGraph.networks);

      return nextGraph.version;
    },
    [suppressGraphToCodeSync]
  );

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

  const getVolumeNodeName = (node: IVolumeNodeItem | undefined): string => {
    if (!node) {
      return "";
    }

    return (node.canvasConfig.node_name ||
      node.volumeConfig.name ||
      "") as string;
  };

  const getVolumeMountSourceName = (mount: any): string | null => {
    if (typeof mount === "string") {
      const sourceName = mount.split(":", 1)[0].trim();
      return sourceName || null;
    }

    if (
      mount &&
      mount.constructor === Object &&
      typeof mount.source === "string"
    ) {
      const sourceName = mount.source.trim();
      return sourceName || null;
    }

    return null;
  };

  const getServiceVolumeMountNames = (volumesData: any): string[] => {
    if (!Array.isArray(volumesData)) {
      return [];
    }

    const names: string[] = [];
    volumesData.forEach((mount) => {
      const sourceName = getVolumeMountSourceName(mount);
      if (sourceName && !names.includes(sourceName)) {
        names.push(sourceName);
      }
    });

    return names;
  };

  const removeServiceVolumeMount = (
    volumesData: any,
    volumeName: string
  ): any[] => {
    if (!Array.isArray(volumesData)) {
      return [];
    }

    return volumesData.filter((mount) => {
      return getVolumeMountSourceName(mount) !== volumeName;
    });
  };

  const onUpdateEndpoint = (nodeItem: IServiceNodeItem | IVolumeNodeItem) => {
    const key = nodeItem.key;

    if (nodeItem.type === "SERVICE") {
      const serviceNode = nodeItem as IServiceNodeItem;

      if (connections.length) {
        const filteredConnections = connections.filter((conn: any) => {
          if (key === conn[0]) {
            return false;
          }

          if (key === conn[1] && nodes[conn[0]]?.type === "VOLUME") {
            return false;
          }

          return true;
        }) as any;

        setConnections(filteredConnections);
        stateConnectionsRef.current = filteredConnections;
      }

      const dependsOnData = serviceNode.serviceConfig.depends_on;
      const dependsOnKeys = getDependsOnKeys(dependsOnData);

      dependsOnKeys.forEach((dep: string) => {
        const depObject = Object.keys(nodes).find((nodeKey: string) => {
          const node = nodes[nodeKey];
          return node.type === "SERVICE" && node.canvasConfig.node_name === dep;
        });

        if (depObject) {
          onConnectionAttached([key, depObject]);
        }
      });

      const volumeNames = getServiceVolumeMountNames(
        serviceNode.serviceConfig.volumes
      );

      volumeNames.forEach((volumeName) => {
        const sourceVolumeKey = Object.keys(nodes).find((nodeKey: string) => {
          const node = nodes[nodeKey];
          if (node.type !== "VOLUME") {
            return false;
          }

          return getVolumeNodeName(node as IVolumeNodeItem) === volumeName;
        });

        if (sourceVolumeKey) {
          onConnectionAttached([sourceVolumeKey, key]);
        }
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
      const sourceNode = stateNodesRef.current[data[0]];
      const targetNode = stateNodesRef.current[data[1]];
      const updatedNodes = { ...stateNodesRef.current };
      let hasNodeUpdates = false;

      if (sourceNode?.type === "SERVICE" && targetNode?.type === "SERVICE") {
        const sourceServiceNode = sourceNode as IServiceNodeItem;
        const targetServiceName = targetNode.canvasConfig.node_name;
        let sourceDependsOn = sourceServiceNode.serviceConfig.depends_on as any;

        if (targetServiceName) {
          const dependsOnKeys = getDependsOnKeys(sourceDependsOn);

          if (dependsOnKeys.includes(targetServiceName)) {
            if (Array.isArray(sourceDependsOn)) {
              sourceDependsOn = sourceDependsOn.filter(
                (name: string) => name !== targetServiceName
              );
            }

            if (sourceDependsOn && sourceDependsOn.constructor === Object) {
              sourceDependsOn = { ...sourceDependsOn };
              delete sourceDependsOn[targetServiceName];
            }

            const nextServiceConfig = {
              ...sourceServiceNode.serviceConfig
            } as any;

            if (getDependsOnKeys(sourceDependsOn).length) {
              nextServiceConfig.depends_on = sourceDependsOn;
            } else {
              delete nextServiceConfig.depends_on;
            }

            updatedNodes[data[0]] = {
              ...sourceServiceNode,
              serviceConfig: nextServiceConfig
            };
            hasNodeUpdates = true;
          }
        }
      }

      if (sourceNode?.type === "VOLUME" && targetNode?.type === "SERVICE") {
        const volumeNodeName = getVolumeNodeName(sourceNode as IVolumeNodeItem);
        const targetServiceNode = targetNode as IServiceNodeItem;

        if (volumeNodeName) {
          const nextVolumes = removeServiceVolumeMount(
            targetServiceNode.serviceConfig.volumes,
            volumeNodeName
          );

          if (
            Array.isArray(targetServiceNode.serviceConfig.volumes) &&
            nextVolumes.length !==
              targetServiceNode.serviceConfig.volumes.length
          ) {
            const nextServiceConfig = {
              ...targetServiceNode.serviceConfig
            } as any;

            if (nextVolumes.length) {
              nextServiceConfig.volumes = nextVolumes;
            } else {
              delete nextServiceConfig.volumes;
            }

            updatedNodes[data[1]] = {
              ...targetServiceNode,
              serviceConfig: nextServiceConfig
            };
            hasNodeUpdates = true;
          }
        }
      }

      if (hasNodeUpdates) {
        setNodes(updatedNodes);
        stateNodesRef.current = updatedNodes as any;
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
      const sourceNode = stateNodesRef.current[data[0]];
      const targetNode = stateNodesRef.current[data[1]];
      const updatedNodes = { ...stateNodesRef.current };
      let hasNodeUpdates = false;

      if (sourceNode?.type === "SERVICE" && targetNode?.type === "SERVICE") {
        const sourceServiceNode = sourceNode as IServiceNodeItem;
        const targetServiceName = targetNode.canvasConfig.node_name;
        let sourceDependsOn = sourceServiceNode.serviceConfig.depends_on as any;
        const dependsOnKeys = getDependsOnKeys(sourceDependsOn);

        if (targetServiceName) {
          if (sourceDependsOn) {
            if (!dependsOnKeys.includes(targetServiceName)) {
              if (Array.isArray(sourceDependsOn)) {
                sourceDependsOn = [...sourceDependsOn, targetServiceName];
              }

              if (sourceDependsOn.constructor === Object) {
                sourceDependsOn = { ...sourceDependsOn };
                sourceDependsOn[targetServiceName] = {
                  condition: "service_healthy"
                };
              }
            }
          } else {
            sourceDependsOn = [targetServiceName];
          }

          updatedNodes[data[0]] = {
            ...sourceServiceNode,
            serviceConfig: {
              ...sourceServiceNode.serviceConfig,
              depends_on: sourceDependsOn
            }
          };
          hasNodeUpdates = true;
        }
      }

      if (sourceNode?.type === "VOLUME" && targetNode?.type === "SERVICE") {
        const sourceVolumeName = getVolumeNodeName(
          sourceNode as IVolumeNodeItem
        );
        const targetServiceNode = targetNode as IServiceNodeItem;
        const currentVolumeNames = getServiceVolumeMountNames(
          targetServiceNode.serviceConfig.volumes
        );

        if (
          sourceVolumeName &&
          !currentVolumeNames.includes(sourceVolumeName)
        ) {
          const currentVolumes = Array.isArray(
            targetServiceNode.serviceConfig.volumes
          )
            ? [...targetServiceNode.serviceConfig.volumes]
            : [];

          currentVolumes.push(sourceVolumeName);

          updatedNodes[data[1]] = {
            ...targetServiceNode,
            serviceConfig: {
              ...targetServiceNode.serviceConfig,
              volumes: currentVolumes
            }
          };
          hasNodeUpdates = true;
        }
      }

      if (hasNodeUpdates) {
        setNodes(updatedNodes);
        stateNodesRef.current = updatedNodes as any;
      }
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
      stateConnectionsRef.current = _connections;
    } else {
      setConnections([data]);
      stateConnectionsRef.current = [data] as any;
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
                        <FolderPlusIcon className="w-4" />
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
                <CodeBox onCodeUpdate={onCodeUpdate} />
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
