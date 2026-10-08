import type { DiagramStyleConfig } from "../styles/schema";
export const diagramTypes = [
  "Flowchart",
  "Neural Network",
  "Matrix / Tensor",
  "ML Architecture",
  "System Architecture",
  "Sequence Diagram",
] as const;
export type DiagramType = (typeof diagramTypes)[number];
export type Role = "input" | "processing" | "output" | "annotation";
export type NodeBox = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
  role: Role;
  primary?: boolean;
  circle?: boolean;
  shape?: "decision" | "terminal";
  accent?: boolean;
};
export type Edge = {
  points: [number, number][];
  dashed?: boolean;
  arrow?: boolean;
  subtle?: boolean;
};
export type Label = {
  id?: string;
  x: number;
  y: number;
  text: string;
  anchor?: "start" | "middle" | "end";
  title?: boolean;
  accent?: boolean;
};
export type Group = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
};
export type Cell = {
  x: number;
  y: number;
  size: number;
  label: string;
  highlight: boolean;
};
export type Scene = {
  width: number;
  height: number;
  nodes: NodeBox[];
  edges: Edge[];
  labels: Label[];
  groups: Group[];
  cells: Cell[];
  spaces: { id: string; kind: "horizontalGap" | "verticalGap" | "groupPadding"; x: number; y: number; w: number; h: number }[];
};
export function buildScene(c: DiagramStyleConfig, type: DiagramType): Scene {
  const s: Scene = {
    width: 0,
    height: 0,
    nodes: [],
    edges: [],
    labels: [],
    groups: [],
    cells: [],
    spaces: [],
  };
  const grid = (n: number) => (c.layout.snapToGrid ? Math.ceil(n / 8) * 8 : n);
  const p = grid(c.layout.canvasPadding),
    g = grid(c.layout.groupPadding),
    hg = grid(c.layout.horizontalGap),
    vg = grid(c.layout.verticalGap),
    titleY = p + c.typography.titleSize;
  const top = grid(
    titleY + c.typography.labelSize * c.typography.lineHeight + g + 20,
  );
  const dimensions = (label: string, sub?: string) => ({
    w: grid(
      Math.max(
        c.nodes.minWidth,
        label.length * c.typography.bodySize * 0.67 + 2 * c.nodes.paddingX,
        (sub?.length ?? 0) * c.typography.labelSize * 0.65 +
          2 * c.nodes.paddingX,
      ),
    ),
    h: grid(
      Math.max(
        c.nodes.minHeight,
        c.typography.bodySize * c.typography.lineHeight +
          (sub ? c.typography.labelSize * c.typography.lineHeight : 0) +
          2 * c.nodes.paddingY,
      ),
    ),
  });
  function box(
    id: string,
    label: string,
    sub: string | undefined,
    role: Role,
    primary = false,
  ): NodeBox {
    return {
      id,
      label,
      sub,
      role,
      primary,
      x: 0,
      y: 0,
      ...dimensions(label, sub),
    };
  }
  function boundaryX(n: NodeBox, side: "left" | "right", y: number) {
    const radius = Math.min(c.nodes.radius, n.h / 2, n.w / 2),
      dy = Math.min(y - n.y, n.y + n.h - y);
    const inset =
      dy < radius
        ? radius - Math.sqrt(Math.max(0, radius * radius - (radius - dy) ** 2))
        : 0;
    return side === "left" ? n.x + inset : n.x + n.w - inset;
  }
  function add(n: NodeBox, x: number, y: number) {
    n.x = x;
    n.y = y;
    s.nodes.push(n);
    return n;
  }
  function edge(points: [number, number][], options: Partial<Edge> = {}) {
    s.edges.push({ points, arrow: true, ...options });
  }
  function link(a: NodeBox, b: NodeBox) {
    const start: [number, number] = [a.x + a.w, a.y + a.h / 2],
      end: [number, number] = [b.x, b.y + b.h / 2];
    edge(
      c.connectors.routing === "orthogonal" && start[1] !== end[1]
        ? [
            start,
            [(start[0] + end[0]) / 2, start[1]],
            [(start[0] + end[0]) / 2, end[1]],
            end,
          ]
        : [start, end],
    );
  }
  s.labels.push({ x: p, y: titleY, text: type, title: true });
  if (type === "Flowchart") {
    // Every preset renders this same workflow; only style tokens vary.
    const input = box("input", "Source", "request data", "input"),
      process = box("process", "Prepare", "normalize fields", "processing", true),
      decision = box("decision", "Valid?", undefined, "processing"),
      review = box("review", "Review", "fix invalid fields", "processing"),
      output = box("output", "Publish", "release result", "output"),
      done = box("done", "Done", "workflow complete", "output"),
      note = box("note", "Policy", "required fields", "annotation");
    decision.shape = "decision";
    decision.accent = true;
    decision.w = grid(Math.max(c.nodes.minWidth,
      2 * (decision.label.length * c.typography.bodySize * 0.67 + 2 * c.nodes.paddingX)));
    decision.h = grid(Math.max(c.nodes.minHeight,
      2 * (c.typography.bodySize * c.typography.lineHeight + 2 * c.nodes.paddingY)));
    done.shape = "terminal";
    const labelLine = c.typography.labelSize * c.typography.lineHeight,
      inputColumn = Math.max(input.w, note.w),
      processColumn = Math.max(process.w, review.w),
      outputColumn = Math.max(output.w, done.w),
      groupX = p + inputColumn + hg,
      processX = groupX + g,
      decisionX = processX + processColumn + hg,
      outputX = decisionX + decision.w + g + hg,
      mainHeight = Math.max(input.h, process.h, decision.h, output.h),
      lowerHeight = Math.max(note.h, review.h, done.h),
      mainY = grid(top + g + labelLine + g + mainHeight / 2),
      lowerY = grid(mainY + mainHeight / 2 + vg + lowerHeight / 2);
    const place = (n: NodeBox, x: number, y: number) => add(n, grid(x), grid(y));
    place(input, p + (inputColumn - input.w) / 2, mainY - input.h / 2);
    place(process, processX + (processColumn - process.w) / 2, mainY - process.h / 2);
    place(decision, decisionX, mainY - decision.h / 2);
    place(output, outputX + (outputColumn - output.w) / 2, mainY - output.h / 2);
    place(review, processX + (processColumn - review.w) / 2, lowerY - review.h / 2);
    place(done, outputX + (outputColumn - done.w) / 2, lowerY - done.h / 2);
    place(note, p + (inputColumn - note.w) / 2, lowerY - note.h / 2);
    link(input, process);
    link(process, decision);
    link(decision, output);
    const decisionBottom: [number, number] = [decision.x + decision.w / 2, decision.y + decision.h],
      reviewRight: [number, number] = [review.x + review.w, review.y + review.h / 2];
    edge(c.connectors.routing === "orthogonal"
      ? [decisionBottom, [decisionBottom[0], reviewRight[1]], reviewRight]
      : [decisionBottom, reviewRight]);
    const reviewTop: [number, number] = [review.x + review.w / 2, review.y],
      processBottom: [number, number] = [process.x + process.w / 2, process.y + process.h];
    edge(c.connectors.routing === "orthogonal" && reviewTop[0] !== processBottom[0]
      ? [reviewTop, [reviewTop[0], (reviewTop[1] + processBottom[1]) / 2],
          [processBottom[0], (reviewTop[1] + processBottom[1]) / 2], processBottom]
      : [reviewTop, processBottom]);
    edge([[output.x + output.w / 2, output.y + output.h], [done.x + done.w / 2, done.y]]);
    link(note, review);
    Object.assign(s.edges[s.edges.length - 1], { subtle: true, dashed: true, arrow: false });
    const groupRight = decision.x + decision.w + g,
      groupBottom = Math.max(review.y + review.h, decision.y + decision.h) + g;
    s.groups.push({ x: groupX, y: top, w: groupRight - groupX, h: groupBottom - top, label: "VALIDATION" });
    s.labels.push(
      { id: "yes", x: (decision.x + decision.w + output.x) / 2,
        y: mainY - c.typography.labelSize * 0.8, text: "Yes", anchor: "middle" },
      { id: "no", x: decisionBottom[0] + c.typography.labelSize,
        y: decisionBottom[1] + labelLine, text: "No" },
      { id: "fix", x: processBottom[0] - c.typography.labelSize,
        y: (reviewTop[1] + processBottom[1]) / 2 + c.typography.labelSize * 0.3,
        text: "Fix", anchor: "end" },
      { id: "caption", x: p, y: Math.max(groupBottom, done.y + done.h, note.y + note.h) + vg,
        text: "Prepare → validate → publish. Review loops back when validation fails." },
    );
    [[input, process], [process, decision], [decision, output], [note, review]].forEach(([left, right], i) => {
      s.spaces.push({ id: `gap-${i}`, kind: "horizontalGap", x: left.x + left.w,
        y: Math.max(left.y, right.y), w: right.x - left.x - left.w,
        h: Math.min(left.y + left.h, right.y + right.h) - Math.max(left.y, right.y) });
    });
    const rowBottom = Math.max(...[input, process, decision, output].map((n) => n.y + n.h)),
      lowerTop = Math.min(...[review, done, note].map((n) => n.y));
    s.spaces.push({ id: "row-gap", kind: "verticalGap", x: processX,
      y: rowBottom, w: groupRight - g - processX, h: lowerTop - rowBottom });
    s.spaces.push(
      { id: "group-top", kind: "groupPadding", x: groupX, y: top, w: groupRight - groupX, h: g },
      { id: "group-bottom", kind: "groupPadding", x: groupX, y: groupBottom - g, w: groupRight - groupX, h: g },
      { id: "group-left", kind: "groupPadding", x: groupX, y: top + g, w: g, h: groupBottom - top - 2 * g },
      { id: "group-right", kind: "groupPadding", x: groupRight - g, y: top + g, w: g, h: groupBottom - top - 2 * g },
    );
  } else if (type === "ML Architecture") {
    const input = box("input", "Input", "embeddings", "input"),
      q = box("q", "Q", "query", "processing"),
      k = box("k", "K", "key", "processing"),
      v = box("v", "V", "value", "processing"),
      score = box("score", "Q × Kᵀ", "attention scores", "processing", true),
      soft = box("soft", "Softmax", "normalized weights", "processing"),
      attn = box(
        "attention",
        "Weighted sum",
        "weights × V",
        "processing",
        true,
      ),
      out = box("output", "Output", "projection", "output");
    const qx = p + input.w + hg + g,
      sx = qx + Math.max(q.w, k.w, v.w) + hg,
      ax = sx + Math.max(score.w, soft.w) + hg,
      ox = ax + attn.w + hg + g;
    const rowH = Math.max(q.h, k.h, v.h),
      qY = grid(top + g + c.typography.labelSize * c.typography.lineHeight),
      kY = qY + rowH + vg,
      vY = kY + rowH + vg;
    add(q, qx, qY);
    add(k, qx, kY);
    add(v, qx, vY);
    const mid = kY + rowH / 2;
    add(input, p, mid - input.h / 2);
    add(score, sx, qY);
    add(soft, sx, kY);
    add(attn, ax, mid - attn.h / 2);
    add(out, ox, mid - out.h / 2);
    const branch = input.x + input.w + hg / 2;
    [q, k, v].forEach((n) =>
      edge(
        c.connectors.routing === "orthogonal"
          ? [
              [input.x + input.w, mid],
              [branch, mid],
              [branch, n.y + n.h / 2],
              [n.x, n.y + n.h / 2],
            ]
          : [
              [input.x + input.w, mid],
              [n.x, n.y + n.h / 2],
            ],
      ),
    );
    link(q, score);
    const kStart: [number, number] = [k.x + k.w, k.y + k.h / 2],
      kEnd: [number, number] = [
        boundaryX(score, "left", score.y + score.h * 0.75),
        score.y + score.h * 0.75,
      ];
    edge(
      c.connectors.routing === "orthogonal"
        ? [kStart, [sx - hg / 3, kStart[1]], [sx - hg / 3, kEnd[1]], kEnd]
        : [kStart, kEnd],
    );
    edge([
      [score.x + score.w / 2, score.y + score.h],
      [soft.x + soft.w / 2, soft.y],
    ]);
    s.labels.push({
      x: score.x + score.w / 2 + 12,
      y: score.y + score.h + vg / 2 + c.typography.labelSize * 0.3,
      text: "÷ √dₖ",
    });
    link(soft, attn);
    link(attn, out);
    const lower = v.y + v.h + vg;
    edge([
      [v.x + v.w / 2, v.y + v.h],
      [v.x + v.w / 2, lower],
      [attn.x + attn.w / 2, lower],
      [attn.x + attn.w / 2, attn.y + attn.h],
    ]);
    s.groups.push({
      x: qx - g,
      y: top,
      w: attn.x + attn.w + g - (qx - g),
      h: lower + g - top,
      label: "MULTI-HEAD ATTENTION",
    });
  } else if (type === "Neural Network") {
    const rad = grid(
      Math.max(
        c.nodes.minHeight / 2,
        c.typography.bodySize * 0.7 + c.nodes.paddingY,
        c.nodes.paddingX + c.typography.bodySize * 0.65,
      ),
    );
    let x = p + rad;
    const counts = [3, 4, 4, 2];
    const layers: NodeBox[][] = [];
    counts.forEach((count, l) => {
      let layer: NodeBox[] = [];
      for (let n = 0; n < count; n++) {
        const cy =
          top + rad + n * (2 * rad + vg) + ((4 - count) * (2 * rad + vg)) / 2;
        const node: NodeBox = {
          id: `l${l}-${n}`,
          label: String(n + 1),
          role: l === 0 ? "input" : l === 3 ? "output" : "processing",
          primary: l === 1,
          circle: true,
          x: x - rad,
          y: cy - rad,
          w: 2 * rad,
          h: 2 * rad,
        };
        s.nodes.push(node);
        layer.push(node);
      }
      layers.push(layer);
      s.labels.push({
        x,
        y:
          top +
          4 * (2 * rad + vg) -
          vg +
          c.typography.labelSize * c.typography.lineHeight +
          24,
        text: [
          "Input layer",
          "Hidden layer 01",
          "Hidden layer 02",
          "Output layer",
        ][l],
        anchor: "middle",
      });
      x += 2 * rad + Math.max(hg, 100);
    });
    layers.slice(0, -1).forEach((layer, l) =>
      layer.forEach((a) =>
        layers[l + 1].forEach((b) => {
          const ac = [a.x + rad, a.y + rad],
            bc = [b.x + rad, b.y + rad],
            angle = Math.atan2(bc[1] - ac[1], bc[0] - ac[0]);
          edge(
            [
              [ac[0] + rad * Math.cos(angle), ac[1] + rad * Math.sin(angle)],
              [bc[0] - rad * Math.cos(angle), bc[1] - rad * Math.sin(angle)],
            ],
            { arrow: false, subtle: true },
          );
        }),
      ),
    );
  } else if (type === "Matrix / Tensor") {
    const size = grid(
      Math.max(
        c.nodes.minHeight,
        c.typography.bodySize * c.typography.lineHeight + 2 * c.nodes.paddingY,
        c.typography.bodySize * 2 + 2 * c.nodes.paddingX,
      ),
    );
    const gap = grid(Math.max(4, c.layout.horizontalGap / 6)),
      x = p + g + 40,
      y = top + g;
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 7; col++)
        s.cells.push({
          x: x + col * (size + gap),
          y: y + row * (size + gap),
          size,
          label: (((col + row * 2) % 9) / 10).toFixed(1),
          highlight: row === 1 || col === 3,
        });
    const right = x + 7 * (size + gap) - gap,
      bottom = y + 4 * (size + gap) - gap;
    s.groups.push({
      x: x - g,
      y: y - g,
      w: right - x + 2 * g,
      h: bottom - y + 2 * g,
      label: "",
    });
    s.labels.push({
      x: (x + right) / 2,
      y: bottom + g + vg,
      text: "Tensor A ∈ ℝ⁴ × ⁷ · Highlighted row / feature channel",
      anchor: "middle",
    });
    s.labels.push({
      x: x - g - 8,
      y: (y + bottom) / 2,
      text: "4",
      anchor: "end",
    });
    s.labels.push({
      x: (x + right) / 2,
      y: y - g - 10,
      text: "7 columns",
      anchor: "middle",
    });
  } else if (type === "System Architecture") {
    const cpu = box("cpu", "CPU", "host compute", "input"),
      gpu = box("gpu", "GPU", "parallel compute", "processing", true),
      mem = box("memory", "Memory", "shared buffer", "output"),
      y = grid(top + g + c.typography.labelSize * c.typography.lineHeight);
    add(cpu, p + g, y);
    add(gpu, cpu.x + cpu.w + hg, y);
    add(mem, gpu.x + gpu.w + hg, y);
    const rowH = Math.max(cpu.h, gpu.h, mem.h),
      transferTop = y + rowH * 0.28,
      transferBottom = y + rowH * 0.72;
    edge([
      [boundaryX(cpu, "right", transferTop), transferTop],
      [boundaryX(gpu, "left", transferTop), transferTop],
    ]);
    edge([
      [boundaryX(gpu, "left", transferBottom), transferBottom],
      [boundaryX(cpu, "right", transferBottom), transferBottom],
    ]);
    edge([
      [gpu.x + gpu.w, y + gpu.h / 2],
      [mem.x, y + mem.h / 2],
    ]);
    s.labels.push({
      x: (cpu.x + cpu.w + gpu.x) / 2,
      y: y + rowH + vg,
      text: "PCIe",
      anchor: "middle",
    });
    s.groups.push({
      x: p,
      y: top,
      w: mem.x + mem.w + g - p,
      h: rowH + vg + 2 * g + c.typography.labelSize * c.typography.lineHeight,
      label: "COMPUTE NODE / 01",
    });
  } else {
    const list = [
      box("client", "Client", undefined, "input"),
      box("api", "API", undefined, "processing", true),
      box("worker", "Worker", undefined, "output"),
    ];
    let x = p;
    list.forEach((n) => {
      add(n, x, top);
      x += n.w + Math.max(hg, grid(140));
    });
    const startY = top + Math.max(...list.map((n) => n.h));
    const spacing = Math.max(
      vg,
      c.typography.labelSize * c.typography.lineHeight + 26,
    );
    const ys = [startY + spacing, startY + 2 * spacing, startY + 3 * spacing];
    const centers = list.map((n) => n.x + n.w / 2),
      endY = ys[2] + spacing;
    centers.forEach((cx) =>
      edge(
        [
          [cx, startY],
          [cx, endY],
        ],
        { dashed: true, arrow: false, subtle: true },
      ),
    );
    edge([
      [centers[0], ys[0]],
      [centers[1], ys[0]],
    ]);
    edge([
      [centers[1], ys[1]],
      [centers[2], ys[1]],
    ]);
    edge(
      [
        [centers[2], ys[2]],
        [centers[0], ys[2]],
      ],
      { dashed: true },
    );
    ["Request", "Execute job", "Response"].forEach((text, i) =>
      s.labels.push({
        x:
          i === 0
            ? (centers[0] + centers[1]) / 2
            : i === 1
              ? (centers[1] + centers[2]) / 2
              : (centers[0] + centers[2]) / 2,
        y: ys[i] - c.typography.labelSize * 0.75,
        text,
        anchor: "middle",
      }),
    );
  }
  const bounds = [
    ...s.nodes.map((n) => ({ right: n.x + n.w, bottom: n.y + n.h })),
    ...s.groups.map((n) => ({ right: n.x + n.w, bottom: n.y + n.h })),
    ...s.cells.map((n) => ({ right: n.x + n.size, bottom: n.y + n.size })),
    ...s.edges.flatMap((e) =>
      e.points.map(([x, y]) => ({ right: x, bottom: y })),
    ),
    ...s.labels.map((l) => ({
      right:
        l.x +
        (l.anchor === "middle"
          ? l.text.length / 2
          : l.anchor === "end"
            ? 0
            : l.text.length) *
          c.typography.labelSize *
          0.63,
      bottom: l.y + c.typography.labelSize * 0.5,
    })),
  ];
  s.width = grid(Math.max(550, ...bounds.map((b) => b.right)) + p);
  s.height = grid(Math.max(240, ...bounds.map((b) => b.bottom)) + p);
  return s;
}
