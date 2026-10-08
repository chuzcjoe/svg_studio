import { describe, it, expect } from "vitest";
import { generateMarkdown, exampleSVG } from "../export/generateMarkdown";
import { presets, loadPreset } from "../styles/presets";
import { contrastIssues } from "../styles/contrast";
describe("Markdown export", () => {
  it.each(presets)("exports every active parameter for $name", (c) => {
    const result = generateMarkdown(c);
    for (const group of [
      "colors",
      "typography",
      "nodes",
      "connectors",
      "layout",
      "effects",
    ] as const)
      for (const [key, value] of Object.entries(c[group])) {
        expect(result).toContain(`| ${key}`);
        expect(result).toContain(String(value));
      }
    expect(result).toContain(c.name);
    expect(result).toContain(c.basePresetId);
    expect(result).toContain("Specification version: **1**");
  });
  it("is deterministic and reacts to token changes", () => {
    const c = loadPreset("academic");
    expect(generateMarkdown(c)).toBe(generateMarkdown(structuredClone(c)));
    c.colors.primary = "#124abc";
    c.connectors.arrowLength = 15;
    const md = generateMarkdown(c);
    expect(md).toContain("#124abc");
    expect(md).toContain('markerWidth="15"');
    expect(md).toContain("non-overlapping geometry");
    expect(md).toContain("No prose rule can guarantee identical output");
  });
  it("exports flowchart conventions, constraints and conflict priorities", () => {
    const md = generateMarkdown(loadPreset("academic"));
    for (const title of [
      "Flowchart Conventions",
      "Validation Checklist",
      "Priority and Conflict Resolution",
    ])
      expect(md).toContain(title);
    for (const title of [
      "Neural Networks",
      "Matrices and Tensors",
      "ML / Attention Architecture",
      "System Architecture",
      "Sequence Diagrams",
    ])
      expect(md).not.toContain(title);
    expect(md).toContain("diamond-shaped decisions");
    expect(md).toContain("Grow a node or wrap text");
    expect(md).toContain("no external dependencies");
  });
  it.each(presets)("generates a standalone XML sample for $name", (c) => {
    const doc = new DOMParser().parseFromString(exampleSVG(c), "image/svg+xml");
    expect(doc.querySelector("parsererror")).toBeNull();
    expect(doc.documentElement.getAttribute("viewBox")).toBeTruthy();
    expect(doc.querySelector("marker")?.getAttribute("markerWidth")).toBe(
      String(c.connectors.arrowLength),
    );
    expect(doc.querySelector("svg")?.getAttribute("font-family")).toBe(
      c.typography.fontFamily,
    );
    expect(doc.querySelector("script,foreignObject,image")).toBeNull();
  });
  it.each(presets)("maintains readable default text in $name", (c) =>
    expect(contrastIssues(c)).toEqual([]),
  );
});
