import { useState, useRef, useEffect, useMemo } from "react";
import { Icon } from "./components/Icon";
import { StyleEditor } from "./components/StyleEditor";
import { PresetGallery } from "./components/PresetGallery";
import { Modal } from "./components/Modal";
import { Diagram } from "./diagrams/Diagram";
import { diagramTypes, buildScene, type DiagramType } from "./diagrams/layout";
import { loadPreset, isModified } from "./styles/presets";
import { type ConfigGroup, parseConfigJSON } from "./styles/schema";
import { contrastIssues } from "./styles/contrast";
import { useStyleConfig } from "./hooks/useStyleConfig";
import { generateMarkdown } from "./export/generateMarkdown";
export function downloadFile(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const descriptions: Record<DiagramType, [string, string]> = {
  Flowchart: [
    "From source to result.",
    "Node geometry, semantic colors and attached arrowheads.",
  ],
  "Neural Network": [
    "A clear path through the layers.",
    "Circular units, subtle connections and labeled network structure.",
  ],
  "Matrix / Tensor": [
    "Structure you can read at a glance.",
    "Aligned cells, dimension labels and shared highlight tokens.",
  ],
  "ML Architecture": [
    "Attention, without the distraction.",
    "Grouped projections, normalized weights and a deliberate V route.",
  ],
  "System Architecture": [
    "Every component in its place.",
    "CPU, GPU and memory — clear boundaries and transfer directions.",
  ],
  "Sequence Diagram": [
    "The order makes the story.",
    "Participant lifelines, ordered messages and dashed return arrows.",
  ],
};
const shortNames: Record<DiagramType, string> = {
  Flowchart: "Flowchart",
  "Neural Network": "Neural net",
  "Matrix / Tensor": "Tensor",
  "ML Architecture": "Attention",
  "System Architecture": "System",
  "Sequence Diagram": "Sequence",
};
export default function App() {
  const { config, update, replace, undo, canUndo, storageWarning, restored } =
    useStyleConfig();
  const [group, setGroup] = useState<ConfigGroup>("colors"),
    [type, setType] = useState<DiagramType>("ML Architecture"),
    [modal, setModal] = useState<"presets" | "reset" | null>(null),
    [mobileTab, setMobileTab] = useState("preview"),
    [zoom, setZoom] = useState<"fit" | "actual">("fit"),
    [toast, setToast] = useState(""),
    [importError, setImportError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null),
    canvasRef = useRef<HTMLDivElement>(null),
    toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modified = isModified(config),
    scene = useMemo(() => buildScene(config, type), [config, type]),
    issues = contrastIssues(config);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );
  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4500);
  }
  function saveMarkdown() {
    downloadFile(
      generateMarkdown(config),
      "svg-style-rules.md",
      "text/markdown;charset=utf-8",
    );
    notify("Markdown downloaded. Attach it to your next AI request.");
  }
  function saveJSON() {
    downloadFile(
      JSON.stringify(config, null, 2) + "\n",
      "svg-style.json",
      "application/json;charset=utf-8",
    );
    notify("JSON downloaded. Import it to restore these exact settings.");
  }
  async function importFile(file?: File) {
    if (!file) return;
    setImportError("");
    try {
      if (file.size > 100_000)
        throw new Error("Choose a JSON configuration smaller than 100 KB.");
      const imported = parseConfigJSON(await file.text());
      replace(imported);
      notify(
        `Restored ${imported.name}. Previous settings are available with Undo.`,
      );
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Unable to import this file.",
      );
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }
  function saveSVG() {
    const svg = canvasRef.current?.querySelector("svg");
    if (svg) {
      downloadFile(
        new XMLSerializer().serializeToString(svg),
        `${type.toLowerCase().replace(/[^a-z]+/g, "-")}.svg`,
        "image/svg+xml;charset=utf-8",
      );
      notify("Standalone SVG downloaded.");
    }
  }
  return (
    <>
      <div className="app-shell">
        <header className="studio-header">
          <a
            className="brand"
            href="#"
            onClick={(e) => e.preventDefault()}
            aria-label="SVG Style Studio home"
          >
            <span className="brand-mark">
              <Icon name="code" size={22} />
            </span>
            <span>
              <b>SVG</b> Style Studio<small>YOUR DIAGRAM DESIGN SYSTEM</small>
            </span>
          </a>
          <div className="header-status">
            <span className={`status-dot ${storageWarning ? "warning" : ""}`} />
            {storageWarning
              ? "Storage notice"
              : restored
                ? "Restored · saved locally"
                : "Saved locally"}
          </div>
          <div className="header-actions">
            {canUndo && (
              <button
                className="quiet"
                aria-label="Undo"
                onClick={() => {
                  undo();
                  notify("Previous configuration restored.");
                }}
              >
                <Icon name="reset" size={14} />
                <span>Undo</span>
              </button>
            )}
            <button
              aria-label="Reset"
              className="quiet reset-action"
              onClick={() =>
                modified
                  ? setModal("reset")
                  : notify("Already using the preset defaults.")
              }
            >
              <Icon name="reset" size={14} />
              <span>Reset</span>
            </button>
            <button
              className="quiet"
              aria-label="Import JSON"
              onClick={() => inputRef.current?.click()}
            >
              <Icon name="upload" size={14} />
              <span>Import</span>
            </button>
            <button className="export-button" onClick={saveMarkdown}>
              <Icon name="download" size={15} />
              <span>Export rules</span>
            </button>
          </div>
          <input
            type="file"
            ref={inputRef}
            className="visually-hidden"
            accept=".json,application/json"
            aria-label="Import style JSON"
            onChange={(e) => void importFile(e.target.files?.[0])}
          />
        </header>
        <section className="workspace-heading">
          <div>
            <div className="eyebrow">DIAGRAM DESIGN SYSTEM</div>
            <h1>A little structure. A lot of clarity.</h1>
            <p>Define once. Make every diagram feel like yours.</p>
          </div>
          <div className="workspace-meta">
            <button
              className="current-style"
              onClick={() => setModal("presets")}
            >
              <span
                className="style-dot"
                style={{ background: config.colors.primary }}
              />
              {config.name}
              <Icon name="chevron" size={12} />
            </button>
            <span className={`modified-badge ${modified ? "modified" : ""}`}>
              {modified ? "Customized" : "Preset defaults"}
            </span>
            <span className="schema">SCHEMA v1.0</span>
          </div>
        </section>
        {storageWarning && (
          <div className="banner" role="status">
            <Icon name="info" size={15} />
            {storageWarning}
          </div>
        )}
        {importError && (
          <div className="banner error" role="alert">
            <Icon name="info" size={15} />
            <span>
              Import failed: {importError} Your current configuration was kept.
            </span>
            <button
              onClick={() => setImportError("")}
              aria-label="Dismiss import error"
            >
              <Icon name="close" size={15} />
            </button>
          </div>
        )}
        <nav className="mobile-nav" aria-label="Workspace panels">
          {["style", "preview"].map((tab) => (
            <button
              key={tab}
              className={tab === mobileTab ? "active" : ""}
              aria-current={tab === mobileTab ? "page" : undefined}
              onClick={() => setMobileTab(tab)}
            >
              <Icon name={tab === "style" ? "sliders" : "grid"} size={14} />
              {tab[0].toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
        <div className={`workspace mobile-${mobileTab}`}>
          <StyleEditor
            config={config}
            group={group}
            setGroup={setGroup}
            modified={modified}
            onPresets={() => setModal("presets")}
            onExportJSON={saveJSON}
            onUpdate={(g, k, v) => {
              const error = update(g, k, v);
              if (error) notify(error);
            }}
          />
          <main className="panel preview-panel">
            <div className="panel-title">
              <span>
                <span className="live-dot" />
                Live preview
              </span>
              <span className="auto-label">Updates instantly</span>
            </div>
            <nav className="diagram-tabs" aria-label="Diagram types">
              {diagramTypes.map((d) => (
                <button
                  key={d}
                  className={type === d ? "active" : ""}
                  aria-pressed={type === d}
                  onClick={() => setType(d)}
                >
                  {shortNames[d]}
                </button>
              ))}
            </nav>
            <div
              className="canvas"
              style={{ background: config.colors.background }}
            >
              <div className="canvas-top">
                <span>
                  {type === "ML Architecture" ? "Multi-head attention" : type}
                </span>
                <span>
                  {scene.width} × {scene.height}
                </span>
              </div>
              <div
                className={`diagram-stage ${zoom === "actual" ? "actual" : ""}`}
                ref={canvasRef}
                style={
                  {
                    "--svg-width": `${scene.width}px`,
                    "--svg-aspect": `${scene.width} / ${scene.height}`,
                  } as React.CSSProperties
                }
              >
                <Diagram config={config} type={type} />
              </div>
              <div className="canvas-bottom">
                <span className="canvas-tag">{type.toUpperCase()}</span>
                <div>
                  <button
                    aria-pressed={zoom === "actual"}
                    onClick={() =>
                      setZoom(zoom === "actual" ? "fit" : "actual")
                    }
                  >
                    {zoom === "actual" ? "100%" : "Auto"}
                  </button>
                  <span>│</span>
                  <button
                    onClick={() => {
                      setZoom("fit");
                      if (canvasRef.current) {
                        canvasRef.current.scrollLeft = 0;
                        canvasRef.current.scrollTop = 0;
                      }
                    }}
                  >
                    <Icon name="fit" size={11} />
                    Fit to canvas
                  </button>
                </div>
              </div>
            </div>
            {issues.length > 0 && (
              <div className="contrast-notice" role="status">
                <Icon name="info" size={14} />
                <span>
                  Low text contrast: {issues.join(", ")}. Adjust Colors before
                  exporting.
                </span>
              </div>
            )}
            <div className="preview-caption">
              <div>
                <h2>{descriptions[type][0]}</h2>
                <p>{descriptions[type][1]}</p>
              </div>
              <button className="svg-download" onClick={saveSVG}>
                <Icon name="download" size={13} />
                SVG
              </button>
            </div>
            <div className="small-previews">
              {diagramTypes
                .filter((d) => d !== type)
                .slice(0, 3)
                .map((d) => (
                  <button
                    key={d}
                    onClick={() => setType(d)}
                    aria-label={`Preview ${d}`}
                  >
                    <div style={{ background: config.colors.background }}>
                      <Diagram config={config} type={d} />
                    </div>
                    <span>
                      {shortNames[d]}
                      <Icon name="arrow" size={12} />
                    </span>
                  </button>
                ))}
            </div>
            <div className="preview-footer">
              <span>
                <span className="status-dot" />
                All diagrams share your style tokens
              </span>
              <span>SVG · no dependencies</span>
            </div>
          </main>
        </div>
        <footer className="studio-footer">
          <span>DESIGNED FOR DIAGRAMS THAT EXPLAIN.</span>
          <span>Local first. Yours by design.</span>
        </footer>
      </div>
      {modal && (
        <Modal
          label={
            modal === "presets"
              ? "Choose a diagram preset"
              : "Reset to preset defaults"
          }
          onClose={() => setModal(null)}
        >
          {modal === "presets" ? (
            <PresetGallery
              current={config.basePresetId}
              modified={modified}
              onClose={() => setModal(null)}
              onChoose={(id) => {
                replace(loadPreset(id));
                setModal(null);
                notify(
                  "Preset loaded. Previous settings are available with Undo.",
                );
              }}
            />
          ) : (
            <div className="reset-dialog">
              <Icon name="reset" size={26} />
              <h2>Back to a clean starting point?</h2>
              <p>
                Reset all tokens to {loadPreset(config.basePresetId).name}. Your
                current settings will be available with Undo.
              </p>
              <div>
                <button
                  className="secondary-button"
                  onClick={() => setModal(null)}
                >
                  Keep editing
                </button>
                <button
                  className="export-button"
                  onClick={() => {
                    replace(loadPreset(config.basePresetId));
                    setModal(null);
                    notify("Preset defaults restored.");
                  }}
                >
                  Reset to preset
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
      <div
        className={`toast ${toast ? "visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {toast && (
          <>
            <Icon name="check" size={16} />
            {toast}
          </>
        )}
      </div>
    </>
  );
}
