import { z } from "zod";
const color = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color, e.g. #4263EB.")
  .transform((v) => v.toLowerCase());
const num = (min: number, max: number) => z.number().finite().min(min).max(max);
const identifier = z.enum(["academic", "dark", "soft", "mono"]);
export const configSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-zA-Z0-9_-]+$/),
    name: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[^\x00-\x1f<>]+$/),
    basePresetId: identifier,
    colors: z
      .object({
        background: color,
        primary: color,
        secondary: color,
        accent: color,
        text: color,
        mutedText: color,
        border: color,
        connector: color,
        input: color,
        processing: color,
        output: color,
        annotation: color,
      })
      .strict(),
    typography: z
      .object({
        fontFamily: z
          .string()
          .min(1)
          .max(180)
          .regex(/^[\p{L}\p{N}\s'",.\-]+$/u),
        titleSize: num(16, 36),
        bodySize: num(10, 24),
        labelSize: num(8, 18),
        normalWeight: num(300, 600).multipleOf(100),
        boldWeight: num(500, 800).multipleOf(100),
        lineHeight: num(1, 1.8),
      })
      .strict(),
    nodes: z
      .object({
        radius: num(0, 32),
        strokeWidth: num(0.5, 4),
        paddingX: num(8, 32),
        paddingY: num(8, 24),
        minWidth: num(80, 200),
        minHeight: num(36, 100),
        fillMode: z.enum(["solid", "tinted", "outline"]),
      })
      .strict(),
    connectors: z
      .object({
        strokeWidth: num(0.5, 4),
        lineStyle: z.enum(["solid", "dashed"]),
        arrowLength: num(4, 20),
        arrowWidth: num(4, 16),
        routing: z.enum(["straight", "orthogonal"]),
      })
      .strict(),
    layout: z
      .object({
        horizontalGap: num(24, 100),
        verticalGap: num(24, 100),
        groupPadding: num(12, 48),
        canvasPadding: num(16, 80),
        snapToGrid: z.boolean(),
      })
      .strict(),
    effects: z
      .object({
        shadowEnabled: z.boolean(),
        shadowOpacity: num(0, 0.3),
        highlightOpacity: num(0.05, 0.5),
      })
      .strict(),
  })
  .strict()
  .refine((c) => c.typography.boldWeight >= c.typography.normalWeight, {
    message: "Semibold weight must be at least the normal weight.",
    path: ["typography", "boldWeight"],
  });
export type DiagramStyleConfig = z.infer<typeof configSchema>;
export type ConfigGroup =
  "colors" | "typography" | "nodes" | "connectors" | "layout" | "effects";
export function validateConfig(input: unknown): DiagramStyleConfig {
  return configSchema.parse(input);
}
export function parseConfigJSON(text: string) {
  if (text.length > 100_000)
    throw new Error("The configuration file is too large (maximum 100 KB).");
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  const parsed = configSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue.path[0] === "schemaVersion")
      throw new Error(
        "Unsupported schema version. Only version 1 can be imported.",
      );
    throw new Error(`${issue.path.join(".")}: ${issue.message}`);
  }
  return parsed.data;
}
export const cloneConfig = (c: DiagramStyleConfig): DiagramStyleConfig =>
  structuredClone(c);
