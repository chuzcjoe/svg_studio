import type { DiagramStyleConfig, ConfigGroup } from "../styles/schema";
import { controls, colorLabels } from "../styles/controls";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Diagram } from "../diagrams/Diagram";
const md = (text: string) => text.replace(/[|\r\n]/g, " ").replace(/`/g, "\\`");
export function exampleSVG(c: DiagramStyleConfig): string {
  return renderToStaticMarkup(createElement(Diagram, {
    config: c, type: "Flowchart", id: "example-flowchart",
  })).replace(/>(?=<(?:g|rect|path|defs|filter|marker|text|title|desc|\/svg|\/g|\/defs)\b)/g, ">\n");
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
Node width and height are minima. Expand nodes for text, padding, and line height. Solid fills use their semantic role color; tinted fills composite that semantic role color over background with highlightOpacity; outline uses background fill. Use primary for focal processing-node strokes, accent for decision outlines, and border for other node strokes. Radius must not exceed half the shape's height. Use diamond geometry for decisions and capsule geometry for end nodes; corner radius applies to rectangular nodes and group boundaries.

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
| Decision outlines | accent |
| Node labels | text |
| Subtitles and annotations | mutedText |
| General shape outlines and group boundaries | border |
| Directed flow edges / arrowheads | connector |
| Canvas and outline-mode fills | background |
Always pair semantic colors with explicit labels, shapes or line conventions. Never rely on color alone.

## Flowchart Conventions
Render clearly labeled inputs, processing steps, and outputs with attached arrows and consistent boundary-to-boundary spacing. Use semantic node colors and diamond-shaped decisions. The complete reference below uses the same workflow as every live preset. Adapt its content to the requested workflow while preserving the applicable constraints.

### Structural Constraints Demonstrated
- **Hierarchy:** Delivery Pipeline contains Validation & Recovery and Parallel Processing. Render parent groups before children. Keep child groups within parent padding, reserve a header band for each group, and keep nodes, connectors and branch labels out of header text.
- **Validation:** Source → Prepare → Valid? has two explicit outcomes. Yes advances to Dispatch; No enters Retry?. Diamonds have enough interior room for their labels and padding. Use accent for decision outlines.
- **Bounded recovery:** Source initializes attempt=1. Retry? routes attempts below 3 to Review, which fixes fields, increments the attempt count, and returns to Prepare. At the limit, route to Failed. Do not draw an unbounded retry loop or merge the limit outcome with success.
- **Parallel fork:** Dispatch starts BOTH Enrich and Audit. These are concurrent tasks, not mutually exclusive Yes / No outcomes. Give the branches balanced spacing and distinct arrows.
- **Synchronization:** Join waits for BOTH tasks to complete before Publish. Preserve this all-of dependency; an incoming path does not alone imply permission to continue. Label the synchronization explicitly.
- **Outcome distinction:** Publish → Sent? ends at Done on Yes and Failed on No. Retry exhaustion also ends at Failed. Start and end nodes use capsule geometry; normal operations use rectangles. Success and failure remain distinguishable through labels even with identical output colors.
- **Annotation:** Policy states the retry limit and connects to Prepare through a dashed secondary-color reference link without an arrowhead. It is explanatory information, not an executable step or additional control-flow branch.
- **Long failure route:** The retry-limit path uses a separate gutter around unrelated nodes and connects to the Failed boundary. A detour is allowed even when preferred routing is straight. Shared fork/join segments represent intentional shared control flow; incidental edge intersections must not imply junctions.
- **Visual roles:** Prepare is the focal primary outline; decisions use accent; other shapes and group boundaries use border. Notes and group backgrounds use annotation, with highlightOpacity on groups. All typography and spacing follow the tokens above.
- **Growth:** Recompute node dimensions, row heights, column widths, group bounds and route gutters when tokens change. Preserve minimum gaps and padding; expand the canvas instead of compressing text or allowing collisions.

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

## Complete Reference SVG
This is the full shared preview rendered with the current tokens, including nested groups, bounded recovery, parallel dependencies and both terminal outcomes. Use it together with the structural constraints above; its workflow is illustrative rather than mandatory.

\`\`\`svg
${exampleSVG(c)}
\`\`\`
`;
}
