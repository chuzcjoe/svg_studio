export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;
export const HOLD_TO_PAN_MS = 300;
export type Size = { width: number; height: number };
export type ViewTransform = { zoom: number; x: number; y: number };
export const fitView = (): ViewTransform => ({ zoom: 1, x: 0, y: 0 });
export function fitScale(viewport: Size, diagram: Size) {
  if (!viewport.width || !viewport.height) return 1;
  return Math.min(
    viewport.width / diagram.width,
    viewport.height / diagram.height,
  );
}
export function constrainView(
  view: ViewTransform,
  viewport: Size,
  diagram: Size,
): ViewTransform {
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, view.zoom));
  const scale = fitScale(viewport, diagram) * zoom;
  // Leave a little room around the image, but never allow it to be dragged out of sight.
  const limitX =
    Math.max(0, (diagram.width * scale - viewport.width) / 2) +
    viewport.width * 0.2;
  const limitY =
    Math.max(0, (diagram.height * scale - viewport.height) / 2) +
    viewport.height * 0.2;
  return {
    zoom,
    x: Math.max(-limitX, Math.min(limitX, view.x)),
    y: Math.max(-limitY, Math.min(limitY, view.y)),
  };
}
export function zoomView(
  view: ViewTransform,
  nextZoom: number,
  viewport: Size,
  diagram: Size,
) {
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
  // Keep the same diagram point under the viewport center when zooming after a pan.
  return constrainView(
    { zoom, x: (view.x * zoom) / view.zoom, y: (view.y * zoom) / view.zoom },
    viewport,
    diagram,
  );
}
