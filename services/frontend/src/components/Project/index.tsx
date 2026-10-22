import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Dictionary } from "lodash";
import { Globe, Box, FolderPlus, Braces } from "lucide-react";
import {
  IServiceNodeItem,
  IVolumeNodeItem,
  INetworkNodeItem,
  IServiceNodePosition,
  IProject,
  IProjectPayload,
  ProjectVariable,
  ManifestSource
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
  getClientNodesAndConnections,
  toaster
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
import VariablesModal from "./VariablesModal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { composeToCanvasGraph } from "../../utils/compose";
import { hydrateServiceNetworking } from "../../utils/kubernetes-services";
import { preserveComposeSettings } from "../../utils/manifest-reconciliation";
import type { ManifestImport } from "../../utils/manifests";
import { BACKEND_ENABLED } from "../../constants";

interface IProjectProps {
  isAuthenticated: boolean;
}

export default function Project(props: IProjectProps) {
  const { isAuthenticated } = props;
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const initializedProject = useRef(false);
  const { data, error, isFetching } = useProject(uuid);
  const stateNodesRef = useRef<
    Dictionary<IServiceNodeItem | IVolumeNodeItem> | undefined
  >(undefined);
  const stateConnectionsRef = useRef<CanvasConnection[]>([]);
  const stateNetworksRef = useRef({});
  const stateProjectRef = useRef<IProject | undefined>(undefined);
  const stateVariablesRef = useRef<ProjectVariable[]>([]);
  const stateManifestSourceRef = useRef<ManifestSource | undefined>(undefined);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAutosaveBaselineRef = useRef(false);
  const lastSavedSnapshotRef = useRef<string>("");
  const pendingProjectMetaRef = useRef<
    Partial<Pick<IProjectPayload, "name" | "visibility">>
  >({});

  const [showModalCreateService, setShowModalCreateService] = useState(false);
  const [showVolumesModal, setShowVolumesModal] = useState(false);
  const [showNetworksModal, setShowNetworksModal] = useState(false);
  const [showVariablesModal, setShowVariablesModal] = useState(false);
  const [variables, setVariables] = useState<ProjectVariable[]>([]);
  const [manifestSource, setManifestSource] = useState<ManifestSource>();
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
  const [draftProject, setDraftProject] = useState<IProject>();
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
      queryClient.setQueryData(["projects", project.uuid], project);
      void queryClient.invalidateQueries({
        queryKey: ["projects"],
        predicate: (query) => query.queryKey[1] !== project.uuid
      });
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
  stateVariablesRef.current = variables;
  stateManifestSourceRef.current = manifestSource;
  const canEdit = !uuid || data?.can_edit !== false;

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
    if (!data || initializedProject.current) {
      return;
    }

    initializedProject.current = true;
    const canvasData = JSON.parse(data.data);
    setVariables(canvasData.variables ?? []);
    setManifestSource(canvasData.canvas.manifestSource);
    const nodesAsList = Object.keys(canvasData.canvas.nodes).map(
      (k) => canvasData.canvas.nodes[k]
    );
    const clientNodeItems = getClientNodesAndConnections(
      nodesAsList,
      nodeLibraries
    );
    setNodes(
      hydrateServiceNetworking(
        clientNodeItems,
        canvasData.canvas.manifestSource
      )
    );
    setConnections(canvasData.canvas.connections as CanvasConnection[]);
    setNetworks(canvasData.canvas.networks);
    setCanvasPosition(canvasData.canvas.position);
  }, [data]);

  useEffect(() => {
    if (uuid) return;
    const draft = sessionStorage.getItem("ctk-project-draft");
    if (!draft) return;
    try {
      const payload = JSON.parse(draft) as IProjectPayload;
      const canvas = payload.data.canvas;
      setManifestSource(canvas.manifestSource);
      setVariables(payload.data.variables ?? []);
      setNodes(
        hydrateServiceNetworking(canvas.nodes || {}, canvas.manifestSource)
      );
      setConnections(canvas.connections || []);
      setNetworks(canvas.networks || {});
      setCanvasPosition(canvas.position);
      pendingProjectMetaRef.current = {
        name: payload.name,
        visibility: payload.visibility
      };
      setDraftProject({
        id: 0,
        uuid: "",
        name: payload.name || "Untitled",
        visibility: payload.visibility,
        data: JSON.stringify(payload.data),
        created_at: "",
        modified_at: ""
      });
      sessionStorage.removeItem("ctk-project-draft");
    } catch {
      sessionStorage.removeItem("ctk-project-draft");
    }
  }, [uuid]);

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
          variables: stateVariablesRef.current,
          canvas: {
            manifestSource: stateManifestSourceRef.current,
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
      if (!BACKEND_ENABLED || !isAuthenticated || !uuid || !canEdit) {
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
              if (pendingProjectMetaRef.current.name === autosavePayload.name)
                delete pendingProjectMetaRef.current.name;
              if (
                pendingProjectMetaRef.current.visibility ===
                autosavePayload.visibility
              )
                delete pendingProjectMetaRef.current.visibility;
            }
          }
        );
        autosaveTimeoutRef.current = null;
      }, 1200);
    },
    [uuid, isAuthenticated, canEdit, updateProjectMutation]
  );

  const onSave = (
    partial: Partial<IProjectPayload> = {},
    options: { autosave?: boolean } = {}
  ) => {
    syncPendingProjectMeta(partial);
    if (!BACKEND_ENABLED || !isAuthenticated || !canEdit) return;

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
            if (pendingProjectMetaRef.current.name === payload.name)
              delete pendingProjectMetaRef.current.name;
            if (pendingProjectMetaRef.current.visibility === payload.visibility)
              delete pendingProjectMetaRef.current.visibility;
          }
        }
      );
      return;
    }

    createProjectMutation.mutate(payload, {
      onSuccess: (project: IProject) => navigate(`/projects/${project.uuid}`)
    });
  };

  const switchProject = async (nextUuid: string) => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }
    const payload = buildPayload();
    const snapshot = JSON.stringify(payload);
    if (uuid && canEdit && snapshot !== lastSavedSnapshotRef.current) {
      await updateProjectMutation.mutateAsync({ payload, silent: true });
    } else if (
      !uuid &&
      (Object.keys(nodes).length ||
        Object.keys(networks).length ||
        payload.name.trim())
    ) {
      await createProjectMutation.mutateAsync(payload);
    }
    navigate(`/projects/${nextUuid}`);
  };

  const signInToSave = () => {
    sessionStorage.setItem("ctk-project-draft", JSON.stringify(buildPayload()));
    navigate("/login?next=%2Fprojects%2Fnew");
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
    if (!BACKEND_ENABLED || !isAuthenticated || !uuid || !data) {
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
    isAuthenticated,
    data,
    nodes,
    connections,
    networks,
    canvasPosition,
    variables,
    manifestSource,
    buildPayload,
    queueAutosave
  ]);

  const onCodeUpdate = useCallback((imported: ManifestImport): void => {
    imported = preserveComposeSettings(
      imported,
      stateNodesRef.current || {},
      stateNetworksRef.current || {}
    );
    const nextGraph = composeToCanvasGraph(
      imported.data,
      (stateNodesRef.current as Dictionary<
        IServiceNodeItem | IVolumeNodeItem
      >) || {},
      (stateNetworksRef.current as Record<string, INetworkNodeItem>) || {},
      imported.source,
      !imported.replaceSource
    );

    stateNodesRef.current = nextGraph.nodes;
    stateConnectionsRef.current = nextGraph.connections as CanvasConnection[];
    stateNetworksRef.current = nextGraph.networks as any;
    const previousSource = imported.replaceSource
      ? undefined
      : stateManifestSourceRef.current;
    const source: ManifestSource = {
      ...previousSource,
      ...imported.source,
      warnings: [
        ...new Set([
          ...(previousSource?.warnings ?? []),
          ...(imported.source.warnings ?? [])
        ])
      ]
    };
    if (imported.source.kubernetes) {
      source.kubernetes = {
        ...imported.source.kubernetes,
        bindings: imported.source.kubernetes.bindings.map((binding) => ({
          ...binding,
          nodeKey: Object.values(nextGraph.nodes).find(
            (node) =>
              node.type === "SERVICE" &&
              node.canvasConfig.node_name === binding.serviceName
          )?.key
        }))
      };
    }
    stateManifestSourceRef.current = source;
    setManifestSource(source);

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
    const before = networks[values.key]?.canvasConfig.node_name;
    const after = values.canvasConfig.node_name;
    if (
      Object.values(networks).some(
        (entry) =>
          entry.key !== values.key && entry.canvasConfig.node_name === after
      )
    )
      throw new Error(`A network named "${after}" already exists.`);
    if (before && after && before !== after) {
      const nextNodes = Object.fromEntries(
        Object.entries(stateNodesRef.current || {}).map(([key, node]) => {
          if (node.type !== "SERVICE") return [key, node];
          const service = node as IServiceNodeItem;
          const membership = service.serviceConfig.networks;
          const next = Array.isArray(membership)
            ? membership.map((name) => (name === before ? after : name))
            : membership
              ? Object.fromEntries(
                  Object.entries(membership).map(([name, value]) => [
                    name === before ? after : name,
                    value
                  ])
                )
              : undefined;
          return [
            key,
            {
              ...service,
              serviceConfig: { ...service.serviceConfig, networks: next }
            }
          ];
        })
      );
      stateNodesRef.current = nextNodes;
      setNodes(nextNodes);
    }
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
      const source = stateNodesRef.current?.[connection[0]];
      const target = stateNodesRef.current?.[connection[1]];
      if (source?.type === "VOLUME" && target?.type === "SERVICE") {
        setServiceToEdit(target as IServiceNodeItem);
        toaster(
          "Set the volume's container path in the Data tab before exporting.",
          "info"
        );
      }
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
    () => ({ connections, networks, nodes, manifestSource }),
    [connections, networks, nodes, manifestSource]
  );

  const saveBeforeExport = async () => {
    if (!uuid || !canEdit) return;
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }
    const payload = buildPayload();
    await updateProjectMutation.mutateAsync({ payload, silent: true });
    lastSavedSnapshotRef.current = JSON.stringify(payload);
  };

  if (!isFetching) {
    if (!error) {
      return (
        <>
          {showVariablesModal && (
            <VariablesModal
              variables={variables}
              graph={codeGraphData}
              onChange={setVariables}
              onHide={() => setShowVariablesModal(false)}
              projectUuid={uuid}
              canManageValues={BACKEND_ENABLED && isAuthenticated && canEdit}
              onSaveBeforeExport={saveBeforeExport}
            />
          )}
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
              onSwitch={switchProject}
              onSignIn={signInToSave}
              isLoading={
                updateProjectMutation.isPending ||
                createProjectMutation.isPending
              }
              projectData={data ?? draftProject}
              isAuthenticated={isAuthenticated}
              canEdit={canEdit}
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
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setShowVariablesModal(true)}
                  >
                    <Braces className="w-4" />
                    <span>Variables</span>
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
                  canEdit={canEdit}
                  onExclusionsChange={(exclusions) => {
                    const next = {
                      ...stateManifestSourceRef.current,
                      exclusions
                    };
                    stateManifestSourceRef.current = next;
                    setManifestSource(next);
                  }}
                  onDiagnosticNavigate={(sourcePath) => {
                    const [, section, encoded] = sourcePath.split("/");
                    const name = encoded
                      ?.replaceAll("~1", "/")
                      .replaceAll("~0", "~");
                    const node = Object.values(
                      stateNodesRef.current || {}
                    ).find(
                      (item) =>
                        item.canvasConfig.node_name === name &&
                        item.type ===
                          (section === "services" ? "SERVICE" : "VOLUME")
                    );
                    if (node?.type === "SERVICE")
                      setServiceToEdit(node as IServiceNodeItem);
                    if (node?.type === "VOLUME")
                      setVolumeToEdit(node as IVolumeNodeItem);
                  }}
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
