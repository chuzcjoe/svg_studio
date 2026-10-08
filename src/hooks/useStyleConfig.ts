import { useState, useEffect } from "react";
import {
  configSchema,
  cloneConfig,
  parseConfigJSON,
  type ConfigGroup,
  type DiagramStyleConfig,
} from "../styles/schema";
import { loadPreset } from "../styles/presets";
export const STORAGE_KEY = "svg-style-studio.config.v1";
export function readStoredConfig(storage: Pick<Storage, "getItem">) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw
      ? { config: parseConfigJSON(raw), restored: true, warning: "" }
      : { config: loadPreset("academic"), restored: false, warning: "" };
  } catch {
    return {
      config: loadPreset("academic"),
      restored: false,
      warning:
        "Saved settings could not be restored. Academic Minimal has been loaded.",
    };
  }
}
export function useStyleConfig() {
  const [initial] = useState(() => {
    try {
      return readStoredConfig(localStorage);
    } catch {
      return {
        config: loadPreset("academic"),
        restored: false,
        warning:
          "Local storage is unavailable. Export JSON to keep your settings.",
      };
    }
  });
  const [config, setConfig] = useState(initial.config),
    [previous, setPrevious] = useState<DiagramStyleConfig | null>(null),
    [storageWarning, setStorageWarning] = useState(initial.warning);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      setStorageWarning(
        "Settings could not be saved locally. Export JSON to keep your work.",
      );
    }
  }, [config]);
  function update(
    group: ConfigGroup,
    key: string,
    value: string | number | boolean,
  ) {
    const next = cloneConfig(config);
    (next[group] as unknown as Record<string, unknown>)[key] = value;
    const result = configSchema.safeParse(next);
    if (!result.success) return result.error.issues[0].message;
    setConfig(result.data);
    return "";
  }
  function replace(next: DiagramStyleConfig) {
    setPrevious(cloneConfig(config));
    setConfig(cloneConfig(next));
  }
  function undo() {
    if (previous) {
      const current = cloneConfig(config);
      setConfig(cloneConfig(previous));
      setPrevious(current);
    }
  }
  return {
    config,
    update,
    replace,
    undo,
    canUndo: !!previous,
    storageWarning,
    restored: initial.restored,
  };
}
