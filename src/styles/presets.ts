import { cloneConfig, validateConfig, type DiagramStyleConfig } from "./schema";
const academic: DiagramStyleConfig = {
  schemaVersion: 1,
  id: "academic",
  name: "Academic Minimal",
  basePresetId: "academic",
  colors: {
    background: "#ffffff",
    primary: "#4263eb",
    secondary: "#7786b1",
    accent: "#b78bda",
    text: "#233451",
    mutedText: "#56657e",
    border: "#cbd4e5",
    connector: "#6b80bf",
    input: "#eaf0ff",
    processing: "#edf1ff",
    output: "#e8f3f0",
    annotation: "#f5f3fc",
  },
  typography: {
    fontFamily: "Arial, Helvetica, sans-serif",
    titleSize: 20,
    bodySize: 14,
    labelSize: 11,
    normalWeight: 400,
    boldWeight: 600,
    lineHeight: 1.4,
  },
  nodes: {
    radius: 8,
    strokeWidth: 1,
    paddingX: 18,
    paddingY: 14,
    minWidth: 112,
    minHeight: 58,
    fillMode: "solid",
  },
  connectors: {
    strokeWidth: 1.5,
    lineStyle: "solid",
    arrowLength: 8,
    arrowWidth: 7,
    routing: "orthogonal",
  },
  layout: {
    horizontalGap: 52,
    verticalGap: 42,
    groupPadding: 24,
    canvasPadding: 32,
    snapToGrid: true,
  },
  effects: {
    shadowEnabled: false,
    shadowOpacity: 0.08,
    highlightOpacity: 0.18,
  },
};
function preset(
  id: DiagramStyleConfig["basePresetId"],
  name: string,
  change: Partial<DiagramStyleConfig>,
): DiagramStyleConfig {
  return validateConfig({
    ...cloneConfig(academic),
    id,
    name,
    basePresetId: id,
    ...change,
  });
}
export const presets: DiagramStyleConfig[] = [
  validateConfig(academic),
  preset("dark", "Dark Engineering", {
    colors: {
      background: "#15201f",
      primary: "#65d8c2",
      secondary: "#97aaa7",
      accent: "#ba9cf5",
      text: "#e6f2ef",
      mutedText: "#acbeba",
      border: "#49625b",
      connector: "#83b9ac",
      input: "#24403b",
      processing: "#293e3a",
      output: "#244a40",
      annotation: "#3a334f",
    },
    typography: {
      ...academic.typography,
      fontFamily: "Menlo, Consolas, monospace",
    },
    nodes: { ...academic.nodes, radius: 4 },
  }),
  preset("soft", "Modern Soft", {
    colors: {
      background: "#fffaff",
      primary: "#8060b8",
      secondary: "#9684ba",
      accent: "#cd739d",
      text: "#463d59",
      mutedText: "#6c5e79",
      border: "#d8cbe9",
      connector: "#9f86c1",
      input: "#f0e8fc",
      processing: "#f2ecfa",
      output: "#e5f2ee",
      annotation: "#fbeaf1",
    },
    nodes: { ...academic.nodes, radius: 18 },
    effects: {
      shadowEnabled: true,
      shadowOpacity: 0.09,
      highlightOpacity: 0.22,
    },
  }),
  preset("mono", "Publication Monochrome", {
    colors: {
      background: "#ffffff",
      primary: "#202020",
      secondary: "#5b5b5b",
      accent: "#3f3f3f",
      text: "#191919",
      mutedText: "#555555",
      border: "#696969",
      connector: "#303030",
      input: "#f5f5f5",
      processing: "#e9e9e9",
      output: "#dcdcdc",
      annotation: "#f5f5f5",
    },
    nodes: { ...academic.nodes, radius: 0, strokeWidth: 1.5 },
    connectors: { ...academic.connectors, strokeWidth: 1.5 },
  }),
];
export function loadPreset(id: string) {
  return cloneConfig(presets.find((p) => p.id === id) ?? presets[0]);
}
export function isModified(c: DiagramStyleConfig) {
  return JSON.stringify(c) !== JSON.stringify(loadPreset(c.basePresetId));
}
export const presetDescriptions = [
  "Restrained blue. Clear, academic hierarchy.",
  "Cyan on graphite. Made for engineering.",
  "Pastel fills. Rounded, easygoing geometry.",
  "High contrast. Ready for print.",
];
