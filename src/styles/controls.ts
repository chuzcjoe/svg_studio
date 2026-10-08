import type { ConfigGroup } from "./schema";
export type Control = {
  key: string;
  label: string;
  kind: "range" | "select" | "toggle" | "font";
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: { value: string | number; label: string }[];
  help?: string;
};
const range = (
  key: string,
  label: string,
  min: number,
  max: number,
  step = 1,
  unit = "px",
): Control => ({ key, label, kind: "range", min, max, step, unit });
const select = (key: string, label: string, values: string[]): Control => ({
  key,
  label,
  kind: "select",
  options: values.map((value) => ({
    value,
    label: value[0].toUpperCase() + value.slice(1),
  })),
});
export const colorLabels: Record<string, string> = {
  background: "Background",
  primary: "Primary",
  secondary: "Secondary",
  accent: "Accent",
  text: "Text",
  mutedText: "Muted text",
  border: "Border",
  connector: "Connector",
  input: "Input node",
  processing: "Processing node",
  output: "Output node",
  annotation: "Annotation",
};
export const groupLabels: Record<ConfigGroup, string> = {
  colors: "Colors",
  typography: "Typography",
  nodes: "Nodes",
  connectors: "Connectors",
  layout: "Layout",
  effects: "Effects",
};
export const controls: Record<Exclude<ConfigGroup, "colors">, Control[]> = {
  typography: [
    { key: "fontFamily", label: "Font stack", kind: "font" },
    range("titleSize", "Title size", 16, 36),
    range("bodySize", "Body size", 10, 24),
    range("labelSize", "Label size", 8, 18),
    {
      key: "normalWeight",
      label: "Normal weight",
      kind: "select",
      options: [300, 400, 500, 600].map((value) => ({
        value,
        label: String(value),
      })),
    },
    {
      key: "boldWeight",
      label: "Semibold weight",
      kind: "select",
      options: [500, 600, 700, 800].map((value) => ({
        value,
        label: String(value),
      })),
    },
    range("lineHeight", "Line height", 1, 1.8, 0.05, "×"),
  ],
  nodes: [
    range("radius", "Corner radius", 0, 32),
    range("strokeWidth", "Stroke width", 0.5, 4, 0.25),
    range("paddingX", "Horizontal padding", 8, 32),
    range("paddingY", "Vertical padding", 8, 24),
    range("minWidth", "Minimum width", 80, 200),
    range("minHeight", "Minimum height", 36, 100),
    select("fillMode", "Fill mode", ["solid", "tinted", "outline"]),
  ],
  connectors: [
    range("strokeWidth", "Stroke width", 0.5, 4, 0.25),
    select("lineStyle", "Line style", ["solid", "dashed"]),
    range("arrowLength", "Arrowhead length", 4, 20),
    range("arrowWidth", "Arrowhead width", 4, 16),
    select("routing", "Routing", ["straight", "orthogonal"]),
  ],
  layout: [
    range("horizontalGap", "Horizontal gap", 24, 100),
    range("verticalGap", "Vertical gap", 24, 100),
    range("groupPadding", "Group padding", 12, 48),
    range("canvasPadding", "Canvas padding", 16, 80),
    { key: "snapToGrid", label: "Align to 8 px grid", kind: "toggle" },
  ],
  effects: [
    { key: "shadowEnabled", label: "Node shadows", kind: "toggle" },
    range("shadowOpacity", "Shadow opacity", 0, 0.3, 0.01, "%"),
    range("highlightOpacity", "Highlight opacity", 0.05, 0.5, 0.01, "%"),
  ],
};
