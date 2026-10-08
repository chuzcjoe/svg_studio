# SVG Style Studio

A browser-only design-system builder for consistent technical SVG diagrams. The application uses the selected **Precision Lab** interface: restrained blue, neutral controls, and a two-panel workspace focused on style editing and SVG previews. Diagram presets are independent of the application interface. Use the moon/sun button in the header to switch between light and dark UI themes. The theme initially follows your system preference, remembers manual choices, and does not change diagram colors or exported rules.

## Run locally

Use Node.js 22.12+ or Node.js 24 LTS.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. No server API, database, account, or AI credentials are required.

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`build` writes static assets to `dist/`. `preview` serves the production build on http://127.0.0.1:4173. The original six design-direction previews remain at `/design-preview/`.

## Workflow

1. Start with Academic Minimal, Dark Engineering, Modern Soft, or Publication Monochrome. Preset cards show the same flowchart for comparison.
2. Edit 39 validated tokens across Colors, Typography, Nodes, Connectors, Layout, and Effects.
3. Inspect six deterministic native SVG examples: Flowchart, Neural Network, Matrix / Tensor, ML Architecture, System Architecture, and Sequence Diagram. Use Auto / 100% and Fit to canvas, or download the focused SVG.
4. Click **Export rules** in the header to download `svg-style-rules.md` directly. Rules do not occupy a panel or require an intermediate dialog.
5. Use **Save style JSON** at the bottom of the style editor to export `svg-style.json` and keep a complete versioned configuration. Import restores all tokens; invalid data is rejected without changing your current work.

Attach the exported Markdown to your AI request and ask it to follow these SVG rules. For example:

> Draw an SVG explaining the CPU-to-GPU inference pipeline. Follow the attached svg-style-rules.md. Keep labels readable, route connectors around nodes, and return a standalone SVG.

The current configuration persists in localStorage under `svg-style-studio.config.v1`. Preset changes, imports, and resets retain the previous configuration for Undo. Reset requests confirmation when there are modifications. The app clearly identifies preset defaults and customized settings. Narrow screens use Style / Preview tabs.

## Implementation

React + TypeScript + Vite; Zod validates all configuration fields and rejects unsupported schema versions, unsafe strings, unknown keys, and out-of-range numbers. A shared geometry builder and SVG renderer consume the same style configuration for every diagram. Larger fonts, dimensions, gaps, and padding expand the viewBox. SVGs use unique marker/filter IDs, embedded backgrounds, native text/shapes, and system font stacks without external assets.

Markdown generation is a deterministic pure function. Its tokens, semantic mappings, diagram conventions, collision/routing rules, conflict hierarchy, validation checklist, and example SVG all come from the active configuration. The exported Markdown always reflects the current configuration.

## Verification and practical limits

The automated suite covers preset cloning, all configuration fields, invalid imports, JSON round-tripping, persistence, reset/undo, direct Markdown export content, standalone SVG validity and definition references, all preset/diagram combinations, and minimum/maximum geometry.

The fixed-content previews are intentionally not a general graph-layout editor. Long custom font stacks may resolve differently across devices. Custom colors can reduce contrast; the app flags low text contrast and preserves your exact palette. Contrast checks are guidance, not a complete geometric SVG linter. File downloads were verified in Chrome. The embedded preview may not deliver downloads; open the local URL in Chrome if needed. No prose specification can guarantee identical output from every AI model.
