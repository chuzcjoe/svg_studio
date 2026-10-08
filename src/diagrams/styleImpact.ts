import { colorLabels, controls } from "../styles/controls";
import type { ConfigGroup, DiagramStyleConfig } from "../styles/schema";
import { buildScene } from "./layout";

export type StyleTarget = { group: ConfigGroup; key: string };
export type ImpactRegion = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  outline?: boolean;
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
  }));
  const outlines = boxes.map((box) => ({ ...box, outline: true }));
  const textRegion = (id: string, x: number, y: number, text: string, size: number, centered = false): ImpactRegion => {
    const width = text.length * size * 0.67;
    return { id, textPart: id, x: centered ? x - width / 2 : x, y: y - size, width, height: size * 1.3 };
  };
  const title = scene.labels.filter((l) => l.title).map((l) => textRegion("title", l.x, l.y, l.text, c.typography.titleSize));
  const captions = scene.labels.filter((l) => !l.title).map((l) => textRegion("caption", l.x, l.y, l.text, c.typography.labelSize));
  const bodies = nodes.map((n) => textRegion(`${n.id}-label`, n.x + n.w / 2, n.y + n.h / 2, n.label, c.typography.bodySize, true));
  const subtitles = nodes.map((n) => textRegion(`${n.id}-subtitle`, n.x + n.w / 2, n.y + n.h / 2 + c.typography.labelSize, n.sub ?? "", c.typography.labelSize, true));
  const secondaryText = [...subtitles, ...captions];
  const text = [...title, ...bodies, ...secondaryText];
  const edges: ImpactRegion[] = scene.edges.map((e, i) => ({
    id: `edge-${i}`, x: 0, y: 0, width: 0, height: 0,
    path: e.points.map(([x, y], j) => `${j ? "L" : "M"}${x} ${y}`).join(" "),
  }));
  const arrows: ImpactRegion[] = scene.edges.map((e, i) => {
    const [x, y] = e.points[e.points.length - 1];
    return { id: `arrow-${i}`, x: x - c.connectors.arrowLength - 2, y: y - c.connectors.arrowWidth / 2 - 2, width: c.connectors.arrowLength + 4, height: c.connectors.arrowWidth + 4 };
  });
  const result = (description: string, regions: ImpactRegion[]): StyleImpact => ({ label, description, regions });
  const inactive = (description: string) => result(description, []);
  if (group === "colors") {
    switch (key) {
      case "background": return result("Canvas background and the base beneath node fills.", [{ id: "canvas", x: 3, y: 3, width: scene.width - 6, height: scene.height - 6, outline: true }]);
      case "primary": return result("The diagram title and the Process node outline.", [...title, { ...outlines[1] }]);
      case "text": return result("Main node labels; also the shadow color when shadows are enabled.", [...bodies, ...(c.effects.shadowEnabled ? outlines : [])]);
      case "mutedText": return result("Node subtitles and the explanatory caption.", secondaryText);
      case "border": return result("Input and Output node outlines.", [outlines[0], outlines[2]]);
      case "connector": return result("Connecting lines and their arrowheads.", [...edges, ...arrows]);
      case "input": case "processing": case "output":
        return c.nodes.fillMode === "outline"
          ? inactive("Node fills are hidden in Outline mode. Choose Solid or Tinted to see this color.")
          : result("The fill of the matching semantic node.", boxes.filter((_, i) => nodes[i].role === key));
      default: return inactive("This color is saved in your rules but is not used in this flowchart preview.");
    }
  }
  if (group === "typography") {
    switch (key) {
      case "fontFamily": return result("All text in the flowchart uses this font stack.", text);
      case "titleSize": return result("The Flowchart heading size.", title);
      case "bodySize": return result("Main node label size. Nodes grow if the text needs more space.", bodies);
      case "labelSize": return result("Subtitle and caption size. Nodes grow to keep subtitles readable.", secondaryText);
      case "normalWeight": return result("Subtitle and caption font weight.", secondaryText);
      case "boldWeight": return result("Heading and main node label font weight.", [...title, ...bodies]);
      case "lineHeight": return result("Spacing between each node label and subtitle; the layout grows when needed.", [...bodies, ...subtitles]);
    }
  }
  if (group === "nodes") {
    switch (key) {
      case "radius": return result("Rounded corners on every node.", nodes.map((n) => {
        const radius = Math.min(c.nodes.radius, n.h / 2);
        const reach = Math.max(radius, 6);
        return { id: n.id, x: 0, y: 0, width: 0, height: 0, path: `M${n.x} ${n.y + reach} V${n.y + radius} Q${n.x} ${n.y} ${n.x + radius} ${n.y} H${n.x + reach}` };
      }));
      case "strokeWidth": return result("Outline thickness on all three nodes.", outlines);
      case "paddingX": return result("Minimum space between the text and the left / right node boundaries.", nodes.flatMap((n) => [
        { id: `${n.id}-left`, x: n.x, y: n.y, width: c.nodes.paddingX, height: n.h },
        { id: `${n.id}-right`, x: n.x + n.w - c.nodes.paddingX, y: n.y, width: c.nodes.paddingX, height: n.h },
      ]));
      case "paddingY": return result("Minimum space between the text and the top / bottom node boundaries.", nodes.flatMap((n) => [
        { id: `${n.id}-top`, x: n.x, y: n.y, width: n.w, height: c.nodes.paddingY },
        { id: `${n.id}-bottom`, x: n.x, y: n.y + n.h - c.nodes.paddingY, width: n.w, height: c.nodes.paddingY },
      ]));
      case "minWidth": return result("Minimum node width. Text and padding can make a node wider.", outlines);
      case "minHeight": return result("Minimum node height. Text and padding can make a node taller.", outlines);
      case "fillMode": return result("Solid, tinted or outline treatment inside every node.", boxes);
    }
  }
  if (group === "connectors") {
    switch (key) {
      case "arrowLength": return result("Length of each arrowhead, from its base to its tip.", arrows);
      case "arrowWidth": return result("Width across each arrowhead's base.", arrows);
      case "strokeWidth": return result("Thickness of the connecting lines.", edges);
      case "lineStyle": return result("Solid or dashed connecting lines.", edges);
      case "routing": return result("Connector paths. Aligned nodes keep both Straight and Orthogonal routes straight.", edges);
    }
  }
  if (group === "layout") {
    const bottom = Math.max(...nodes.map((n) => n.y + n.h));
    const caption = scene.labels.find((l) => !l.title)!;
    const grid = (n: number) => c.layout.snapToGrid ? Math.ceil(n / 8) * 8 : n;
    const padding = grid(c.layout.canvasPadding);
    switch (key) {
      case "horizontalGap": return result("Empty space between neighboring node boundaries.", nodes.slice(0, -1).map((n, i) => ({ id: `gap-${i}`, x: n.x + n.w, y: n.y, width: nodes[i + 1].x - n.x - n.w, height: n.h })));
      case "verticalGap": return result("Space from the bottom of the nodes to the caption baseline.", [{ id: "vertical-gap", x: nodes[0].x, y: bottom, width: nodes[nodes.length - 1].x + nodes[nodes.length - 1].w - nodes[0].x, height: caption.y - bottom }]);
      case "groupPadding": return result("This preview uses group padding to separate the heading from the node row.", [{ id: "group-gap", x: nodes[0].x, y: nodes[0].y - grid(c.layout.groupPadding), width: nodes[nodes.length - 1].x + nodes[nodes.length - 1].w - nodes[0].x, height: grid(c.layout.groupPadding) }]);
      case "canvasPadding": return result("Minimum margin around the diagram. Text can leave additional space on the right.", [
        { id: "margin-top", x: 2, y: 2, width: scene.width - 4, height: padding - 2 },
        { id: "margin-bottom", x: 2, y: scene.height - padding, width: scene.width - 4, height: padding - 2 },
        { id: "margin-left", x: 2, y: padding, width: padding - 2, height: scene.height - padding * 2 },
        { id: "margin-right", x: scene.width - padding, y: padding, width: padding - 2, height: scene.height - padding * 2 },
      ]);
      case "snapToGrid": return result("Node positions and computed dimensions align to an 8 px grid when enabled.", outlines);
    }
  }
  if (group === "effects") {
    if (key === "highlightOpacity") return c.nodes.fillMode === "tinted"
      ? result("Opacity of the tinted semantic fills inside nodes.", boxes)
      : inactive("This preview uses highlight opacity in Tinted fill mode. Choose Tinted in Nodes to see it.");
    if (key === "shadowOpacity" && !c.effects.shadowEnabled) return inactive("Shadows are off. Enable Node shadows to see their opacity change.");
    return result(key === "shadowEnabled" ? "Enable or remove the soft shadow around each node." : "Opacity of each node's shadow.", boxes.map((box) => ({ ...box, x: box.x - 5, y: box.y - 2, width: box.width + 10, height: box.height + 10, outline: true })));
  }
  return null;
}
