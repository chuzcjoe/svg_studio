import { useState, useRef, useEffect, useMemo } from "react";
import { Icon } from "./components/Icon";
import { StyleEditor } from "./components/StyleEditor";
import { PresetGallery } from "./components/PresetGallery";
import { Modal } from "./components/Modal";
import { DiagramViewport } from "./components/DiagramViewport";
import { buildScene } from "./diagrams/layout";
import { loadPreset, isModified } from "./styles/presets";
import { type ConfigGroup, parseConfigJSON } from "./styles/schema";
import { contrastIssues } from "./styles/contrast";
import { useStyleConfig } from "./hooks/useStyleConfig";
import { useTheme } from "./hooks/useTheme";
import { getStyleImpact, type StyleTarget } from "./diagrams/styleImpact";
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
export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { config, update, replace, undo, canUndo, storageWarning, restored } =
    useStyleConfig();
  const [group, setGroup] = useState<ConfigGroup>("colors"),
    [modal, setModal] = useState<"presets" | "reset" | null>(null),
    [mobileTab, setMobileTab] = useState("preview"),
    [toast, setToast] = useState(""),
    [importError, setImportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [inspected, setInspected] = useState<StyleTarget | null>(null);
  const impact = useMemo(
    () => getStyleImpact(config, inspected),
    [config, inspected],
  );
  const inputRef = useRef<HTMLInputElement>(null),
    canvasRef = useRef<HTMLDivElement>(null),
    toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modified = isModified(config),
    scene = useMemo(() => buildScene(config, "Flowchart"), [config]),
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
  async function saveMarkdown() {
    setExporting(true);
    try {
      // The SVG static renderer is only needed when exporting rules.
      const { generateMarkdown } = await import("./export/generateMarkdown");
      downloadFile(
        generateMarkdown(config),
        "svg-style-rules.md",
        "text/markdown;charset=utf-8",
      );
      notify("Markdown downloaded. Attach it to your next AI request.");
    } catch {
      notify("Unable to export rules. Please try again.");
    } finally {
      setExporting(false);
    }
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
    const svg = canvasRef.current?.querySelector("svg.diagram");
    if (svg) {
      const exported = svg.cloneNode(true) as SVGElement;
      // XMLSerializer declares the SVG namespace from the node's namespaceURI.
      exported.removeAttribute("xmlns");
      downloadFile(
        new XMLSerializer().serializeToString(exported),
        "flowchart.svg",
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
              <b>SVG</b> Style Studio<small>YOUR FLOWCHART DESIGN SYSTEM</small>
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
            <button
              className="quiet theme-toggle"
              onClick={toggleTheme}
              aria-label={
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              aria-pressed={theme === "dark"}
              title={
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
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
            <button
              className="export-button"
              onClick={saveMarkdown}
              disabled={exporting}
              aria-busy={exporting}
            >
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
            <h1>AI Readable Design</h1>
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
            onInspect={setInspected}
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
            <div
              className="canvas"
              style={{ background: config.colors.background }}
            >
              <div className="canvas-top">
                <span>Flowchart</span>
                <span>
                  {scene.width} × {scene.height}
                </span>
              </div>
              <DiagramViewport
                config={config}
                type="Flowchart"
                width={scene.width}
                height={scene.height}
                viewportRef={canvasRef}
                impact={impact}
              />
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
                <h2>From source to result.</h2>
                <p>Bounded retries, parallel tasks, nested groups and clear outcomes.</p>
              </div>
              <button className="svg-download" onClick={saveSVG}>
                <Icon name="download" size={13} />
                SVG
              </button>
            </div>
            <div className="preview-footer">
              <span>
                <span className="status-dot" />
                Your flowchart follows your style tokens
              </span>
              <span>SVG · no dependencies</span>
            </div>
          </main>
        </div>
        <footer className="studio-footer">
          <span>DESIGNED FOR FLOWS THAT EXPLAIN.</span>
          <span>Local first. Yours by design.</span>
        </footer>
      </div>
      {modal && (
        <Modal
          label={
            modal === "presets"
              ? "Choose a flowchart style"
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
