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

// Check the shared workflow's geometry rather than just its rendered markup.
describe("shared flowchart example", () => {
  it("uses the same nodes, branches, group and reference link in every preset", () => {
    const signature = (c: ReturnType<typeof loadPreset>) => {
      const scene = buildScene(c, "Flowchart");
      return {
        nodes: scene.nodes.map(({ id, label, sub, role, shape }) => ({ id, label, sub, role, shape })),
        labels: scene.labels.map(({ text }) => text),
        groups: scene.groups.map(({ label }) => label),
        edges: scene.edges.map(({ arrow, subtle, dashed }) => ({ arrow, subtle, dashed })),
      };
    };
    const example = signature(loadPreset("academic"));
    expect(example.nodes).toHaveLength(7);
    expect(example.groups).toEqual(["VALIDATION"]);
    expect(example.labels).toEqual(expect.arrayContaining(["Yes", "No", "Fix"]));
    expect(example.nodes.filter((n) => n.shape === "decision")).toHaveLength(1);
    expect(example.nodes.filter((n) => n.shape === "terminal")).toHaveLength(1);
    expect(example.edges.filter((e) => e.arrow)).toHaveLength(6);
    expect(example.edges.find((e) => e.subtle)).toMatchObject({ dashed: true, arrow: false });
    for (const preset of presets) expect(signature(preset)).toEqual(example);
  });
  it("changes the No branch route while keeping its arrow attached to shape boundaries", () => {
    const c = loadPreset("academic");
    const orthogonal = buildScene(c, "Flowchart");
    c.connectors.routing = "straight";
    const straight = buildScene(c, "Flowchart");
    expect(orthogonal.edges[3].points).toHaveLength(3);
    expect(straight.edges[3].points).toHaveLength(2);
    expect(straight.edges[3].points[0]).toEqual(orthogonal.edges[3].points[0]);
    expect(straight.edges[3].points.at(-1)).toEqual(orthogonal.edges[3].points.at(-1));
    const decision = straight.nodes.find((n) => n.id === "decision")!;
    const review = straight.nodes.find((n) => n.id === "review")!;
    expect(straight.edges[3].points[0]).toEqual([decision.x + decision.w / 2, decision.y + decision.h]);
    expect(straight.edges[3].points.at(-1)).toEqual([review.x + review.w, review.y + review.h / 2]);
  });
  it("keeps connectors clear of unrelated nodes at both routing modes and extreme settings", () => {
    const configs = [loadPreset("academic"), loadPreset("soft"), loadPreset("mono")];
    const large = loadPreset("academic");
    Object.assign(large.typography, { bodySize: 24, labelSize: 18, titleSize: 36, lineHeight: 1.8 });
    Object.assign(large.nodes, { minWidth: 200, minHeight: 100, paddingX: 32, paddingY: 24 });
    // Large text with tight spacing is a stronger collision check than spacious defaults.
    Object.assign(large.layout, { horizontalGap: 24, verticalGap: 24, groupPadding: 12 });
    configs.push(large);
    for (const c of configs) for (const routing of ["straight", "orthogonal"] as const) {
      c.connectors.routing = routing;
      const scene = buildScene(c, "Flowchart");
      const inside = (point: number[], n: typeof scene.nodes[number]) =>
        point[0] >= n.x && point[0] <= n.x + n.w && point[1] >= n.y && point[1] <= n.y + n.h;
      for (const edge of scene.edges) for (const node of scene.nodes) {
        if (inside(edge.points[0], node) || inside(edge.points.at(-1)!, node)) continue;
        for (let i = 1; i < edge.points.length; i++) {
          const start = edge.points[i - 1], end = edge.points[i];
          let low = 0, high = 1;
          for (const [axis, min, max] of [[0, node.x + 0.01, node.x + node.w - 0.01], [1, node.y + 0.01, node.y + node.h - 0.01]]) {
            const delta = end[axis] - start[axis];
            if (!delta) {
              if (start[axis] < min || start[axis] > max) { low = 1; high = 0; }
            } else {
              const bounds = [(min - start[axis]) / delta, (max - start[axis]) / delta].sort((a, b) => a - b);
              low = Math.max(low, bounds[0]); high = Math.min(high, bounds[1]);
            }
          }
          expect(low > high, `${routing}: connector crosses ${node.id}`).toBe(true);
        }
      }
      for (const n of scene.nodes) {
        expect(n.x + n.w).toBeLessThan(scene.width);
        expect(n.y + n.h).toBeLessThan(scene.height);
        if (n.shape === "decision") {
          expect(n.w / 2).toBeGreaterThanOrEqual(n.label.length * c.typography.bodySize * 0.67 + 2 * c.nodes.paddingX);
          expect(n.h / 2).toBeGreaterThanOrEqual(c.typography.bodySize * c.typography.lineHeight + 2 * c.nodes.paddingY);
        }
        if (c.layout.snapToGrid) { expect(n.x % 8).toBe(0); expect(n.y % 8).toBe(0); }
      }
    }
  });
});
