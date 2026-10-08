import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRef } from "react";
import { DiagramViewport } from "../components/DiagramViewport";
import { buildScene } from "../diagrams/layout";
import {
  constrainView,
  fitScale,
  fitView,
  MAX_ZOOM,
  MIN_ZOOM,
  zoomView,
} from "../diagrams/viewport";
import { loadPreset } from "../styles/presets";

const viewport = { width: 992, height: 544 };
describe("preview transform", () => {
  it("fits landscape and portrait canvases without overflowing", () => {
    expect(
      fitScale({ width: 400, height: 200 }, { width: 1000, height: 1000 }),
    ).toBe(0.2);
    expect(
      fitScale({ width: 200, height: 400 }, { width: 1000, height: 500 }),
    ).toBe(0.2);
  });
  it("bounds zoom and retains a visible part of the diagram when panning", () => {
    const v = constrainView(
      { zoom: 10, x: 100000, y: -100000 },
      viewport,
      viewport,
    );
    expect(v.zoom).toBe(MAX_ZOOM);
    const originX = (viewport.width - viewport.width * v.zoom) / 2 + v.x;
    const originY = (viewport.height - viewport.height * v.zoom) / 2 + v.y;
    expect(originX).toBeLessThan(viewport.width);
    expect(originY + viewport.height * v.zoom).toBeGreaterThan(0);
    expect(
      constrainView({ zoom: 0.01, x: 0, y: 0 }, viewport, viewport).zoom,
    ).toBe(MIN_ZOOM);
  });
  it("keeps the same diagram point under the center when zooming after a pan", () => {
    const before = { zoom: 1, x: 50, y: 20 };
    const after = zoomView(before, 2, viewport, viewport);
    expect(after.x / after.zoom).toBe(before.x / before.zoom);
    expect(after.y / after.zoom).toBe(before.y / before.zoom);
  });
});

class TestPointerEvent extends MouseEvent {
  readonly pointerId: number;
  readonly isPrimary: boolean;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
    this.isPrimary = init.isPrimary ?? true;
  }
}
beforeEach(() => {
  vi.stubGlobal("PointerEvent", TestPointerEvent);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: viewport.width,
    bottom: viewport.height,
    width: viewport.width,
    height: viewport.height,
    toJSON: () => ({}),
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function setup() {
  const config = loadPreset("academic"),
    scene = buildScene(config, "ML Architecture");
  const ref = createRef<HTMLDivElement>();
  const rendered = render(
    <DiagramViewport
      config={config}
      type="ML Architecture"
      width={scene.width}
      height={scene.height}
      viewportRef={ref}
    />,
  );
  const stage = screen.getByRole("region", { name: "Interactive SVG preview" });
  const layer = () =>
    stage.querySelector<HTMLElement>(".diagram-layer")!.style.transform;
  return { stage, layer, ...rendered, ref, config };
}
describe("preview navigation", () => {
  it("zooms with buttons, enforces both limits, and fits again", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByLabelText("Zoom level").textContent).toBe("125%");
    for (let i = 0; i < 20; i++)
      fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByLabelText("Zoom level").textContent).toBe("400%");
    expect(
      (screen.getByRole("button", { name: "Zoom in" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    for (let i = 0; i < 20; i++)
      fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(screen.getByLabelText("Zoom level").textContent).toBe("25%");
    expect(
      (screen.getByRole("button", { name: "Zoom out" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Fit to canvas" }));
    expect(screen.getByLabelText("Zoom level").textContent).toBe("100%");
  });
  it("does not shift the diagram on a click without moving", () => {
    const { stage, layer } = setup(), initial = layer();
    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 100, clientY: 100, button: 0 });
    expect(stage.className).toContain("panning");
    expect(layer()).toBe(initial);
    fireEvent.pointerUp(stage, { pointerId: 1 });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 170, clientY: 160 });
    expect(layer()).toBe(initial);
    expect(stage.className).not.toContain("panning");
  });
  it("pans immediately, stops after release, and preserves SVG export markup", () => {
    const { stage, layer } = setup();
    const svg = stage.querySelector("svg")!.outerHTML;
    fireEvent.pointerDown(stage, {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
      button: 0,
    });
    expect(stage.className).toContain("panning");
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 180, clientY: 140 });
    expect(layer()).toBe("translate(80px, 40px) scale(1)");
    fireEvent.pointerUp(stage, { pointerId: 1 });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 250, clientY: 250 });
    expect(layer()).toBe("translate(80px, 40px) scale(1)");
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(stage.querySelector("svg")!.outerHTML).toBe(svg);
    fireEvent.click(screen.getByRole("button", { name: "Fit to canvas" }));
    expect(layer()).toBe("translate(0px, 0px) scale(1)");
  });
  it("stops dragging when the pointer is cancelled", () => {
    const { stage, layer } = setup(),
      initial = layer();
    fireEvent.pointerDown(stage, {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
      button: 0,
    });
    fireEvent.pointerCancel(stage, { pointerId: 1 });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 180, clientY: 140 });
    expect(layer()).toBe(initial);
    expect(stage.className).not.toContain("panning");
  });
  it("supports keyboard navigation and resets when changing diagrams", () => {
    const { stage, layer, rerender, ref, config } = setup();
    fireEvent.keyDown(stage, { key: "+" });
    expect(screen.getByLabelText("Zoom level").textContent).toBe("125%");
    fireEvent.keyDown(stage, { key: "ArrowRight" });
    expect(layer()).not.toBe("translate(0px, 0px) scale(1)");
    fireEvent.keyDown(stage, { key: "Home" });
    expect(layer()).toBe("translate(0px, 0px) scale(1)");
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    const scene = buildScene(config, "Flowchart");
    rerender(
      <DiagramViewport
        config={config}
        type="Flowchart"
        width={scene.width}
        height={scene.height}
        viewportRef={ref}
      />,
    );
    expect(screen.getByLabelText("Zoom level").textContent).toBe("100%");
  });
  it("ignores right clicks and unrelated pointers during a drag", () => {
    const { stage, layer } = setup(), initial = layer();
    fireEvent.pointerDown(stage, { pointerId: 1, button: 2, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 180, clientY: 140 });
    expect(layer()).toBe(initial);
    fireEvent.pointerDown(stage, { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(stage, { pointerId: 2, clientX: 180, clientY: 140 });
    fireEvent.pointerUp(stage, { pointerId: 2 });
    expect(layer()).toBe(initial);
    expect(stage.className).toContain("panning");
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 180, clientY: 140 });
    expect(layer()).toBe("translate(80px, 40px) scale(1)");
  });
  it.each(["window blur", "lost capture"])("stops dragging after %s", (reason) => {
    const { stage, layer } = setup();
    fireEvent.pointerDown(stage, { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 120, clientY: 120 });
    const before = layer();
    if (reason === "window blur") fireEvent.blur(window);
    else fireEvent.lostPointerCapture(stage, { pointerId: 1 });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 180, clientY: 140 });
    expect(layer()).toBe(before);
    expect(stage.className).not.toContain("panning");
  });
});
