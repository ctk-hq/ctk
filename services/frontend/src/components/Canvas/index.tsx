import { FC, useState, useEffect, createRef, useRef } from "react";
import { useMemo } from 'react';
import { debounce } from 'lodash';
import { Dictionary, values } from "lodash";
import { v4 as uuidv4 } from "uuid";
import YAML from "yaml";
import { PlusIcon } from "@heroicons/react/solid";
import {
  nodeCreated,
  nodeDeleted,
  nodeUpdated,
  connectionDetached,
  connectionAttached,
  position
} from "../../reducers";
import Remove from "../Remove";
import eventBus from "../../events/eventBus";
import { Popover } from "./Popover";
import ModalConfirmDelete from "../Modal/Service/ConfirmDelete";
import ModalServiceCreate from "../Modal/Service/Create";
import ModalServiceEdit from "../Modal/Service/Edit";
import { useClickOutside } from "../../utils/clickOutside";
import { IClientNodeItem, IGraphData } from "../../types";
import { nodeLibraries } from "../../utils/data/libraries";
import { getClientNodeItem, flattenLibraries, ensure } from "../../utils";
import { flattenGraphData } from "../../utils/generators";
import { generateHttp } from "../../services/generate";
import { checkHttpStatus } from "../../services/helpers";
import { useJsPlumb } from "../useJsPlumb";
import CodeEditor from "../CodeEditor";

const CANVAS_ID: string = "canvas-container-" + uuidv4();

interface ICanvasProps {
  state: any;
  dispatch: any;
  height: number;
}

export const Canvas: FC<ICanvasProps> = (props) => {
  const { state, dispatch, height } = props;

  const [language, setLanguage] = useState("yaml");
  const [scale, setScale] = useState(1);
  const [generatedCode, setGeneratedCode] = useState<string>();
  const [formattedCode, setFormattedCode] = useState<string>("");
  const [instanceNodes, setInstanceNodes] = useState(state.nodes);
  const [instanceConnections, setInstanceConnections] = useState(state.connections);
  const [copyText, setCopyText] = useState("Copy");
  const [selectedNode, setSelectedNode] = useState<IClientNodeItem | null>(null);
  const [showModalCreateService, setShowModalCreateService] = useState(false);
  const [showModalEditService, setShowModalEditService] = useState(false);
  const [showModalConfirmDeleteService, setShowModalConfirmDeleteService] = useState(false);
  const [showVolumesModal, setShowVolumesModal] = useState(false);
  const [showNetworksModal, setShowNetworksModal] = useState(false);

  const [nodeDragging, setNodeDragging] = useState<string | null>();
  const [nodeHovering, setNodeHovering] = useState<string | null>();
  const [dragging, setDragging] = useState(false);
  const [_scale, _setScale] = useState(1);
  const [_left, _setLeft] = useState(0);
  const [_top, _setTop] = useState(0);
  const [_initX, _setInitX] = useState(0);
  const [_initY, _setInitY] = useState(0);

  const [containerCallbackRef, setZoom, setStyle, removeEndpoint] = useJsPlumb(
    instanceNodes,
    instanceConnections,
    ((graphData: IGraphData) => onGraphUpdate(graphData)),
    ((positionData: any) => onEndpointPositionUpdate(positionData)),
    ((connectionData: any) => onConnectionAttached(connectionData)),
    ((connectionData: any) => onConnectionDetached(connectionData))
  );

  const drop = createRef<HTMLDivElement>();
  const stateRef = useRef<Dictionary<IClientNodeItem>>();

  let translateWidth = (document.documentElement.clientWidth * (1 - scale)) / 2;
  let translateHeight = ((document.documentElement.clientHeight - 64) * (1 - scale)) / 2;

  stateRef.current = state.nodes;

  useClickOutside(drop, () => {
    setShowModalCreateService(false);
  });

  useEffect(() => {
    setScale(_scale);
  }, [_scale]);

  const debouncedOnGraphUpdate = useMemo(() => debounce((graphData) => {
    const flatData = flattenGraphData(graphData);
    generateHttp(flatData)
      .then(checkHttpStatus)
      .then(data => {
        if (data['code'].length) {
          for (var i = 0; i < data['code'].length; ++i) {
            data['code'][i] = data['code'][i].replace(/(\r\n|\n|\r)/gm, "");
          }

          const code = data['code'].join("\n");
          setGeneratedCode(code);
        }
      })
      .catch(err => {

      })
      .finally(() => {

      });
  }, 450), []);

  const debouncedOnCodeChange = useMemo(() => debounce((code: string) => {
    //formik.setFieldValue("code", e, false);
  }, 700), []);

  const zoomIn = () => {
    setScale((scale) => scale + 0.1);
  }

  const zoomOut = () => {
    setScale((scale) => scale - 0.1);
  }

  const copy = () => {
    navigator.clipboard.writeText(formattedCode);
    setCopyText("Copied");

    setTimeout(() => {
      setCopyText("Copy");
    }, 300);
  }

  const onAddEndpoint = (values: any) => {
    let sections = flattenLibraries(nodeLibraries);
    let clientNodeItem = getClientNodeItem(values, ensure(sections.find((l) => l.Type === values.type)));
    clientNodeItem.position = { left: 60, top: 30 };
    dispatch(nodeCreated(clientNodeItem));
  }

  const onUpdateEndpoint = (nodeItem: IClientNodeItem) => {
    dispatch(nodeUpdated(nodeItem));
  }

  const onRemoveEndpoint = (key: string) => {
    const nodeToRemove = instanceNodes[key];
    removeEndpoint(nodeToRemove);
    dispatch(nodeDeleted(nodeToRemove));
  }

  const onEndpointPositionUpdate = (positionData: any) => {
    if (stateRef.current) {
      const node = stateRef.current[positionData.key];
      node.position = {...node.position, ...positionData.position};
      dispatch(nodeUpdated(node));
    }
  };

  const onConnectionDetached = (data: any) => {
    dispatch(connectionDetached(data));
  }

  const onConnectionAttached = (data: any) => {
    dispatch(connectionAttached(data));
  }

  const onGraphUpdate = (graphData: any) => {
    debouncedOnGraphUpdate(graphData);
  };

  const onCodeUpdate = (code: string) => {
    debouncedOnCodeChange(code);
  };

  const onCanvasMousewheel = (e: any) => {
    if (e.deltaY < 0) {
      _setScale(_scale + _scale * 0.25);
    }

    if (e.deltaY > 0) {
      _setScale(_scale - _scale * 0.25);
    }
  }

  const onCanvasMouseUpLeave = (e: any) => {
    if (dragging) {
      let left = _left + e.pageX - _initX;
      let top = _top + e.pageY - _initY;

      _setLeft(left);
      _setTop(top);
      setDragging(false);
      dispatch(position({
        left: left,
        top: top
      }));
    }
  }

  const onCanvasMouseMove = (e: any) => {
    if (!dragging) {
      return;
    }

    const styles = {
      "left": _left + e.pageX - _initX + 'px',
      "top": _top + e.pageY - _initY + 'px'
    }

    setStyle(styles);
  }

  const onCanvasMouseDown = (e: any) => {
    _setInitX(e.pageX);
    _setInitY(e.pageY);
    setDragging(true);
  }

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
    setInstanceNodes(state.nodes);
  }, [state.nodes]);

  useEffect(() => {
    setInstanceConnections(state.connections);
  }, [state.connections]);

  useEffect(() => {
    setZoom(scale);
    dispatch(position({
      scale: scale
    }));
  }, [dispatch, scale, setZoom]);

  useEffect(() => {
    const styles = {
      "left": _left + 'px',
      "top": _top + 'px'
    }

    setStyle(styles);
  }, [_left, _top, setStyle]);

  useEffect(() => {
    _setTop(state.canvasPosition.top);
    _setLeft(state.canvasPosition.left);
    _setScale(state.canvasPosition.scale);
  }, [state.canvasPosition]);

  useEffect(() => {
    eventBus.on("EVENT_DRAG_START", (data: any) => {
      setNodeDragging(data.detail.message.id);
    });

    eventBus.on("EVENT_DRAG_STOP", (data: any) => {
      setNodeDragging(null);
    });

    return () => {
      eventBus.remove("EVENT_DRAG_START", () => {});
      eventBus.remove("EVENT_DRAG_STOP", () => { });
    };
  }, []);

  return (
    <>
      {showModalCreateService
        ? <ModalServiceCreate
          onHide={() => setShowModalCreateService(false)}
          onAddEndpoint={(values: any) => onAddEndpoint(values)}
        />
        : null
      }

      {showModalEditService
        ? <ModalServiceEdit
          node={selectedNode}
          onHide={() => setShowModalEditService(false)}
          onUpdateEndpoint={(values: any) => onUpdateEndpoint(values)}
        />
        : null
      }

      {showModalConfirmDeleteService
        ? <ModalConfirmDelete
          onHide={() => setShowModalConfirmDeleteService(false)}
          onConfirm={() => {
            setShowModalEditService(false);
            if (selectedNode) {
              onRemoveEndpoint(selectedNode.key);
            }
          }}
        />
        : null
      }

      {instanceNodes &&
        <>
          <div className="w-full overflow-hidden md:w-2/3 z-40" style={{height: height}}>
            <div className="relative h-full">
              <div className="absolute top-0 right-0 z-40">
                <div className="flex space-x-2 p-2">
                  <button className="hidden btn-util" type="button" onClick={zoomOut} disabled={scale <= 0.5}>-</button>
                  <button className="hidden btn-util" type="button" onClick={zoomIn} disabled={scale >= 1}>+</button>
                  <button className="flex space-x-1 btn-util" type="button" onClick={() => setShowModalCreateService(true)}>
                    <PlusIcon className="w-3"/>
                    <span>Service</span>
                  </button>
                  <button className="btn-util" type="button" onClick={() => setShowVolumesModal(true)}>
                    Volumes
                  </button>
                  <button className="btn-util" type="button" onClick={() => setShowNetworksModal(true)}>
                    Networks
                  </button>
                </div>
              </div>

              <div key={CANVAS_ID} className="jsplumb-box"
                onWheel={onCanvasMousewheel}
                onMouseMove={onCanvasMouseMove}
                onMouseDown={onCanvasMouseDown}
                onMouseUp={onCanvasMouseUpLeave}
                onMouseLeave={onCanvasMouseUpLeave}
                onContextMenu={(event) => { event.stopPropagation(); event.preventDefault(); }}
              >
                <div
                  id={CANVAS_ID}
                  ref={containerCallbackRef}
                  className="canvas h-full w-full"
                  style={{
                    transformOrigin: '0px 0px 0px',
                    transform: `translate(${translateWidth}px, ${translateHeight}px) scale(${scale})`
                  }}
                >
                  {(values(instanceNodes).length > 0) && (
                    <>
                      {values(instanceNodes).map((x) => (
                        <div
                          key={x.key}
                          className={"node-item cursor-pointer shadow flex flex-col group"}
                          id={x.key}
                          style={{ top: x.position.top, left: x.position.left }}
                          onMouseEnter={() => setNodeHovering(x.key)}
                          onMouseLeave={() => {
                            if (nodeHovering === x.key) {
                              setNodeHovering(null);
                            }
                          }}
                        >
                          {((nodeHovering === x.key) && (nodeDragging !== x.key)) &&
                            <Popover
                              onEditClick={() => {
                                setSelectedNode(x);
                                setShowModalEditService(true);
                              }}
                              onDeleteClick={() => {
                                setSelectedNode(x);
                                setShowModalConfirmDeleteService(true);
                              }}
                            ></Popover>
                          }
                          <div className="node-label w-full py-2 px-4">
                            <div className="text-sm font-semibold">
                              {x.configuration.prettyName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {x.configuration.prettyName}
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="relative group code-column w-full md:w-1/3">
            <div className={`absolute top-0 left-0 right-0 z-10 flex justify-end p-1 space-x-2 group-hover:visible invisible`}>
              <button className={`btn-util ${language === "json" ? `btn-util-selected` : ``}`} onClick={() => setLanguage('json')}>json</button>
              <button className={`btn-util ${language === "yaml" ? `btn-util-selected` : ``}`} onClick={() => setLanguage('yaml')}>yaml</button>
              <button className="btn-util" type="button" onClick={copy}>{copyText}</button>
            </div>

            <CodeEditor
              data={formattedCode}
              language={language}
              onChange={(e: any) => {onCodeUpdate(e)}}
              disabled={false}
              lineWrapping={false}
              height={height}
            />
          </div>
        </>
      }
    </>
  );
};
