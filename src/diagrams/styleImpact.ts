import { colorLabels, controls } from "../styles/controls";
import type { ConfigGroup, DiagramStyleConfig } from "../styles/schema";
import { buildScene, type NodeBox } from "./layout";

export type StyleTarget = { group: ConfigGroup; key: string };
export type ImpactRegion = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  outline?: boolean;
  area?: boolean;
  radius?: number;
  textPart?: string;
  path?: string;
};
export type StyleImpact = {
  label: string;
  description: string;
  regions: ImpactRegion[];
};

// Regions describe the current flowchart, independent of zoom and pan.
export function getStyleImpact(
  c: DiagramStyleConfig,
  target: StyleTarget | null,
): StyleImpact | null {
  if (!target) return null;
  const { group, key } = target;
  const label = group === "colors"
    ? colorLabels[key]
    : controls[group].find((control) => control.key === key)?.label;
  if (!label) return null;
  const scene = buildScene(c, "Flowchart");
  const nodes = scene.nodes;
  const boxes: ImpactRegion[] = nodes.map((n) => ({
    id: n.id, x: n.x, y: n.y, width: n.w, height: n.h,
    radius: n.shape === "terminal" ? n.h / 2 : Math.min(c.nodes.radius, n.h / 2),
    ...(n.shape === "decision" ? {
      path: `M${n.x + n.w / 2} ${n.y} L${n.x + n.w} ${n.y + n.h / 2} L${n.x + n.w / 2} ${n.y + n.h} L${n.x} ${n.y + n.h / 2} Z`,
      area: true,
    } : {}),
  }));
  const outlines = boxes.map((box) => ({ ...box, outline: true, area: false }));
  const groupBoxes: ImpactRegion[] = scene.groups.map((g, i) => ({
    id: `group-${i}`, x: g.x, y: g.y, width: g.w, height: g.h,
    radius: c.nodes.radius,
  }));
  const groupOutlines = groupBoxes.map((box) => ({ ...box, outline: true }));
  const textRegion = (id: string, x: number, y: number, text: string, size: number, centered = false): ImpactRegion => {
    const width = text.length * size * 0.67;
    return { id, textPart: id, x: centered ? x - width / 2 : x, y: y - size, width, height: size * 1.3 };
  };
  const title = scene.labels.filter((l) => l.title).map((l) => textRegion("title", l.x, l.y, l.text, c.typography.titleSize));
  const captions = scene.labels.filter((l) => !l.title).map((l) => textRegion(l.id!, l.x, l.y, l.text, c.typography.labelSize, l.anchor === "middle"));
  const groupLabels = scene.groups.map((g, i) => textRegion(`group-${i}-label`, g.x + c.layout.groupPadding, g.y + c.layout.groupPadding + c.typography.labelSize * 0.8, g.label, c.typography.labelSize));
  const bodies = nodes.map((n) => textRegion(`${n.id}-label`, n.x + n.w / 2, n.y + n.h / 2, n.label, c.typography.bodySize, true));
  const subtitles = nodes.filter((n) => n.sub).map((n) => textRegion(`${n.id}-subtitle`, n.x + n.w / 2, n.y + n.h / 2 + c.typography.labelSize, n.sub!, c.typography.labelSize, true));
  const secondaryText = [...subtitles, ...captions, ...groupLabels];
  const text = [...title, ...bodies, ...secondaryText];
  const edgeRegion = (index: number): ImpactRegion => ({
    id: `edge-${index}`, x: 0, y: 0, width: 0, height: 0,
    path: scene.edges[index].points.map(([x, y], j) => `${j ? "L" : "M"}${x} ${y}`).join(" "),
  });
  const mainEdges = scene.edges.flatMap((e, i) => e.subtle ? [] : [edgeRegion(i)]);
  const subtleEdges = scene.edges.flatMap((e, i) => e.subtle ? [edgeRegion(i)] : []);
  const edges = scene.edges.map((_, i) => edgeRegion(i));
  const arrows: ImpactRegion[] = scene.edges.flatMap((e, i) => {
    if (!e.arrow) return [];
    const [x, y] = e.points[e.points.length - 1];
    const previous = e.points.slice(0, -1).reverse().find(([px, py]) => px !== x || py !== y)!;
    const length = Math.hypot(x - previous[0], y - previous[1]);
    const ux = (x - previous[0]) / length, uy = (y - previous[1]) / length;
    const bx = x - ux * c.connectors.arrowLength, by = y - uy * c.connectors.arrowLength;
    const half = c.connectors.arrowWidth / 2;
    return [{ id: `arrow-${i}`, x: 0, y: 0, width: 0, height: 0,
      path: `M${x} ${y} L${bx - uy * half} ${by + ux * half} L${bx + uy * half} ${by - ux * half} Z` }];
  });
  const result = (description: string, regions: ImpactRegion[]): StyleImpact => ({ label, description, regions });
  const inactive = (description: string) => result(description, []);
  const nodeOutlines = (test: (n: NodeBox) => boolean) => outlines.filter((_, i) => test(nodes[i]));
  if (group === "colors") {
    switch (key) {
      case "background": return result("Canvas background and the base beneath node fills.", [{ id: "canvas", x: 3, y: 3, width: scene.width - 6, height: scene.height - 6, outline: true }]);
      case "primary": return result("The diagram title and the Prepare node outline.", [...title, ...nodeOutlines((n) => !!n.primary)]);
      case "secondary": return result("The dashed reference link from Policy to Review.", subtleEdges);
      case "accent": return result("The decision diamond's outline distinguishes the validation step.", nodeOutlines((n) => !!n.accent));
      case "text": return result("Main node labels; also the shadow color when shadows are enabled.", [...bodies, ...(c.effects.shadowEnabled ? outlines : [])]);
      case "mutedText": return result("Subtitles, branch labels, the group heading and the caption.", secondaryText);
      case "border": return result("Ordinary node outlines and the Validation group boundary.", [...nodeOutlines((n) => !n.primary && !n.accent), ...groupOutlines]);
      case "connector": return result("Directed flow lines and their arrowheads.", [...mainEdges, ...arrows]);
      case "annotation": return result("The Validation group background and the Policy note fill.", [...groupBoxes, ...(c.nodes.fillMode === "outline" ? [] : boxes.filter((_, i) => nodes[i].role === "annotation"))]);
      case "input": case "processing": case "output":
        return c.nodes.fillMode === "outline"
          ? inactive("Node fills are hidden in Outline mode. Choose Solid or Tinted to see this color.")
          : result("The fill of the matching semantic nodes.", boxes.filter((_, i) => nodes[i].role === key));
    }
  }
  if (group === "typography") {
    switch (key) {
      case "fontFamily": return result("All text in the flowchart uses this font stack.", text);
      case "titleSize": return result("The Flowchart heading size.", title);
      case "bodySize": return result("Main node label size. Nodes grow if the text needs more space.", bodies);
      case "labelSize": return result("Subtitles, branch labels, the group heading and caption size.", secondaryText);
      case "normalWeight": return result("Subtitle, branch label, group heading and caption font weight.", secondaryText);
      case "boldWeight": return result("Heading and main node label font weight.", [...title, ...bodies]);
      case "lineHeight": return result("Space between node labels and subtitles; group and node layouts grow when needed.", [...bodies, ...subtitles, ...groupLabels]);
    }
  }
  if (group === "nodes") {
    switch (key) {
      case "radius": return result("Corners on rectangular nodes and the group boundary. Decision and terminal shapes keep their geometry.", [...nodeOutlines((n) => !n.shape), ...groupOutlines]);
      case "strokeWidth": return result("Outline thickness on nodes and the Validation group.", [...outlines, ...groupOutlines]);
      case "paddingX": case "paddingY": {
        const horizontal = key === "paddingX";
        return result(horizontal
          ? "Minimum space between text and the left / right boundaries. Diamonds expand to keep their text inside."
          : "Minimum space between text and the top / bottom boundaries. Diamonds expand to keep their text inside.", nodes.flatMap((n) => {
          const x = n.shape === "decision" ? n.x + n.w / 4 : n.x;
          const y = n.shape === "decision" ? n.y + n.h / 4 : n.y;
          const w = n.shape === "decision" ? n.w / 2 : n.w;
          const h = n.shape === "decision" ? n.h / 2 : n.h;
          return horizontal ? [
            { id: `${n.id}-left`, x, y, width: c.nodes.paddingX, height: h },
            { id: `${n.id}-right`, x: x + w - c.nodes.paddingX, y, width: c.nodes.paddingX, height: h },
          ] : [
            { id: `${n.id}-top`, x, y, width: w, height: c.nodes.paddingY },
            { id: `${n.id}-bottom`, x, y: y + h - c.nodes.paddingY, width: w, height: c.nodes.paddingY },
          ];
        }));
      }
      case "minWidth": return result("Minimum node width. Text, padding and decision geometry can make nodes wider.", outlines);
      case "minHeight": return result("Minimum node height. Text, padding and decision geometry can make nodes taller.", outlines);
      case "fillMode": return result("Solid, tinted or outline treatment inside every node.", boxes);
    }
  }
  if (group === "connectors") {
    switch (key) {
      case "arrowLength": return result("Length of each directional arrowhead, from its base to its tip.", arrows);
      case "arrowWidth": return result("Width across each directional arrowhead's base.", arrows);
      case "strokeWidth": return result("Thickness of flow lines and the supporting reference link.", edges);
      case "lineStyle": return result("Solid or dashed flow lines. The Policy reference link stays dashed.", mainEdges);
      case "routing": return result("Straight or orthogonal routes, especially the No branch into Review.", mainEdges);
    }
  }
  if (group === "layout") {
    const grid = (n: number) => c.layout.snapToGrid ? Math.ceil(n / 8) * 8 : n;
    const padding = grid(c.layout.canvasPadding);
    const spaces = scene.spaces.filter((space) => space.kind === key).map((space) => ({
      id: space.id, x: space.x, y: space.y, width: space.w, height: space.h,
    }));
    switch (key) {
      case "horizontalGap": return result("Space between neighboring columns and node boundaries.", spaces);
      case "verticalGap": return result("Space between the validation row and the review row.", spaces);
      case "groupPadding": return result("Inner margin around the Validation group and its heading.", spaces);
      case "canvasPadding": return result("Minimum margin around the entire workflow.", [
        { id: "margin-top", x: 2, y: 2, width: scene.width - 4, height: padding - 2 },
        { id: "margin-bottom", x: 2, y: scene.height - padding, width: scene.width - 4, height: padding - 2 },
        { id: "margin-left", x: 2, y: padding, width: padding - 2, height: scene.height - padding * 2 },
        { id: "margin-right", x: scene.width - padding, y: padding, width: padding - 2, height: scene.height - padding * 2 },
      ]);
      case "snapToGrid": return result("Node positions and computed dimensions align to an 8 px grid when enabled.", [...outlines, ...groupOutlines]);
    }
  }
  if (group === "effects") {
    if (key === "highlightOpacity") return result("Opacity of the Validation group background and, in Tinted mode, node fills.", [...groupBoxes, ...(c.nodes.fillMode === "tinted" ? boxes : [])]);
    if (key === "shadowOpacity" && !c.effects.shadowEnabled) return inactive("Shadows are off. Enable Node shadows to see their opacity change.");
    return result(key === "shadowEnabled" ? "Enable or remove the soft shadow around each node." : "Opacity of each node's shadow.", boxes.map((box) => ({
      ...box, path: undefined, area: false, x: box.x - 5, y: box.y - 2,
      width: box.width + 10, height: box.height + 10, outline: true,
    })));
  }
  return null;
}
