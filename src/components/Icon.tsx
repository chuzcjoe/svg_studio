const paths: Record<string, string> = {
  moon: "M20.9 13.1A9 9 0 0 1 10.9 3.1A9 9 0 1 0 20.9 13.1Z",
  sun: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5 19 19 M5 19l1.5-1.5 M17.5 6.5 19 5",
  plus: "M12 5v14 M5 12h14",
  minus: "M5 12h14",
  hand: "M8 13V7a2 2 0 0 1 4 0v6 M12 11V5a2 2 0 0 1 4 0v8 M16 11a2 2 0 0 1 4 0v5c0 4-3 6-6 6h-1c-2 0-3-1-4-2l-5-6a2 2 0 0 1 3-2l1 1",
  code: "M8 6 2 12 8 18 M16 6 22 12 16 18 M13 3 11 21",
  download: "M12 3v12 M7 10l5 5 5-5 M5 17v4h14v-4",
  reset: "M3 10a9 9 0 1 1 2 9 M3 3v7h7",
  sliders: "M4 7h16 M4 17h16 M9 4v6 M16 14v6",
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  copy: "M9 9h11v12H9z M15 9V3H3v12h6",
  file: "M14 2H5v20h14V7z M14 2v6h5 M8 12h8 M8 16h6",
  upload: "M12 16V4 M7 9l5-5 5 5 M5 17v4h14v-4",
  check: "M5 12l4 4L19 6",
  close: "M6 6l12 12 M6 18 18 6",
  chevron: "M9 5l7 7-7 7",
  info: "M12 11v6 M12 7h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  fit: "M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5",
  layers: "M12 3 2 8l10 5 10-5z M2 12l10 5 10-5 M2 16l10 5 10-5",
};
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.grid} />
    </svg>
  );
}
