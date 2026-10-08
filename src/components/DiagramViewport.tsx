import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import { Diagram } from "../diagrams/Diagram";
import type { DiagramType } from "../diagrams/layout";
import {
  constrainView,
  fitScale,
  fitView,
  HOLD_TO_PAN_MS,
  MAX_ZOOM,
  MIN_ZOOM,
  zoomView,
  type Size,
} from "../diagrams/viewport";
import type { DiagramStyleConfig } from "../styles/schema";
import { Icon } from "./Icon";

type Gesture = {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  panX: number;
  panY: number;
  armed: boolean;
};
export function DiagramViewport({
  config,
  type,
  width,
  height,
  viewportRef,
}: {
  config: DiagramStyleConfig;
  type: DiagramType;
  width: number;
  height: number;
  viewportRef: RefObject<HTMLDivElement | null>;
}) {
  const [view, setView] = useState(fitView);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [phase, setPhase] = useState<"idle" | "holding" | "panning">("idle");
  const gesture = useRef<Gesture | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const helpId = useId();
  const diagram = { width, height };
  const scale = fitScale(size, diagram) * view.zoom;
  const left = (size.width - width * scale) / 2 + view.x;
  const top = (size.height - height * scale) / 2 + view.y;

  const cancelGesture = useCallback(() => {
    const current = gesture.current;
    gesture.current = null;
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setPhase("idle");
    const node = viewportRef.current;
    if (current && node?.hasPointerCapture?.(current.pointerId))
      node.releasePointerCapture(current.pointerId);
  }, [viewportRef]);
  useLayoutEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const measure = () => {
      const bounds = node.getBoundingClientRect();
      setSize((old) =>
        old.width === bounds.width && old.height === bounds.height
          ? old
          : { width: bounds.width, height: bounds.height },
      );
    };
    measure();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    observer?.observe(node);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [viewportRef]);
  useEffect(() => {
    cancelGesture();
    setView(fitView());
  }, [type, cancelGesture]);
  useEffect(() => {
    cancelGesture();
    setView((old) =>
      constrainView(
        old,
        { width: size.width, height: size.height },
        { width, height },
      ),
    );
  }, [size.width, size.height, width, height, cancelGesture]);
  useEffect(
    () => () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      gesture.current = null;
    },
    [],
  );

  function zoomBy(delta: number) {
    cancelGesture();
    setView((old) =>
      zoomView(old, Math.round((old.zoom + delta) * 100) / 100, size, diagram),
    );
  }
  function reset() {
    cancelGesture();
    setView(fitView());
  }
  function startHold(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.isPrimary === false || gesture.current)
      return;
    event.currentTarget.focus({ preventScroll: true });
    const current: Gesture = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      panX: view.x,
      panY: view.y,
      armed: false,
    };
    gesture.current = current;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setPhase("holding");
    holdTimer.current = setTimeout(() => {
      if (gesture.current !== current) return;
      current.armed = true;
      current.startX = current.lastX;
      current.startY = current.lastY;
      holdTimer.current = null;
      setPhase("panning");
    }, HOLD_TO_PAN_MS);
  }
  function movePointer(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    current.lastX = event.clientX;
    current.lastY = event.clientY;
    if (!current.armed) {
      if (
        Math.hypot(
          event.clientX - current.startX,
          event.clientY - current.startY,
        ) > 8
      )
        cancelGesture();
      return;
    }
    event.preventDefault();
    setView((old) =>
      constrainView(
        {
          zoom: old.zoom,
          x: current.panX + event.clientX - current.startX,
          y: current.panY + event.clientY - current.startY,
        },
        size,
        diagram,
      ),
    );
  }
  function endPointer(event: PointerEvent<HTMLDivElement>) {
    if (gesture.current?.pointerId === event.pointerId) cancelGesture();
  }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [32, 0],
      ArrowRight: [-32, 0],
      ArrowUp: [0, 32],
      ArrowDown: [0, -32],
    };
    if (moves[event.key]) {
      event.preventDefault();
      cancelGesture();
      const [x, y] = moves[event.key];
      setView((old) =>
        constrainView({ ...old, x: old.x + x, y: old.y + y }, size, diagram),
      );
    } else if (["+", "=", "-", "_", "Home", "0"].includes(event.key)) {
      event.preventDefault();
      if (event.key === "Home" || event.key === "0") reset();
      else zoomBy(event.key === "-" || event.key === "_" ? -0.25 : 0.25);
    }
  }
  return (
    <>
      <div
        ref={viewportRef}
        className={`diagram-stage interactive-viewport ${phase}`}
        style={
          { "--svg-aspect": `${width} / ${height}` } as React.CSSProperties
        }
        role="region"
        aria-label="Interactive SVG preview"
        aria-describedby={helpId}
        tabIndex={0}
        onPointerDown={startHold}
        onPointerMove={movePointer}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onLostPointerCapture={endPointer}
        onBlur={cancelGesture}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={keyboard}
      >
        <div
          className="diagram-layer"
          style={{
            width,
            height,
            transform: `translate(${left}px, ${top}px) scale(${scale})`,
          }}
        >
          <Diagram config={config} type={type} />
        </div>
      </div>
      <div className="canvas-bottom">
        <div className="pan-hint" id={helpId}>
          <Icon name="hand" size={15} />
          <span>
            {phase === "panning" ? "Drag to pan" : "Hold, then drag to pan"}
            <span className="visually-hidden">
              . When the preview is focused, use plus and minus to zoom, arrow
              keys to pan, and Home to fit.
            </span>
          </span>
        </div>
        <div
          className="zoom-controls"
          role="group"
          aria-label="Preview navigation"
        >
          <button
            className="zoom-button"
            aria-label="Zoom out"
            title="Zoom out"
            disabled={view.zoom <= MIN_ZOOM}
            onClick={() => zoomBy(-0.25)}
          >
            <Icon name="minus" size={17} />
          </button>
          <output
            className="zoom-value"
            aria-label="Zoom level"
            title="Zoom relative to fit"
          >
            {Math.round(view.zoom * 100)}%
          </output>
          <button
            className="zoom-button"
            aria-label="Zoom in"
            title="Zoom in"
            disabled={view.zoom >= MAX_ZOOM}
            onClick={() => zoomBy(0.25)}
          >
            <Icon name="plus" size={17} />
          </button>
          <button className="fit-button" onClick={reset}>
            <Icon name="fit" size={14} />
            Fit to canvas
          </button>
        </div>
      </div>
    </>
  );
}
