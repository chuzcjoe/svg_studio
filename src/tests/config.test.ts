import { describe, it, expect } from "vitest";
import { configSchema, parseConfigJSON } from "../styles/schema";
import { presets, loadPreset, isModified } from "../styles/presets";
import { readStoredConfig, STORAGE_KEY } from "../hooks/useStyleConfig";
describe("configuration", () => {
  it.each(presets)(
    "$name is valid and round-trips without data loss",
    (preset) => expect(parseConfigJSON(JSON.stringify(preset))).toEqual(preset),
  );
  it("loads independent clones and detects changed values", () => {
    const a = loadPreset("academic"),
      b = loadPreset("academic");
    a.nodes.radius = 25;
    expect(b.nodes.radius).toBe(8);
    expect(isModified(a)).toBe(true);
    expect(isModified(b)).toBe(false);
  });
  it.each(["not json", '{"schemaVersion":2}', '{"schemaVersion":1}'])(
    "rejects incomplete / unsupported JSON: %s",
    (text) => expect(() => parseConfigJSON(text)).toThrow(),
  );
  it.each([
    ["colors", "primary", "#xyzxyz"],
    ["nodes", "radius", 33],
    ["nodes", "minWidth", 0],
    ["typography", "bodySize", 9],
    ["connectors", "arrowWidth", Infinity],
    ["effects", "shadowEnabled", "true"],
    ["layout", "canvasPadding", -1],
    ["typography", "fontFamily", "<script>alert(1)</script>"],
  ])("rejects invalid %s.%s", (group, key, value) => {
    const c = loadPreset("academic");
    (c[group as keyof typeof c] as unknown as Record<string, unknown>)[
      key as string
    ] = value;
    expect(configSchema.safeParse(c).success).toBe(false);
  });
  it("rejects unknown keys and unsafe labels", () => {
    expect(
      configSchema.safeParse({ ...loadPreset("academic"), __extra: "x" })
        .success,
    ).toBe(false);
    expect(
      configSchema.safeParse({
        ...loadPreset("academic"),
        name: '<img onerror="alert(1)">',
      }).success,
    ).toBe(false);
  });
  it("restores persisted modifications and recovers from corrupt storage", () => {
    const c = loadPreset("soft");
    c.nodes.radius = 22;
    const result = readStoredConfig({
      getItem: (key) => (key === STORAGE_KEY ? JSON.stringify(c) : null),
    });
    expect(result.config).toEqual(c);
    expect(result.restored).toBe(true);
    const bad = readStoredConfig({ getItem: () => "{broken" });
    expect(bad.config).toEqual(loadPreset("academic"));
    expect(bad.warning).not.toBe("");
  });
  it("handles unavailable storage", () => {
    expect(
      readStoredConfig({
        getItem: () => {
          throw Error("blocked");
        },
      }).warning,
    ).not.toBe("");
  });
});
