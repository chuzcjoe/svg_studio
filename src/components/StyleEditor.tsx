import { useState, useEffect, useRef } from "react";
import { controls, groupLabels, colorLabels } from "../styles/controls";
import type { DiagramStyleConfig, ConfigGroup } from "../styles/schema";
import { Icon } from "./Icon";
import type { StyleTarget } from "../diagrams/styleImpact";
const fonts = [
  "Arial, Helvetica, sans-serif",
  "Inter, Arial, sans-serif",
  "Georgia, Times New Roman, serif",
  "Menlo, Consolas, monospace",
];
export function StyleEditor({
  config: c,
  group,
  setGroup,
  onUpdate,
  onPresets,
  onExportJSON,
  modified,
  onInspect,
}: {
  config: DiagramStyleConfig;
  group: ConfigGroup;
  setGroup: (group: ConfigGroup) => void;
  onUpdate: (
    group: ConfigGroup,
    key: string,
    value: string | number | boolean,
  ) => void;
  onPresets: () => void;
  onExportJSON: () => void;
  modified: boolean;
  onInspect: (target: StyleTarget | null) => void;
}) {
  const hovered = useRef<StyleTarget | null>(null);
  const focused = useRef<StyleTarget | null>(null);
  useEffect(() => {
    const clear = () => {
      hovered.current = null;
      focused.current = null;
      onInspect(null);
    };
    clear();
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("blur", clear);
      onInspect(null);
    };
  }, [group, onInspect]);
  function inspectEvents(key: string) {
    const target = { group, key };
    return {
      "data-style-control": `${group}.${key}`,
      onMouseEnter: () => {
        hovered.current = target;
        onInspect(target);
      },
      onMouseLeave: () => {
        hovered.current = null;
        onInspect(focused.current);
      },
      onFocusCapture: () => {
        focused.current = target;
        onInspect(hovered.current ?? target);
      },
      onBlurCapture: (event: React.FocusEvent<HTMLDivElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          focused.current = null;
          onInspect(hovered.current);
        }
      },
    };
  }
  return (
    <aside className="panel style-panel" aria-label="Style editor">
      <div className="panel-title">
        <span>
          <Icon name="sliders" size={15} />
          Style settings
        </span>
        <span className="count">06</span>
      </div>
      <div className="preset-section">
        <div className="field-label">
          START WITH A PRESET <span>4 styles</span>
        </div>
        <button className="preset-select" onClick={onPresets}>
          <span
            className="preset-symbol"
            style={{ color: c.colors.primary, background: c.colors.background }}
          >
            Aa
          </span>
          <span>
            {c.name}
            <small>
              {modified ? "Customized settings" : "Built-in preset"}
            </small>
          </span>
          <Icon name="chevron" size={13} />
        </button>
      </div>
      <div
        className="control-groups"
        role="tablist"
        aria-label="Style control groups"
      >
        {Object.entries(groupLabels).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={group === id}
            aria-controls="controls-content"
            id={`group-${id}`}
            className={group === id ? "active" : ""}
            onClick={() => setGroup(id as ConfigGroup)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                const keys = Object.keys(groupLabels) as ConfigGroup[];
                const index = keys.indexOf(group);
                const next =
                  keys[
                    (index + (e.key === "ArrowRight" ? 1 : keys.length - 1)) %
                      keys.length
                  ];
                setGroup(next);
                document.getElementById(`group-${next}`)?.focus();
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className="controls-body"
        id="controls-content"
        role="tabpanel"
        aria-labelledby={`group-${group}`}
      >
        <div className="section-caption">
          {groupLabels[group].toUpperCase()}
          <span>
            {group === "colors"
              ? "12 tokens"
              : `${controls[group].length} tokens`}
          </span>
        </div>
        {group === "colors"
          ? Object.entries(c.colors).map(([key, value]) => (
              <div className="inspect-control" key={key} {...inspectEvents(key)}>
                <ColorControl
                  label={colorLabels[key]}
                  value={value}
                  onChange={(v) => onUpdate("colors", key, v)}
                />
              </div>
            ))
          : controls[group].map((control) => {
              const value = (
                  c[group] as unknown as Record<
                    string,
                    string | number | boolean
                  >
                )[control.key],
                id = `control-${group}-${control.key}`;
              return (
                <div
                  className="control inspect-control"
                  key={control.key}
                  {...inspectEvents(control.key)}
                >
                  {control.kind === "range" ? (
                    <>
                      <div className="range-label">
                        <label htmlFor={id}>{control.label}</label>
                        <div className="number-with-unit">
                          <NumericInput
                            label={`${control.label} value`}
                            value={Number(value)}
                            min={control.min!}
                            max={control.max!}
                            step={control.step!}
                            onChange={(v) => onUpdate(group, control.key, v)}
                          />
                          <span>
                            {control.unit === "%" ? "opacity" : control.unit}
                          </span>
                        </div>
                      </div>
                      <input
                        id={id}
                        type="range"
                        min={control.min}
                        max={control.max}
                        step={control.step}
                        value={String(value)}
                        onChange={(e) =>
                          onUpdate(group, control.key, Number(e.target.value))
                        }
                      />
                      <div className="range-ends">
                        <span>
                          {control.min}
                          {control.unit === "px" ? " px" : ""}
                        </span>
                        <span>
                          {control.max}
                          {control.unit === "px" ? " px" : ""}
                        </span>
                      </div>
                    </>
                  ) : control.kind === "toggle" ? (
                    <label className="toggle-label" htmlFor={id}>
                      <span>{control.label}</span>
                      <input
                        id={id}
                        type="checkbox"
                        checked={!!value}
                        onChange={(e) =>
                          onUpdate(group, control.key, e.target.checked)
                        }
                      />
                      <span className="toggle-track" aria-hidden="true" />
                    </label>
                  ) : control.kind === "font" ? (
                    <>
                      <label htmlFor={id}>{control.label}</label>
                      <select
                        id={`${id}-preset`}
                        aria-label="Common font stacks"
                        value={
                          fonts.includes(String(value))
                            ? String(value)
                            : "custom"
                        }
                        onChange={(e) =>
                          e.target.value !== "custom" &&
                          onUpdate(group, control.key, e.target.value)
                        }
                      >
                        {fonts.map((f) => (
                          <option key={f} value={f}>
                            {f.split(",")[0]}
                          </option>
                        ))}
                        <option value="custom">Custom font stack</option>
                      </select>
                      <FontInput
                        key={String(value)}
                        value={String(value)}
                        onChange={(v) => onUpdate(group, control.key, v)}
                        id={id}
                      />
                      <p className="control-help">
                        System fonts travel with exported SVGs. Fonts available
                        on each device may differ.
                      </p>
                    </>
                  ) : (
                    <>
                      <label htmlFor={id}>{control.label}</label>
                      <select
                        id={id}
                        value={String(value)}
                        onChange={(e) =>
                          onUpdate(
                            group,
                            control.key,
                            typeof value === "number"
                              ? Number(e.target.value)
                              : e.target.value,
                          )
                        }
                      >
                        {control.options?.map((o) => (
                          <option value={o.value} key={String(o.value)}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              );
            })}
        {group === "nodes" && (
          <div
            className="node-sample"
            style={{
              borderRadius: c.nodes.radius,
              borderWidth: c.nodes.strokeWidth,
              borderColor: c.colors.primary,
              color: c.colors.text,
              background:
                c.nodes.fillMode === "outline"
                  ? c.colors.background
                  : c.colors.processing,
              fontFamily: c.typography.fontFamily,
            }}
          >
            Aa <span>Node preview</span>
          </div>
        )}
        <div className="tip">
          <Icon name="info" size={13} />
          <p>
            See what each setting changes.
            <span>
              Hover or focus a setting to highlight its area in the live preview.
            </span>
          </p>
        </div>
      </div>
      <div className="config-actions">
        <button onClick={onExportJSON} aria-label="Download style JSON">
          <Icon name="download" size={13} />
          Save style JSON
          <Icon name="arrow" size={12} />
        </button>
      </div>
    </aside>
  );
}
function FontInput({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  id: string;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <input
      id={id}
      className="font-input"
      value={draft}
      maxLength={180}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onChange(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}
function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value),
    [error, setError] = useState(false);
  const shown = draft.toLowerCase() === value ? draft : value;
  return (
    <div className={`color-control ${error ? "invalid" : ""}`}>
      <div className="color-row">
        <label htmlFor={`hex-${label}`}>{label}</label>
        <div className="color-value">
          <input
            type="color"
            aria-label={`${label} color`}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setDraft(e.target.value);
              setError(false);
            }}
          />
          <input
            id={`hex-${label}`}
            aria-label={`${label} hex`}
            value={error ? draft : shown.toUpperCase()}
            maxLength={7}
            spellCheck={false}
            aria-invalid={error}
            onFocus={() => setDraft(value)}
            onChange={(e) => {
              const v = e.target.value;
              setDraft(v);
              if (/^#[a-fA-F0-9]{6}$/.test(v)) {
                setError(false);
                onChange(v);
              } else setError(true);
            }}
            onBlur={() => {
              if (error) {
                setDraft(value);
                setError(false);
              }
            }}
          />
        </div>
      </div>
      {error && (
        <small role="status">Enter # followed by six hex digits.</small>
      )}
    </div>
  );
}

function NumericInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <input
      type="number"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        if (e.target.value !== "" && e.target.validity.valid)
          onChange(Number(e.target.value));
      }}
      onBlur={() => {
        const next = Number(draft);
        if (draft === "" || !Number.isFinite(next) || next < min || next > max)
          setDraft(String(value));
        else onChange(next);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}
