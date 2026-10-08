import type { DiagramStyleConfig } from "../styles/schema";
import type { Edge, NodeBox, Role, Scene } from "./layout";

// A single topology for every preset and for the exported AI reference.
export function buildFlowchart(c: DiagramStyleConfig, top: number): Omit<Scene, "width" | "height" | "cells"> {
  const grid = (n: number) => c.layout.snapToGrid ? Math.ceil(n / 8) * 8 : n;
  // Even grid dimensions keep center ports aligned to the same 8 px grid.
  const extent = (n: number) => c.layout.snapToGrid ? Math.ceil(n / 16) * 16 : n;
  const p = grid(c.layout.canvasPadding), g = grid(c.layout.groupPadding);
  const line = c.typography.labelSize * c.typography.lineHeight;
  // Branch labels and marker tips need room even at the smallest gap settings.
  const hg = grid(Math.max(c.layout.horizontalGap, 4 * c.typography.labelSize + c.connectors.arrowLength));
  const vg = grid(Math.max(c.layout.verticalGap, 2 * line + c.connectors.arrowLength + 12));
  const nodes: NodeBox[] = [];
  function node(id: string, label: string, sub: string | undefined, role: Role, shape?: NodeBox["shape"]): NodeBox {
    const decision = shape === "decision";
    const w = Math.max(label.length * c.typography.bodySize * .67,
      (sub?.length ?? 0) * c.typography.labelSize * .65) + 2 * c.nodes.paddingX;
    const h = c.typography.bodySize * c.typography.lineHeight +
      (sub ? line : 0) + 2 * c.nodes.paddingY;
    const n = { id, label, sub, role, shape, primary: id === "process", accent: decision,
      x: 0, y: 0, w: extent(Math.max(c.nodes.minWidth, w * (decision ? 2 : 1))),
      h: extent(Math.max(c.nodes.minHeight, h * (decision ? 2 : 1))) };
    nodes.push(n);
    return n;
  }
  const input = node("input", "Source", "request · attempt 1", "input", "terminal");
  const process = node("process", "Prepare", "normalize fields", "processing");
  const review = node("review", "Review", "fix · attempt +1", "processing");
  const note = node("note", "Policy", "max 3 attempts", "annotation");
  const decision = node("decision", "Valid?", undefined, "processing", "decision");
  const retry = node("retry", "Retry?", undefined, "processing", "decision");
  const dispatch = node("dispatch", "Dispatch", "run both branches", "processing");
  const enrich = node("enrich", "Enrich", "fetch metadata", "processing");
  const audit = node("audit", "Audit", "record evidence", "processing");
  const join = node("join", "Join", "wait for both", "processing");
  const output = node("output", "Publish", "release result", "output");
  const delivery = node("delivery", "Sent?", undefined, "processing", "decision");
  const failed = node("failed", "Failed", "notify operator", "output", "terminal");
  const done = node("done", "Done", "workflow complete", "output", "terminal");
  const colW = Math.max(...nodes.map(n => n.w));
  // Reserve the failure label as well as the long-route gutter.
  const gutter = grid(Math.max(hg, 2 * (5 * c.typography.labelSize * .67 + c.typography.labelSize - g)));
  const outerX = p, innerX = outerX + g + gutter;
  const centers = [0, 1, 2].map(i => grid(innerX + g + colW / 2 + i * (colW + hg)));
  const right = centers[2] + colW / 2 + g;
  const rows = [[input], [review, process, note], [retry, decision], [dispatch],
    [enrich, audit], [join], [output], [failed, delivery, done]];
  const heights = rows.map(row => Math.max(...row.map(n => n.h)));
  const ys: number[] = [top];
  const outerTop = grid(ys[0] + heights[0] + vg);
  const validationTop = grid(outerTop + 2 * g + line);
  ys[1] = grid(validationTop + 2 * g + line);
  ys[2] = grid(ys[1] + heights[1] + vg);
  const validationBottom = ys[2] + heights[2] + g;
  const parallelTop = grid(validationBottom + vg);
  ys[3] = grid(parallelTop + 2 * g + line);
  ys[4] = grid(ys[3] + heights[3] + vg);
  ys[5] = grid(ys[4] + heights[4] + vg);
  const parallelBottom = ys[5] + heights[5] + g;
  ys[6] = grid(parallelBottom + vg);
  ys[7] = grid(ys[6] + heights[6] + vg);
  const place = (n: NodeBox, col: number, row: number) => {
    n.x = grid(centers[col] - n.w / 2);
    n.y = grid(ys[row] + (heights[row] - n.h) / 2);
  };
  place(input, 1, 0); place(process, 1, 1); place(review, 0, 1); place(note, 2, 1);
  place(decision, 1, 2); place(retry, 0, 2); place(dispatch, 1, 3);
  place(enrich, 0, 4); place(audit, 2, 4); place(join, 1, 5);
  place(output, 1, 6); place(delivery, 1, 7); place(failed, 0, 7); place(done, 2, 7);
  type Point = [number, number];
  const port = (n: NodeBox, side: "top" | "bottom" | "left" | "right"): Point =>
    side === "top" ? [n.x + n.w / 2, n.y] : side === "bottom" ? [n.x + n.w / 2, n.y + n.h] :
      side === "left" ? [n.x, n.y + n.h / 2] : [n.x + n.w, n.y + n.h / 2];
  const edges: Edge[] = [];
  const connect = (id: string, start: Point, end: Point, bends: Point[] = [], options: Partial<Edge> = {}) => {
    edges.push({ id, points: [start, ...bends, end], arrow: true, ...options });
  };
  const down = (id: string, a: NodeBox, b: NodeBox) => connect(id, port(a, "bottom"), port(b, "top"));
  down("receive", input, process); down("validate", process, decision);
  connect("invalid", port(decision, "left"), port(retry, "right"));
  connect("retry-allowed", port(retry, "top"), port(review, "bottom"));
  connect("correct", port(review, "right"), port(process, "left"));
  const failureLane = outerX + g + gutter / 2;
  connect("retry-exhausted", port(retry, "left"), port(failed, "left"),
    [[failureLane, port(retry, "left")[1]], [failureLane, port(failed, "left")[1]]]);
  down("valid", decision, dispatch);
  const forkY = (dispatch.y + dispatch.h + ys[4]) / 2;
  const mergeY = (ys[4] + heights[4] + join.y) / 2;
  for (const branch of [enrich, audit]) {
    const start = port(dispatch, "bottom"), end = port(branch, "top");
    connect(`fork-${branch.id}`, start, end, c.connectors.routing === "orthogonal"
      ? [[start[0], forkY], [end[0], forkY]] : []);
    const back = port(branch, "bottom"), target = port(join, "top");
    connect(`join-${branch.id}`, back, target, c.connectors.routing === "orthogonal"
      ? [[back[0], mergeY], [target[0], mergeY]] : []);
  }
  down("publish", join, output); down("check-delivery", output, delivery);
  connect("delivered", port(delivery, "right"), port(done, "left"));
  connect("delivery-failed", port(delivery, "left"), port(failed, "right"));
  connect("policy", port(note, "left"), port(process, "right"), [], { arrow: false, dashed: true, subtle: true });
  const groups = [
    { x: outerX, y: outerTop, w: right + g - outerX, h: ys[7] + heights[7] + g - outerTop, label: "DELIVERY PIPELINE" },
    { x: innerX, y: validationTop, w: right - innerX, h: validationBottom - validationTop, label: "01 / VALIDATION & RECOVERY" },
    { x: innerX, y: parallelTop, w: right - innerX, h: parallelBottom - parallelTop, label: "02 / PARALLEL PROCESSING" },
  ];
  const labels: Scene["labels"] = [{ x: p, y: p + c.typography.titleSize, text: "Flowchart", title: true }];
  const tag = (id: string, text: string, x: number, y: number, anchor: "start" | "middle" | "end" = "middle") =>
    labels.push({ id, text, x, y, anchor });
  tag("no", "No", (port(decision, "left")[0] + port(retry, "right")[0]) / 2, port(decision, "left")[1] - line / 2);
  tag("retry-yes", "< 3", centers[0] + c.typography.labelSize, (review.y + review.h + retry.y) / 2, "start");
  tag("fix", "Fix", (review.x + review.w + process.x) / 2, port(review, "right")[1] - line / 2);
  tag("limit", "Limit", failureLane - c.typography.labelSize, port(retry, "left")[1] - line / 2, "end");
  tag("yes", "Yes", centers[1] + c.typography.labelSize, decision.y + decision.h + line, "start");
  tag("both", "Both", centers[1] + c.typography.labelSize, forkY - line / 2, "start");
  tag("all", "All complete", centers[1] + c.typography.labelSize, mergeY + line, "start");
  tag("sent-yes", "Yes", (delivery.x + delivery.w + done.x) / 2, port(delivery, "right")[1] - line / 2);
  tag("sent-no", "No", (failed.x + failed.w + delivery.x) / 2, port(delivery, "left")[1] - line / 2);
  tag("caption", "Validate · bounded recovery · parallel work · delivery", p, groups[0].y + groups[0].h + vg, "start");
  const spaces: Scene["spaces"] = [];
  for (const [a, b] of [[review, process], [process, note], [retry, decision], [failed, delivery], [delivery, done]]) {
    spaces.push({ id: `gap-${a.id}-${b.id}`, kind: "horizontalGap", x: a.x + a.w, y: Math.max(a.y, b.y),
      w: b.x - a.x - a.w, h: Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) });
  }
  rows.slice(0, -1).forEach((row, i) => {
    const bottom = Math.max(...row.map(n => n.y + n.h));
    spaces.push({ id: `row-gap-${i}`, kind: "verticalGap", x: innerX + g, y: bottom,
      w: right - innerX - 2 * g, h: Math.min(...rows[i + 1].map(n => n.y)) - bottom });
  });
  groups.forEach((group, i) => {
    spaces.push(
      { id: `group-${i}-top`, kind: "groupPadding", x: group.x, y: group.y, w: group.w, h: g },
      { id: `group-${i}-bottom`, kind: "groupPadding", x: group.x, y: group.y + group.h - g, w: group.w, h: g },
      { id: `group-${i}-left`, kind: "groupPadding", x: group.x, y: group.y + g, w: g, h: group.h - 2 * g },
      { id: `group-${i}-right`, kind: "groupPadding", x: group.x + group.w - g, y: group.y + g, w: g, h: group.h - 2 * g },
    );
  });
  return { nodes, edges, labels, groups, spaces };
}
