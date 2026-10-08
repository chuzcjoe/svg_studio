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
  MAX_ZOOM,
  MIN_ZOOM,
  zoomView,
  type Size,
} from "../diagrams/viewport";
import type { DiagramStyleConfig } from "../styles/schema";
import { Icon } from "./Icon";
import type { StyleImpact } from "../diagrams/styleImpact";
import { StyleImpactOverlay } from "./StyleImpactOverlay";

type Gesture = {
  pointerId: number;
  startX: number;
  startY: number;
  panX: number;
  panY: number;
};
export function DiagramViewport({
  config,
  type,
  width,
  height,
  viewportRef,
  impact = null,
}: {
  config: DiagramStyleConfig;
  type: DiagramType;
  width: number;
  height: number;
  viewportRef: RefObject<HTMLDivElement | null>;
  impact?: StyleImpact | null;
}) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState(fitView);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [phase, setPhase] = useState<"idle" | "panning">("idle");
  const gesture = useRef<Gesture | null>(null);
  const helpId = useId();
  const diagram = { width, height };
  const scale = fitScale(size, diagram) * view.zoom;
  const left = (size.width - width * scale) / 2 + view.x;
  const top = (size.height - height * scale) / 2 + view.y;

  const cancelGesture = useCallback(() => {
    const current = gesture.current;
    gesture.current = null;
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
  useEffect(() => {
    window.addEventListener("blur", cancelGesture);
    return () => {
      window.removeEventListener("blur", cancelGesture);
      const current = gesture.current;
      gesture.current = null;
      if (current && viewportRef.current?.hasPointerCapture?.(current.pointerId))
        viewportRef.current.releasePointerCapture(current.pointerId);
    };
  }, [cancelGesture, viewportRef]);

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
  function startPan(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.isPrimary === false || gesture.current)
      return;
    event.currentTarget.focus({ preventScroll: true });
    const current: Gesture = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: view.x,
      panY: view.y,
    };
    gesture.current = current;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setPhase("panning");
  }
  function movePointer(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
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
        onPointerDown={startPan}
        onPointerMove={movePointer}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onLostPointerCapture={endPointer}
        onBlur={cancelGesture}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={keyboard}
      >
        <div
          ref={layerRef}
          className="diagram-layer"
          style={{
            width,
            height,
            transform: `translate(${left}px, ${top}px) scale(${scale})`,
          }}
        >
          <Diagram config={config} type={type} />
          {impact && impact.regions.length > 0 && (
            <StyleImpactOverlay
              impact={impact}
              layerRef={layerRef}
              width={width}
              height={height}
            />
          )}
        </div>
      </div>
      <div
        className={`impact-help ${impact ? "inspecting" : ""}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <Icon name="info" size={15} />
        <span>
          {impact ? (
            <><strong>{impact.label}</strong> {impact.description}</>
          ) : "Hover or focus a style setting to see what it changes."}
        </span>
      </div>
      <div className="canvas-bottom">
        <div className="pan-hint" id={helpId}>
          <Icon name="hand" size={15} />
          <span>
            Drag to pan
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
