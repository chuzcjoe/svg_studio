import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Diagram } from "../diagrams/Diagram";
import { diagramTypes, buildScene } from "../diagrams/layout";
import { presets, loadPreset } from "../styles/presets";
function assertScene(c: ReturnType<typeof loadPreset>) {
  for (const type of diagramTypes) {
    const s = buildScene(c, type);
    for (const n of s.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.y).toBeGreaterThanOrEqual(0);
      expect(n.x + n.w).toBeLessThan(s.width);
      expect(n.y + n.h).toBeLessThan(s.height);
      for (const b of s.nodes.filter((b) => b.id !== n.id)) {
        const overlaps =
          n.x < b.x + b.w &&
          n.x + n.w > b.x &&
          n.y < b.y + b.h &&
          n.y + n.h > b.y;
        expect(overlaps, `${type}: ${n.id} overlaps ${b.id}`).toBe(false);
      }
    }
    for (const e of s.edges)
      for (const [x, y] of e.points) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThan(s.width);
        expect(y).toBeLessThan(s.height);
      }
  }
}
describe("SVG rendering", () => {
  it.each(presets)("keeps default geometry inside bounds in $name", (c) =>
    assertScene(c),
  );
  it("grows bounds for large typography, nodes and padding", () => {
    const c = loadPreset("academic"),
      before = buildScene(c, "ML Architecture");
    c.typography.bodySize = 24;
    c.typography.labelSize = 18;
    c.typography.titleSize = 36;
    c.typography.lineHeight = 1.8;
    c.nodes.minWidth = 200;
    c.nodes.minHeight = 100;
    c.nodes.paddingX = 32;
    c.nodes.paddingY = 24;
    c.layout.horizontalGap = 100;
    c.layout.verticalGap = 100;
    c.layout.canvasPadding = 80;
    c.layout.groupPadding = 48;
    assertScene(c);
    const after = buildScene(c, "ML Architecture");
    expect(after.width).toBeGreaterThan(before.width);
    expect(after.height).toBeGreaterThan(before.height);
  });
  it("keeps smallest accepted geometry separate", () => {
    const c = loadPreset("academic");
    c.nodes.minWidth = 80;
    c.nodes.minHeight = 36;
    c.nodes.paddingX = 8;
    c.nodes.paddingY = 8;
    c.layout.horizontalGap = 24;
    c.layout.verticalGap = 24;
    c.layout.groupPadding = 12;
    c.layout.canvasPadding = 16;
    assertScene(c);
  });
  it.each(diagramTypes)("%s renders valid self-contained SVG", (type) => {
    const doc = new DOMParser().parseFromString(
      renderToStaticMarkup(
        <Diagram config={loadPreset("academic")} type={type} />,
      ),
      "image/svg+xml",
    );
    expect(doc.querySelector("parsererror")).toBeNull();
    expect(doc.querySelector("title")).toBeTruthy();
    expect(doc.querySelector("script,foreignObject,image")).toBeNull();
    for (const e of doc.querySelectorAll("[marker-end],[filter]")) {
      for (const attr of ["marker-end", "filter"]) {
        const match = e.getAttribute(attr)?.match(/url\(#(.+)\)/);
        if (match) expect(doc.getElementById(match[1])).not.toBeNull();
      }
    }
  });
  it("does not collide definition IDs between previews", () => {
    const html = renderToStaticMarkup(
      <>
        {diagramTypes.map((type) => (
          <Diagram key={type} config={loadPreset("academic")} type={type} />
        ))}
      </>,
    );
    const el = document.createElement("div");
    el.innerHTML = html;
    const ids = Array.from(el.querySelectorAll("[id]")).map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("changes arrowhead geometry and dashed paths", () => {
    const c = loadPreset("academic");
    c.connectors.arrowLength = 20;
    c.connectors.arrowWidth = 16;
    c.connectors.lineStyle = "dashed";
    const html = renderToStaticMarkup(<Diagram config={c} type="Flowchart" />);
    expect(html).toContain('markerWidth="20"');
    expect(html).toContain("L20 8 L0 16");
    expect(html).toContain('stroke-dasharray="6 5"');
  });
});

it('attaches transfer arrows to rounded node boundaries',()=>{const c=loadPreset('academic');c.nodes.radius=32;const scene=buildScene(c,'System Architecture');const cpu=scene.nodes.find(n=>n.id==='cpu')!;const [x,y]=scene.edges[0].points[0];const r=Math.min(c.nodes.radius,cpu.h/2);expect(Math.hypot(x-(cpu.x+cpu.w-r),y-(cpu.y+r))).toBeCloseTo(r,6);});
