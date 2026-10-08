import type { DiagramStyleConfig } from "./schema";
export function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((x) => parseInt(x, 16) / 255)
    .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
export function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
function blend(a: string, b: string, alpha: number) {
  const A = a.slice(1).match(/.{2}/g)!,
    B = b.slice(1).match(/.{2}/g)!;
  return (
    "#" +
    A.map((v, i) =>
      Math.round(parseInt(v, 16) * alpha + parseInt(B[i], 16) * (1 - alpha))
        .toString(16)
        .padStart(2, "0"),
    ).join("")
  );
}
export function contrastIssues(c: DiagramStyleConfig) {
  const issues: string[] = [];
  (["input", "processing", "output", "annotation"] as const).forEach((role) => {
    const fill =
      c.nodes.fillMode === "outline"
        ? c.colors.background
        : c.nodes.fillMode === "tinted"
          ? blend(
              c.colors[role],
              c.colors.background,
              c.effects.highlightOpacity,
            )
          : c.colors[role];
    if (contrast(c.colors.text, fill) < 4.5) issues.push(`${role} labels`);
    if (contrast(c.colors.mutedText, fill) < 4.5)
      issues.push(`${role} subtitles`);
  });
  if (contrast(c.colors.mutedText, c.colors.background) < 4.5)
    issues.push("canvas annotations");
  if (contrast(c.colors.mutedText, blend(c.colors.annotation, c.colors.background, c.effects.highlightOpacity)) < 4.5)
    issues.push("group annotations");
  return issues;
}
