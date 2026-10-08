import { useId } from "react";
import type { DiagramStyleConfig } from "../styles/schema";
import { buildScene, type DiagramType, type NodeBox } from "./layout";
export function Diagram({
  config: c,
  type,
  className = "",
  id: givenId,
}: {
  config: DiagramStyleConfig;
  type: DiagramType;
  className?: string;
  id?: string;
}) {
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = givenId ?? `diagram-${reactId}`,
    marker = `${id}-arrow`,
    shadow = `${id}-shadow`,
    s = buildScene(c, type),
    t = c.typography;
  const label = (n: NodeBox) => {
    const lineHeight = t.bodySize * t.lineHeight,
      subHeight = n.sub ? t.labelSize * t.lineHeight : 0,
      baseline =
        n.y +
        n.h / 2 -
        (n.sub ? (lineHeight + subHeight) / 2 : lineHeight / 2) +
        t.bodySize * 0.8;
    return (
      <text
        x={n.x + n.w / 2}
        y={baseline}
        textAnchor="middle"
        fill={c.colors.text}
        fontSize={t.bodySize}
        fontWeight={t.boldWeight}
      >
        <tspan x={n.x + n.w / 2} data-preview-part={`${n.id}-label`}>{n.label}</tspan>
        {n.sub && (
          <tspan
            x={n.x + n.w / 2}
            data-preview-part={`${n.id}-subtitle`}
            dy={subHeight}
            fill={c.colors.mutedText}
            fontSize={t.labelSize}
            fontWeight={t.normalWeight}
          >
            {n.sub}
          </tspan>
        )}
      </text>
    );
  };
  const nodeShape = (n: NodeBox, fill: string, opacity = 1) =>
    n.shape === "decision" ? (
      <path
        d={`M${n.x + n.w / 2} ${n.y} L${n.x + n.w} ${n.y + n.h / 2} L${n.x + n.w / 2} ${n.y + n.h} L${n.x} ${n.y + n.h / 2} Z`}
        fill={fill}
        fillOpacity={opacity}
      />
    ) : n.circle ? (
      <circle
        cx={n.x + n.w / 2}
        cy={n.y + n.h / 2}
        r={n.w / 2}
        fill={fill}
        fillOpacity={opacity}
      />
    ) : (
      <rect
        x={n.x}
        y={n.y}
        width={n.w}
        height={n.h}
        rx={n.shape === "terminal" ? n.h / 2 : Math.min(c.nodes.radius, n.h / 2)}
        fill={fill}
        fillOpacity={opacity}
      />
    );
  return (
    <svg
      className={`diagram ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${s.width} ${s.height}`}
      role="img"
      aria-label={`${type} preview`}
      fontFamily={t.fontFamily}
      fontWeight={t.normalWeight}
      data-diagram-type={type}
      data-width={s.width}
      data-height={s.height}
    >
      <title>{`${type} — ${c.name}`}</title>
      <desc>
        Fixed-content technical diagram using the active style configuration.
      </desc>
      <defs>
        <marker
          id={marker}
          markerUnits="userSpaceOnUse"
          markerWidth={c.connectors.arrowLength}
          markerHeight={c.connectors.arrowWidth}
          refX={c.connectors.arrowLength}
          refY={c.connectors.arrowWidth / 2}
          orient="auto-start-reverse"
        >
          <path
            d={`M0 0 L${c.connectors.arrowLength} ${c.connectors.arrowWidth / 2} L0 ${c.connectors.arrowWidth} Z`}
            fill={c.colors.connector}
          />
        </marker>
        <filter id={shadow} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow
            dx="0"
            dy="3"
            stdDeviation="3"
            floodColor={c.colors.text}
            floodOpacity={c.effects.shadowOpacity}
          />
        </filter>
      </defs>
      <rect width={s.width} height={s.height} fill={c.colors.background} />
      {s.groups.map((g, i) => (
        <g key={`group-${i}`} data-group={i}>
          <rect
            x={g.x}
            y={g.y}
            width={g.w}
            height={g.h}
            rx={c.nodes.radius}
            fill={c.colors.annotation}
            fillOpacity={c.effects.highlightOpacity}
            stroke={c.colors.border}
            strokeWidth={c.nodes.strokeWidth}
            strokeDasharray="5 5"
          />
          {g.label && (
            <text
              data-preview-part={`group-${i}-label`}
              x={g.x + c.layout.groupPadding}
              y={g.y + c.layout.groupPadding + t.labelSize * 0.8}
              fontSize={t.labelSize}
              fill={c.colors.mutedText}
            >
              {g.label}
            </text>
          )}
        </g>
      ))}
      {s.edges.map((e, i) => (
        <path
          key={`edge-${i}`}
          data-edge={i}
          d={e.points.map(([x, y], j) => `${j ? "L" : "M"}${x} ${y}`).join(" ")}
          fill="none"
          stroke={e.subtle ? c.colors.secondary : c.colors.connector}
          strokeWidth={c.connectors.strokeWidth}
          strokeOpacity={e.subtle ? 0.5 : 1}
          strokeDasharray={
            e.dashed || c.connectors.lineStyle === "dashed" ? "6 5" : undefined
          }
          markerEnd={e.arrow ? `url(#${marker})` : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {s.nodes.map((n) => (
        <g
          key={n.id}
          data-node={n.id}
          filter={c.effects.shadowEnabled ? `url(#${shadow})` : undefined}
        >
          {nodeShape(n, c.colors.background)}
          {c.nodes.fillMode !== "outline" &&
            nodeShape(
              n,
              c.colors[n.role],
              c.nodes.fillMode === "tinted" ? c.effects.highlightOpacity : 1,
            )}
          {n.shape === "decision" ? (
            <path
              d={`M${n.x + n.w / 2} ${n.y} L${n.x + n.w} ${n.y + n.h / 2} L${n.x + n.w / 2} ${n.y + n.h} L${n.x} ${n.y + n.h / 2} Z`}
              fill="none"
              stroke={c.colors.accent}
              strokeWidth={c.nodes.strokeWidth}
            />
          ) : n.circle ? (
            <circle
              cx={n.x + n.w / 2}
              cy={n.y + n.h / 2}
              r={n.w / 2}
              fill="none"
              stroke={n.primary ? c.colors.primary : c.colors.border}
              strokeWidth={c.nodes.strokeWidth}
            />
          ) : (
            <rect
              x={n.x}
              y={n.y}
              width={n.w}
              height={n.h}
              rx={n.shape === "terminal" ? n.h / 2 : Math.min(c.nodes.radius, n.h / 2)}
              fill="none"
              stroke={n.primary ? c.colors.primary : c.colors.border}
              strokeWidth={c.nodes.strokeWidth}
            />
          )}{" "}
          {label(n)}
        </g>
      ))}
      {s.cells.map((cell, i) => (
        <g key={`cell-${i}`}>
          <rect
            x={cell.x}
            y={cell.y}
            width={cell.size}
            height={cell.size}
            rx={Math.min(c.nodes.radius, cell.size / 2)}
            fill={
              c.nodes.fillMode === "outline"
                ? c.colors.background
                : c.colors.processing
            }
            stroke={c.colors.border}
            strokeWidth={c.nodes.strokeWidth}
          />
          {cell.highlight && (
            <rect
              x={cell.x}
              y={cell.y}
              width={cell.size}
              height={cell.size}
              rx={Math.min(c.nodes.radius, cell.size / 2)}
              fill={c.colors.accent}
              fillOpacity={c.effects.highlightOpacity}
              stroke={c.colors.primary}
              strokeWidth={c.nodes.strokeWidth}
            />
          )}
          <text
            x={cell.x + cell.size / 2}
            y={cell.y + cell.size / 2 + t.bodySize * 0.35}
            textAnchor="middle"
            fontSize={t.bodySize}
            fill={c.colors.text}
          >
            {cell.label}
          </text>
        </g>
      ))}
      {s.labels.map((l, i) => (
        <text
          key={`label-${i}`}
          data-preview-part={l.title ? "title" : (l.id ?? `label-${i}`)}
          x={l.x}
          y={l.y}
          textAnchor={l.anchor ?? "start"}
          fill={
            l.title
              ? c.colors.primary
              : l.accent
                ? c.colors.accent
                : c.colors.mutedText
          }
          fontSize={l.title ? t.titleSize : t.labelSize}
          fontWeight={l.title ? t.boldWeight : t.normalWeight}
        >
          {l.text}
        </text>
      ))}
    </svg>
  );
}
