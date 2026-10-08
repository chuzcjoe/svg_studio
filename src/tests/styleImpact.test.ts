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
    expect(getStyleImpact(c, { group: "colors", key: "border" })?.regions.map((r) => r.id)).toEqual(["input", "output"]);
    expect(getStyleImpact(c, { group: "connectors", key: "arrowWidth" })?.regions.map((r) => r.id)).toEqual(["arrow-0", "arrow-1"]);
  });
  it("distinguishes text sizes and shows the actual space between node boundaries", () => {
    expect(getStyleImpact(c, { group: "typography", key: "titleSize" })?.regions.map((r) => r.textPart)).toEqual(["title"]);
    expect(getStyleImpact(c, { group: "typography", key: "bodySize" })?.regions.map((r) => r.textPart)).toEqual(["input-label", "process-label", "output-label"]);
    const scene = buildScene(c, "Flowchart");
    const gaps = getStyleImpact(c, { group: "layout", key: "horizontalGap" })!.regions;
    expect(gaps[0].x).toBe(scene.nodes[0].x + scene.nodes[0].w);
    expect(gaps[0].x + gaps[0].width).toBe(scene.nodes[1].x);
  });
  it("explains unused colors and disabled effects without highlighting unrelated shapes", () => {
    for (const key of ["secondary", "accent", "annotation"])
      expect(getStyleImpact(c, { group: "colors", key })?.regions).toEqual([]);
    const config = structuredClone(c);
    config.nodes.fillMode = "outline";
    expect(getStyleImpact(config, { group: "colors", key: "input" })?.description).toContain("Outline");
    expect(getStyleImpact(config, { group: "colors", key: "input" })?.regions).toEqual([]);
    config.effects.shadowEnabled = false;
    expect(getStyleImpact(config, { group: "effects", key: "shadowOpacity" })?.regions).toEqual([]);
    config.effects.shadowEnabled = true;
    expect(getStyleImpact(config, { group: "effects", key: "shadowOpacity" })?.regions).toHaveLength(3);
    expect(getStyleImpact(config, { group: "effects", key: "highlightOpacity" })?.regions).toEqual([]);
    config.nodes.fillMode = "tinted";
    expect(getStyleImpact(config, { group: "effects", key: "highlightOpacity" })?.regions).toHaveLength(3);
  });
});
