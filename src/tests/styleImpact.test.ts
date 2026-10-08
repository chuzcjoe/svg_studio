import { describe, expect, it } from "vitest";
import { getStyleImpact } from "../diagrams/styleImpact";
import { controls } from "../styles/controls";
import { loadPreset, presets } from "../styles/presets";
import { buildScene } from "../diagrams/layout";
import type { ConfigGroup } from "../styles/schema";

const c = loadPreset("academic");
describe("flowchart style inspection", () => {
  it.each(presets)("describes every setting in $name without invalid regions", (config) => {
    for (const group of Object.keys(config).filter((key) => key in controls || key === "colors") as ConfigGroup[]) {
      for (const key of Object.keys(config[group])) {
        const impact = getStyleImpact(config, { group, key });
        expect(impact?.label, `${group}.${key}`).toBeTruthy();
        expect(impact?.description, `${group}.${key}`).toBeTruthy();
        for (const region of impact!.regions) {
          expect(Number.isFinite(region.x + region.y)).toBe(true);
          expect(region.width).toBeGreaterThanOrEqual(0);
          expect(region.height).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
  it("maps colors to semantic nodes, title, outlines and arrows", () => {
    expect(getStyleImpact(c, { group: "colors", key: "input" })?.regions.map((r) => r.id)).toEqual(["input"]);
    expect(getStyleImpact(c, { group: "colors", key: "primary" })?.regions.map((r) => r.id)).toEqual(["title", "process"]);
    expect(getStyleImpact(c, { group: "colors", key: "border" })?.regions.map((r) => r.id)).toEqual(["input", "output", "review", "done", "note", "group-0"]);
    expect(getStyleImpact(c, { group: "connectors", key: "arrowWidth" })?.regions.map((r) => r.id)).toEqual(["arrow-0", "arrow-1", "arrow-2", "arrow-3", "arrow-4", "arrow-5"]);
  });
  it("distinguishes text sizes and shows the actual space between node boundaries", () => {
    expect(getStyleImpact(c, { group: "typography", key: "titleSize" })?.regions.map((r) => r.textPart)).toEqual(["title"]);
    expect(getStyleImpact(c, { group: "typography", key: "bodySize" })?.regions.map((r) => r.textPart)).toEqual(["input-label", "process-label", "decision-label", "output-label", "review-label", "done-label", "note-label"]);
    const scene = buildScene(c, "Flowchart");
    const gaps = getStyleImpact(c, { group: "layout", key: "horizontalGap" })!.regions;
    expect(gaps[0].x).toBe(scene.nodes[0].x + scene.nodes[0].w);
    expect(gaps[0].x + gaps[0].width).toBe(scene.nodes[1].x);
  });
  it("covers additional color roles and explains disabled effects", () => {
    expect(getStyleImpact(c, { group: "colors", key: "secondary" })?.regions.map((r) => r.id)).toEqual(["edge-6"]);
    expect(getStyleImpact(c, { group: "colors", key: "accent" })?.regions.map((r) => r.id)).toEqual(["decision"]);
    expect(getStyleImpact(c, { group: "colors", key: "annotation" })?.regions.map((r) => r.id)).toEqual(["group-0", "note"]);
    const config = structuredClone(c);
    config.nodes.fillMode = "outline";
    expect(getStyleImpact(config, { group: "colors", key: "input" })?.description).toContain("Outline");
    expect(getStyleImpact(config, { group: "colors", key: "input" })?.regions).toEqual([]);
    config.effects.shadowEnabled = false;
    expect(getStyleImpact(config, { group: "effects", key: "shadowOpacity" })?.regions).toEqual([]);
    config.effects.shadowEnabled = true;
    expect(getStyleImpact(config, { group: "effects", key: "shadowOpacity" })?.regions).toHaveLength(7);
    expect(getStyleImpact(config, { group: "effects", key: "highlightOpacity" })?.regions).toHaveLength(1);
    config.nodes.fillMode = "tinted";
    expect(getStyleImpact(config, { group: "effects", key: "highlightOpacity" })?.regions).toHaveLength(8);
  });
});

it("gives every color a visible target and always demonstrates group highlight opacity", () => {
  const config = loadPreset("academic");
  for (const key of Object.keys(config.colors))
    expect(getStyleImpact(config, { group: "colors", key })?.regions.length, key).toBeGreaterThan(0);
  for (const fillMode of ["solid", "tinted", "outline"] as const) {
    config.nodes.fillMode = fillMode;
    expect(getStyleImpact(config, { group: "effects", key: "highlightOpacity" })?.regions.map((r) => r.id)).toContain("group-0");
  }
});
