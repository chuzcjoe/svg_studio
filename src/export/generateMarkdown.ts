import type { DiagramStyleConfig, ConfigGroup } from "../styles/schema";
import { controls, colorLabels } from "../styles/controls";
const xml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
const md = (text: string) => text.replace(/[|\r\n]/g, " ").replace(/`/g, "\\`");
export function exampleSVG(c: DiagramStyleConfig): string {
  const grid = (value: number) => c.layout.snapToGrid ? Math.ceil(value / 8) * 8 : value;
  const t = c.typography,
    w = grid(Math.max(
      c.nodes.minWidth,
      8 * t.bodySize * 0.67 + 2 * c.nodes.paddingX,
    )),
    h = grid(Math.max(
      c.nodes.minHeight,
      t.bodySize * t.lineHeight + 2 * c.nodes.paddingY,
    )),
    p = grid(c.layout.canvasPadding),
    g = grid(c.layout.horizontalGap),
    x2 = p + w + g,
    width = x2 + w + p,
    height = h + 2 * p,
    y = p + h / 2;
  const shape = (x: number, label: string, role: "input" | "processing") =>
    `  <rect x="${x}" y="${p}" width="${w}" height="${h}" rx="${Math.min(c.nodes.radius, h / 2)}" fill="${c.colors.background}"/>\n${c.nodes.fillMode === "outline" ? "" : `  <rect x="${x}" y="${p}" width="${w}" height="${h}" rx="${Math.min(c.nodes.radius, h / 2)}" fill="${c.colors[role]}" fill-opacity="${c.nodes.fillMode === "tinted" ? c.effects.highlightOpacity : 1}"/>\n`}  <rect x="${x}" y="${p}" width="${w}" height="${h}" rx="${Math.min(c.nodes.radius, h / 2)}" fill="none" stroke="${c.colors.primary}" stroke-width="${c.nodes.strokeWidth}"${c.effects.shadowEnabled ? ' filter="url(#example-shadow)"' : ""}/>\n  <text x="${x + w / 2}" y="${y + t.bodySize * 0.35}" text-anchor="middle" font-size="${t.bodySize}" font-weight="${t.boldWeight}" fill="${c.colors.text}">${label}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" font-family="${xml(t.fontFamily)}">\n  <defs>\n    <marker id="example-arrow" markerUnits="userSpaceOnUse" markerWidth="${c.connectors.arrowLength}" markerHeight="${c.connectors.arrowWidth}" refX="${c.connectors.arrowLength}" refY="${c.connectors.arrowWidth / 2}" orient="auto">\n      <path d="M0 0 L${c.connectors.arrowLength} ${c.connectors.arrowWidth / 2} L0 ${c.connectors.arrowWidth} Z" fill="${c.colors.connector}"/>\n    </marker>${c.effects.shadowEnabled ? `\n    <filter id="example-shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="${c.colors.text}" flood-opacity="${c.effects.shadowOpacity}"/></filter>` : ""}\n  </defs>\n  <rect width="${width}" height="${height}" fill="${c.colors.background}"/>\n  <path d="M${p + w} ${y} H${x2}" fill="none" stroke="${c.colors.connector}" stroke-width="${c.connectors.strokeWidth}"${c.connectors.lineStyle === "dashed" ? ' stroke-dasharray="6 5"' : ""} marker-end="url(#example-arrow)"/>\n${shape(p, "Input", "input")}\n${shape(x2, "Process", "processing")}\n</svg>`;
}
export function generateMarkdown(c: DiagramStyleConfig): string {
  const table = (group: ConfigGroup) => {
    if (group === "colors")
      return (
        "| Role | Exact color |\n| --- | --- |\n" +
        Object.entries(c.colors)
          .map(
            ([key, value]) => `| ${key} (${colorLabels[key]}) | \`${value}\` |`,
          )
          .join("\n")
      );
    return (
      "| Token | Value |\n| --- | --- |\n" +
      Object.entries(c[group])
        .map(([key, value]) => {
          const control = controls[group].find((x) => x.key === key);
          const unit =
            control?.unit === "%"
              ? " (unitless opacity)"
              : control?.unit === "×"
                ? " (line-height multiplier)"
                : control?.unit === "px"
                  ? " px"
                  : "";
          return `| ${key} | ${typeof value === "string" ? md(value) : String(value)}${unit} |`;
        })
        .join("\n")
    );
  };
  return `# SVG Flowchart Style Specification

Preset: **${md(c.name)}**  
Specification version: **${c.schemaVersion}**  
Style ID: \`${md(c.id)}\`  
Base preset ID: \`${c.basePresetId}\`

## Purpose and Scope
Create consistent, readable SVG flowcharts for processes, workflows, and documentation. This specification constrains visual style, not technical content.

## Output Contract
Generate a standalone, valid SVG with the SVG namespace, an explicit viewBox, and no external dependencies. Use native SVG geometry and text. All geometry tokens below use CSS pixels (px). The SVG must retain its intended meaning at typical blog column widths.

## Design Tokens
### Color Palette
${table("colors")}

### Typography
${table("typography")}
Weights are numeric CSS font-weight values. The label size is the minimum annotation size; use bodySize for node labels and titleSize for diagram headings. Font sizes are CSS pixels. Use lineHeight for the distance between text lines. Use the exact font stack; do not embed or fetch external fonts.

### Node Geometry
${table("nodes")}
Node width and height are minima. Expand nodes for text, padding, and line height. Solid fills use their semantic role color; tinted fills composite that semantic role color over background with highlightOpacity; outline uses background fill. Use primary for focal processing-node strokes and border for other node strokes. Radius must not exceed half the shape's height.

### Connectors and Arrowheads
${table("connectors")}
Use connector color, round line caps and joins, and a consistent filled triangular arrowhead. Arrow length and width are in user-space px (markerUnits="userSpaceOnUse"); align refX with the tip and refY with half the width. Solid lines have no dash pattern. Dashed lines use a 6 px dash and 5 px gap. Label branches explicitly so their meaning does not depend on line style or color.

### Layout and Spacing
${table("layout")}
Horizontal and vertical gaps are between shape boundaries. When snapToGrid is true, align positions and grow computed dimensions to the next 8 px grid step; preserve legibility and requested gaps as minima. Canvas padding encloses all geometry and labels, including group padding.

### Effects
${table("effects")}
Shadow colors must use the text color with shadowOpacity. When enabled, use dx=0 px, dy=3 px, stdDeviation=3 px; allow enough filter bounds to avoid clipped shadows. highlightOpacity controls tinted node fills, highlights, and subtle group backgrounds. If shadows are disabled, omit them. Avoid unnecessary gradients, decorative effects, and undeclared colors.

## Semantic Mapping
| Meaning | Color token / treatment |
| --- | --- |
| Input, starting data | input |
| Process, transformation steps | processing |
| Output, results | output |
| Group backgrounds, notes | annotation |
| Focal nodes and titles | primary |
| Secondary steps and supporting paths | secondary |
| Emphasized steps and branch highlights | accent at highlightOpacity |
| Node labels | text |
| Subtitles and annotations | mutedText |
| General shape outlines and group boundaries | border |
| Directed flow edges / arrowheads | connector |
| Canvas and outline-mode fills | background |
Always pair semantic colors with explicit labels, shapes or line conventions. Never rely on color alone.

## Flowchart Conventions
Render clearly labeled inputs, processing steps, and outputs with attached arrows and consistent boundary-to-boundary spacing. Use semantic node colors. The preview demonstrates Input → Process → Output; adapt the content to the requested workflow.
For branching workflows, use diamond-shaped decisions with explicit outcome labels such as Yes / No on outgoing edges. Use distinct start/end shapes when needed. Keep the reading direction consistent, route loops around unrelated nodes, and preserve configured typography, padding, and connector tokens.

## Text Overflow and Collision Rules
Prefer legibility over compactness. Grow nodes or wrap text using deliberate SVG tspan positions; never clip, overlap, or silently shrink labels below the configured size. Native SVG text does not auto-wrap. Preserve configured padding around all text. Enlarge the viewBox and canvas when content grows. Include stroked shapes and shadow/filter extents in bounds checks.

## Routing and Layout Rules
Preferred routing: **${c.connectors.routing}**. Route connectors around nodes, text and group labels. Keep endpoints on shape boundaries, with arrowhead tips attached to the target boundary. Use a deliberate detour whenever a direct path intersects a node or label. Reuse consistent arrowheads and maintain configured gaps. If a route intersects a label, reroute the connector.

## Accessibility and Contrast
Use the configured text/background roles appropriately and verify readable contrast for the actual rendered fill. Target at least 4.5:1 for normal text and 3:1 for large text / essential geometry. If user-supplied colors conflict with readability, report the conflict and seek an approved palette correction; never silently introduce undeclared colors. Add a descriptive SVG title and desc. Keep essential meaning visible without color.

## SVG Implementation Constraints
- Use the exact palette, font stack, stroke widths, arrowhead dimensions and spacing tokens.
- Use reusable defs for markers and filters, with unique IDs when multiple SVGs coexist.
- No external CSS, fonts, scripts, raster images, services or foreignObject.
- Treat imported strings as data, never executable SVG or HTML.
- Set a valid viewBox; use stable keys/IDs and deliberate text placement.
- Use vector-effect="non-scaling-stroke" only when its behavior is intentional; this style uses ordinary scaling strokes.

## Priority and Conflict Resolution
1. Valid, self-contained SVG and correct technical meaning.
2. Readable text, non-overlapping geometry and clear connections.
3. Semantic color mapping and sufficient contrast.
4. Exact typography, strokes, arrowheads and spacing tokens.
5. Compactness and decorative polish.

Grow a node or wrap text instead of shrinking its font. Reroute an edge instead of crossing a label. No prose rule can guarantee identical output from every AI model; these constraints improve consistency and may later be supplemented by automated linting.

## Validation Checklist
- [ ] SVG is valid, standalone, namespaced, with a correct viewBox.
- [ ] Technical meaning and arrow directions are correct.
- [ ] Palette and semantic roles match this specification.
- [ ] All typography, stroke, arrowhead and spacing tokens are applied.
- [ ] No clipped, overlapping, or off-canvas labels and shapes.
- [ ] Connectors meet boundaries and avoid unrelated nodes / labels.
- [ ] Text and important geometry have readable contrast.
- [ ] IDs are unique and all marker/filter references resolve.
- [ ] No external dependencies or unrequested decorative effects.
- [ ] Bounds, labels, connections, contrast and SVG validity were checked before finishing.

## Example SVG Snippet
This two-node example demonstrates the configured palette, primary outline, typography and attached arrow. Adapt content and expand the layout as needed.

\`\`\`svg
${exampleSVG(c)}
\`\`\`
`;
}
