import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Dictionary } from "lodash";
import { Globe, Box, FolderPlus } from "lucide-react";
import {
  IServiceNodeItem,
  IVolumeNodeItem,
  INetworkNodeItem,
  IServiceNodePosition,
  IProject,
  IProjectPayload
} from "../../types";
import {
  createProject,
  useProject,
  useUpdateProject
} from "../../hooks/useProject";
import { nodeLibraries } from "../../utils/data/libraries";
import {
  getClientNodeItem,
  flattenLibraries,
  ensure,
  getClientNodesAndConnections
} from "../../utils";
import { Canvas } from "../Canvas";
import {
  attachCanvasConnection,
  CanvasConnection,
  CanvasGraphState,
  detachCanvasConnection,
  removeCanvasNode,
  replaceCanvasNode
} from "../Canvas/graphState";
import Spinner from "../global/Spinner";
import ModalConfirmDelete from "../modals/ConfirmDelete";
import CreateServiceModal from "../modals/docker-compose/service/Create";
import ModalServiceEdit from "../modals/docker-compose/service/Edit";
import ModalNetwork from "../modals/docker-compose/network";
import CreateVolumeModal from "../modals/docker-compose/volume/CreateVolumeModal";
import EditVolumeModal from "../modals/docker-compose/volume/EditVolumeModal";
import { useTitle } from "../../hooks";
import CodeBox from "./CodeBox";
import CodePanel from "./CodePanel";
import Header from "./Header";
import { useMutation } from "@tanstack/react-query";
import { composeToCanvasGraph } from "../../utils/compose";
import { BACKEND_ENABLED } from "../../constants";

interface IProjectProps {
  isAuthenticated: boolean;
}

export default function Project(props: IProjectProps) {
  const { isAuthenticated } = props;
  const { uuid } = useParams<{ uuid: string }>();
  const { data, error, isFetching } = useProject(uuid);
  const stateNodesRef = useRef<
    Dictionary<IServiceNodeItem | IVolumeNodeItem> | undefined
  >(undefined);
  const stateConnectionsRef = useRef<CanvasConnection[]>([]);
  const stateNetworksRef = useRef({});
  const stateProjectRef = useRef<IProject | undefined>(undefined);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAutosaveBaselineRef = useRef(false);
  const lastSavedSnapshotRef = useRef<string>("");
  const pendingProjectMetaRef = useRef<
    Partial<Pick<IProjectPayload, "name" | "visibility">>
  >({});

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
  const [nodes, setNodes] = useState<
    Dictionary<IServiceNodeItem | IVolumeNodeItem>
  >({});
  const [connections, setConnections] = useState<CanvasConnection[]>([]);
  const [networks, setNetworks] = useState<Record<string, any>>({});
  const [canvasPosition, setCanvasPosition] = useState({
    top: 0,
    left: 0,
    scale: 1
  });
  const updateProjectMutation = useUpdateProject(uuid);
  const createProjectMutation = useMutation({
    mutationFn: (payload: IProjectPayload) => {
      return createProject(payload);
    },
    onSuccess: (project: IProject) => {
      window.location.replace(`/projects/${project.uuid}`);
    }
  });

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
      const nextNodes = { ...stateNodesRef.current, [positionData.key]: node };
      stateNodesRef.current = nextNodes;
      setNodes(nextNodes);
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
    setConnections(canvasData.canvas.connections as CanvasConnection[]);
    setNetworks(canvasData.canvas.networks);
    setCanvasPosition(canvasData.canvas.position);
  }, [data]);

  const syncPendingProjectMeta = useCallback(
    (partial: Partial<IProjectPayload> = {}) => {
      if (Object.prototype.hasOwnProperty.call(partial, "name")) {
        pendingProjectMetaRef.current.name = partial.name ?? "";
      }

      if (Object.prototype.hasOwnProperty.call(partial, "visibility")) {
        pendingProjectMetaRef.current.visibility = partial.visibility ?? 0;
      }
    },
    []
  );

  const buildPayload = useCallback(
    (partial: Partial<IProjectPayload> = {}) => {
      const currentProject = stateProjectRef.current;
      const base: IProjectPayload = {
        name: pendingProjectMetaRef.current.name ?? currentProject?.name ?? "",
        visibility:
          pendingProjectMetaRef.current.visibility ??
          currentProject?.visibility ??
          0,
        data: {
          canvas: {
            position: canvasPosition,
            nodes: stateNodesRef.current,
            connections: stateConnectionsRef.current,
            networks: stateNetworksRef.current
          }
        }
      };

      return { ...base, ...partial };
    },
    [canvasPosition]
  );

  const queueAutosave = useCallback(
    (buildAutosavePayload: () => IProjectPayload) => {
      if (!BACKEND_ENABLED || !uuid) {
        return;
      }

      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }

      autosaveTimeoutRef.current = setTimeout(() => {
        const autosavePayload = buildAutosavePayload();
        const autosaveSnapshot = JSON.stringify(autosavePayload);

        if (autosaveSnapshot === lastSavedSnapshotRef.current) {
          autosaveTimeoutRef.current = null;
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
              pendingProjectMetaRef.current = {};
            }
          }
        );
        autosaveTimeoutRef.current = null;
      }, 1200);
    },
    [uuid, updateProjectMutation]
  );

  const onSave = (
    partial: Partial<IProjectPayload> = {},
    options: { autosave?: boolean } = {}
  ) => {
    if (!BACKEND_ENABLED) return;

    syncPendingProjectMeta(partial);

    if (options.autosave) {
      queueAutosave(() => buildPayload(partial));
      return;
    }

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
            pendingProjectMetaRef.current = {};
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
    pendingProjectMetaRef.current = {};

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }
  }, [uuid]);

  useEffect(() => {
    if (!BACKEND_ENABLED || !uuid || !data) {
      return;
    }

    const snapshot = JSON.stringify(buildPayload());

    if (!hasAutosaveBaselineRef.current) {
      hasAutosaveBaselineRef.current = true;
      lastSavedSnapshotRef.current = snapshot;
      return;
    }

    if (snapshot === lastSavedSnapshotRef.current) {
      return;
    }

    queueAutosave(() => buildPayload());

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
    buildPayload,
    queueAutosave
  ]);

  const onCodeUpdate = useCallback((composeData: unknown): void => {
    const nextGraph = composeToCanvasGraph(
      composeData,
      (stateNodesRef.current as Dictionary<
        IServiceNodeItem | IVolumeNodeItem
      >) || {},
      (stateNetworksRef.current as Record<string, INetworkNodeItem>) || {}
    );

    stateNodesRef.current = nextGraph.nodes;
    stateConnectionsRef.current = nextGraph.connections as CanvasConnection[];
    stateNetworksRef.current = nextGraph.networks as any;

    setNodes(nextGraph.nodes);
    setConnections(nextGraph.connections as CanvasConnection[]);
    setNetworks(nextGraph.networks);
  }, []);

  const onCanvasUpdate = (updatedCanvasPosition: any) => {
    setCanvasPosition((current) => ({ ...current, ...updatedCanvasPosition }));
  };

  const onAddEndpoint = (values: any) => {
    const sections = flattenLibraries(nodeLibraries);
    const clientNodeItem = getClientNodeItem(
      values,
      ensure(sections.find((l) => l.type === values.type))
    );
    clientNodeItem.position = {
      left: (60 - canvasPosition.left) / canvasPosition.scale,
      top: (30 - canvasPosition.top) / canvasPosition.scale
    };
    const nextNodes = {
      ...stateNodesRef.current,
      [clientNodeItem.key]: clientNodeItem
    };
    stateNodesRef.current = nextNodes;
    setNodes(nextNodes);

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

  const currentGraphState = useCallback(
    (): CanvasGraphState => ({
      connections: stateConnectionsRef.current,
      nodes: stateNodesRef.current || {}
    }),
    []
  );

  const commitGraphState = useCallback((nextState: CanvasGraphState) => {
    stateNodesRef.current = nextState.nodes;
    stateConnectionsRef.current = nextState.connections;
    setNodes(nextState.nodes);
    setConnections(nextState.connections);
  }, []);

  const onUpdateEndpoint = useCallback(
    (nodeItem: IServiceNodeItem | IVolumeNodeItem) => {
      commitGraphState(replaceCanvasNode(currentGraphState(), nodeItem));
    },
    [commitGraphState, currentGraphState]
  );

  const onConnectionDetached = useCallback(
    (connection: CanvasConnection) => {
      commitGraphState(detachCanvasConnection(currentGraphState(), connection));
    },
    [commitGraphState, currentGraphState]
  );

  const onConnectionAttached = useCallback(
    (connection: CanvasConnection) => {
      commitGraphState(attachCanvasConnection(currentGraphState(), connection));
    },
    [commitGraphState, currentGraphState]
  );

  const onRemoveEndpoint = useCallback(
    (node: IServiceNodeItem | IVolumeNodeItem) => {
      commitGraphState(removeCanvasNode(currentGraphState(), node.key));
    },
    [commitGraphState, currentGraphState]
  );

  const codeGraphData = useMemo(
    () => ({ connections, networks, nodes }),
    [connections, networks, nodes]
  );

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
              onHide={() => setVolumeToDelete(null)}
              onConfirm={() => {
                onRemoveEndpoint(volumeToDelete);
                setVolumeToDelete(null);
              }}
            />
          ) : null}

          <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col md:h-dvh md:pl-16">
            <Header
              onSave={onSave}
              isLoading={
                updateProjectMutation.isPending ||
                createProjectMutation.isPending
              }
              projectData={data}
              isAuthenticated={isAuthenticated}
            />

            <div className="relative isolate flex min-h-0 flex-1 flex-col">
              <div className="shrink-0 border-b bg-background px-3 py-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setShowModalCreateService(true)}
                  >
                    <Box className="w-4" />
                    <span>Add service</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setShowVolumesModal(true)}
                  >
                    <FolderPlus className="w-4" />
                    <span>Add volume</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setShowNetworksModal(true)}
                  >
                    <Globe className="w-4" />
                    <span>Networks</span>
                  </Button>
                </div>
              </div>

              <div className="min-h-0 flex-1">
                <div className="h-full w-full overflow-hidden">
                  <div className="relative h-full">
                    <Canvas
                      nodes={nodes}
                      connections={connections}
                      canvasPosition={canvasPosition}
                      onNodeUpdate={(node: IServiceNodePosition) =>
                        onNodeUpdate(node)
                      }
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
              </div>

              <CodePanel>
                <CodeBox
                  graphData={codeGraphData}
                  onCodeUpdate={onCodeUpdate}
                />
              </CodePanel>
            </div>
          </div>
        </>
      );
    }

    if (error) {
      return (
        <div className="flex min-h-[calc(60vh-120px)] flex-col items-center justify-center text-center">
          <h3 className="text-2xl font-medium text-foreground">
            {(error as any)?.response.status === 404 ? <>404</> : <>Oops...</>}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Either this project does not exist, it is private or the link is
            wrong.
          </p>
        </div>
      );
    }
  }

  return (
    <div className="flex items-center justify-center items-stretch min-h-screen align-middle">
      <Spinner className="w-4 h-4 m-auto dark:text-muted-foreground text-foreground"></Spinner>
    </div>
  );
}
