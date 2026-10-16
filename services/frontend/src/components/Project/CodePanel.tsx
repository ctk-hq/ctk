import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import { ChevronLeft, CodeXml, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MIN_WIDTH = 280;
const COLLAPSE_WIDTH = 80;
const CANVAS_REVEAL = 16;

interface ResizeGesture {
  pointerId: number;
  startX: number;
  startWidth: number;
}

export default function CodePanel({ children }: { children: ReactNode }) {
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const reopenRef = useRef<HTMLButtonElement>(null);
  const gestureRef = useRef<ResizeGesture | null>(null);
  const lastOpenWidthRef = useRef<number | null>(null);
  const restoreFocusRef = useRef(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [preferredWidth, setPreferredWidth] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () =>
      setContainerWidth(container.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const maxWidth = Math.max(0, containerWidth - CANVAS_REVEAL);
  const minWidth = Math.min(MIN_WIDTH, maxWidth);
  const defaultWidth = Math.min(
    maxWidth,
    Math.max(MIN_WIDTH, Math.min(480, Math.round(containerWidth * 0.4)))
  );
  const width = Math.min(preferredWidth ?? defaultWidth, maxWidth);
  const isOpen = preferredWidth !== 0;

  useEffect(() => {
    if (!restoreFocusRef.current || isResizing) return;
    restoreFocusRef.current = false;
    if (isOpen) handleRef.current?.focus();
    else reopenRef.current?.focus();
  }, [isOpen, isResizing]);

  const close = (previousWidth: number) => {
    lastOpenWidthRef.current = previousWidth;
    restoreFocusRef.current = true;
    setPreferredWidth(0);
  };

  const startResize = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || gestureRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus();
    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: width
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsResizing(true);
  };

  const moveResize = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const nextWidth = Math.max(
      0,
      Math.min(maxWidth, gesture.startWidth + gesture.startX - event.clientX)
    );
    setPreferredWidth(nextWidth);
  };

  const finishResize = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    setIsResizing(false);
    const finalWidth = Math.max(
      0,
      Math.min(maxWidth, gesture.startWidth + gesture.startX - event.clientX)
    );
    if (finalWidth <= COLLAPSE_WIDTH) close(gesture.startWidth);
    else setPreferredWidth(Math.max(minWidth, finalWidth));
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const cancelResize = (event?: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || (event && event.pointerId !== gesture.pointerId)) return;
    gestureRef.current = null;
    setIsResizing(false);
    setPreferredWidth(gesture.startWidth);
    if (handleRef.current?.hasPointerCapture(gesture.pointerId)) {
      handleRef.current.releasePointerCapture(gesture.pointerId);
    }
  };

  const resizeWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (gestureRef.current && event.key !== "Escape") return;
    const step = event.shiftKey ? 64 : 32;
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        setPreferredWidth(Math.min(maxWidth, width + step));
        break;
      case "ArrowRight":
        event.preventDefault();
        if (width - step < minWidth) close(width);
        else setPreferredWidth(width - step);
        break;
      case "Home":
      case "Enter":
        event.preventDefault();
        close(width);
        break;
      case "End":
        event.preventDefault();
        setPreferredWidth(maxWidth);
        break;
      case "Escape":
        event.preventDefault();
        cancelResize();
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "pointer-events-none absolute inset-0 z-40",
        isResizing && "pointer-events-auto cursor-col-resize select-none"
      )}
    >
      <aside
        id={panelId}
        aria-label="Code panel"
        hidden={!isOpen && !isResizing}
        className="pointer-events-auto absolute inset-y-0 right-0 bg-background"
        style={{ width }}
      >
        <div className="h-full overflow-hidden">
          <div className="h-full min-w-70">{children}</div>
        </div>
        <div
          ref={handleRef}
          role="separator"
          aria-label="Resize code panel"
          aria-orientation="vertical"
          aria-controls={panelId}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={maxWidth ? Math.round((width / maxWidth) * 100) : 0}
          aria-valuetext={`${Math.round(width)} pixels wide`}
          tabIndex={0}
          data-resizing={isResizing}
          className="group absolute inset-y-0 -left-2 flex w-4 touch-none cursor-col-resize select-none items-center justify-center outline-none"
          onPointerDown={startResize}
          onPointerMove={moveResize}
          onPointerUp={finishResize}
          onPointerCancel={cancelResize}
          onLostPointerCapture={cancelResize}
          onKeyDown={resizeWithKeyboard}
        >
          <span className="absolute inset-y-0 left-1/2 w-px bg-border transition-colors group-hover:bg-primary group-focus-visible:bg-primary group-data-[resizing=true]:bg-primary" />
          <span className="relative flex h-12 w-4 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors group-hover:border-primary group-hover:bg-accent group-hover:text-foreground group-focus-visible:border-primary group-focus-visible:bg-accent group-data-[resizing=true]:border-primary group-data-[resizing=true]:bg-accent">
            <GripVertical className="size-3.5" aria-hidden="true" />
          </span>
        </div>
      </aside>
      {!isOpen && !isResizing && (
        <Button
          ref={reopenRef}
          variant="outline"
          size="sm"
          className="pointer-events-auto absolute right-0 top-1/2 h-12 -translate-y-1/2 rounded-r-none border-r-0"
          aria-label="Open code panel"
          aria-controls={panelId}
          aria-expanded={false}
          onClick={() => {
            restoreFocusRef.current = true;
            setPreferredWidth(
              Math.max(
                minWidth,
                Math.min(lastOpenWidthRef.current ?? defaultWidth, maxWidth)
              )
            );
          }}
        >
          <ChevronLeft />
          <CodeXml />
          <span>Code</span>
        </Button>
      )}
    </div>
  );
}
