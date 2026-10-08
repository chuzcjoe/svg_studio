import { useLayoutEffect, useState, type RefObject } from "react";
import type { ImpactRegion, StyleImpact } from "../diagrams/styleImpact";

export function StyleImpactOverlay({
  impact,
  layerRef,
  width,
  height,
}: {
  impact: StyleImpact;
  layerRef: RefObject<HTMLDivElement | null>;
  width: number;
  height: number;
}) {
  const [measured, setMeasured] = useState<ImpactRegion[]>(impact.regions);
  useLayoutEffect(() => {
    const svg = layerRef.current?.querySelector("svg.diagram");
    setMeasured(impact.regions.map((region) => {
      if (!region.textPart) return region;
      const text = svg?.querySelector<SVGGraphicsElement>(
        `[data-preview-part="${region.textPart}"]`,
      );
      if (!text?.getBBox) return region;
      const box = text.getBBox();
      if (!box.width || !box.height) return region;
      return {
        ...region,
        x: box.x - 2,
        y: box.y - 2,
        width: box.width + 4,
        height: box.height + 4,
      };
    }));
  }, [impact, layerRef]);
  return (
    <svg
      className="style-impact-overlay"
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      data-impact-overlay=""
    >
      {measured.map((region) => (
        <g key={region.id} data-impact-region={region.id}>
          {region.path ? (
            <>
              <path d={region.path} className="impact-halo" />
              <path d={region.path} className={region.area ? "impact-area" : "impact-line"} />
            </>
          ) : (
            <>
              <rect
                x={region.x} y={region.y}
                width={region.width} height={region.height}
                rx={region.radius ?? 3} className="impact-halo"
              />
              <rect
                x={region.x} y={region.y}
                width={region.width} height={region.height}
                rx={region.radius ?? 3}
                className={region.outline ? "impact-outline" : "impact-area"}
              />
            </>
          )}
        </g>
      ))}
    </svg>
  );
}
