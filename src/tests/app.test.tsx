import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
} from "@testing-library/react";
import { Blob as NodeBlob } from "node:buffer";
import App from "../App";
import { loadPreset } from "../styles/presets";
import { STORAGE_KEY } from "../hooks/useStyleConfig";
import { THEME_STORAGE_KEY } from "../hooks/useTheme";
import { generateMarkdown } from "../export/generateMarkdown";
let blobs: NodeBlob[] = [];
beforeEach(() => {
  localStorage.clear();
  blobs = [];
  vi.stubGlobal("Blob", NodeBlob);
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn((blob: NodeBlob) => {
      blobs.push(blob);
      return "blob:test";
    }),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = true;
    },
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("user workflow", () => {
  it("updates the flowchart and persists representative settings", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Primary color"), {
      target: { value: "#124abc" },
    });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).colors.primary).toBe(
      "#124abc",
    );
    fireEvent.click(screen.getByRole("tab", { name: "Nodes" }));
    fireEvent.change(screen.getByLabelText("Corner radius", { exact: true }), {
      target: { value: "20" },
    });
    expect(
      document
        .querySelector('.diagram-stage [data-node="process"] rect')
        ?.getAttribute("rx"),
    ).toBe("20");
    expect(
      screen.getByRole("img", { name: "Flowchart preview" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("navigation", { name: "Diagram types" }),
    ).toBeNull();
    expect(document.querySelectorAll("main svg[role=img]")).toHaveLength(1);
    expect(
      screen.queryByRole("button", {
        name: /Sequence|Attention|Neural net|Tensor|System/,
      }),
    ).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).nodes.radius).toBe(
      20,
    );
  });
  it("exports current rules directly without a sidebar or intermediate dialog", async () => {
    render(<App />);
    expect(screen.queryByLabelText("Markdown style rules")).toBeNull();
    expect(screen.queryByRole("button", { name: "Rules" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Primary color"), {
      target: { value: "#124abc" },
    });
    const expected = generateMarkdown(
      JSON.parse(localStorage.getItem(STORAGE_KEY)!),
    );
    fireEvent.click(screen.getByRole("button", { name: "Export rules" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(blobs).toHaveLength(1);
    expect(await blobs[0].text()).toBe(expected);
  });
  it("saves complete JSON from the style editor", async () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: "Download style JSON" }),
    );
    expect(JSON.parse(await blobs[0].text())).toEqual(loadPreset("academic"));
  });
  it("restores a saved modified configuration on reload", () => {
    const c = loadPreset("soft");
    c.nodes.radius = 25;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    render(<App />);
    expect(screen.getByLabelText("Primary color").getAttribute("value")).toBe(
      c.colors.primary,
    );
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).nodes.radius).toBe(
      25,
    );
  });
  it("switches presets explicitly and can undo the replacement", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Primary color"), {
      target: { value: "#124abc" },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: /Academic Minimal.*Customized settings/,
      }),
    );
    expect(
      screen.getByText(/Switching presets replaces your edits/),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Dark Engineering/ }));
    expect(screen.getByLabelText("Primary color").getAttribute("value")).toBe(
      "#65d8c2",
    );
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByLabelText("Primary color").getAttribute("value")).toBe(
      "#124abc",
    );
  });
  it("rejects an invalid import without overwriting current edits", async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Primary color"), {
      target: { value: "#124abc" },
    });
    const file = new File(["bad"], "bad.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: async () => "bad" });
    fireEvent.change(screen.getByLabelText("Import style JSON"), {
      target: { files: [file] },
    });
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Primary color").getAttribute("value")).toBe(
      "#124abc",
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "current configuration was kept",
    );
  });
  it("imports a valid complete config and resets to its base preset", async () => {
    render(<App />);
    const c = loadPreset("dark");
    c.nodes.radius = 19;
    const file = new File([JSON.stringify(c)], "style.json", {
      type: "application/json",
    });
    Object.defineProperty(file, "text", {
      value: async () => JSON.stringify(c),
    });
    fireEvent.change(screen.getByLabelText("Import style JSON"), {
      target: { files: [file] },
    });
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).nodes.radius).toBe(
        19,
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset to preset" }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).nodes.radius).toBe(4);
  });
});

it("lets users clear and type a valid numeric value without losing edits", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("tab", { name: "Nodes" }));
  const field = screen.getByLabelText(
    "Minimum width value",
  ) as HTMLInputElement;
  fireEvent.change(field, { target: { value: "" } });
  expect(field.value).toBe("");
  fireEvent.change(field, { target: { value: "160" } });
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).nodes.minWidth).toBe(
    160,
  );
});

it("persists the UI theme without changing the diagram configuration or export", async () => {
  const first = render(<App />);
  const config = localStorage.getItem(STORAGE_KEY);
  fireEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  expect(localStorage.getItem(STORAGE_KEY)).toBe(config);
  fireEvent.click(screen.getByRole("button", { name: "Export rules" }));
  expect(await blobs[0].text()).toBe(generateMarkdown(JSON.parse(config!)));
  first.unmount();
  render(<App />);
  expect(
    screen.getByRole("button", { name: "Switch to light mode" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
});

it("follows the system theme until the user chooses a theme", () => {
  let onChange: (event: { matches: boolean }) => void = () => {};
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: true,
      addEventListener: (_: string, listener: typeof onChange) => {
        onChange = listener;
      },
      removeEventListener: vi.fn(),
    })),
  );
  render(<App />);
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  act(() => onChange({ matches: false }));
  expect(document.documentElement.dataset.theme).toBe("light");
  fireEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));
  act(() => onChange({ matches: false }));
  expect(document.documentElement.dataset.theme).toBe("dark");
});

describe("style inspection workflow", () => {
  const row = (token: string) => document.querySelector<HTMLElement>(`[data-style-control="${token}"]`)!;
  const regions = () => Array.from(document.querySelectorAll("[data-impact-region]")).map((el) => el.getAttribute("data-impact-region"));
  it("highlights the hovered semantic node and clears on leaving without changing the style", () => {
    render(<App />);
    const before = localStorage.getItem(STORAGE_KEY);
    fireEvent.mouseEnter(row("colors.input"));
    expect(regions()).toEqual(["input"]);
    expect(screen.getByText("The fill of the matching semantic node.")).toBeTruthy();
    fireEvent.mouseLeave(row("colors.input"));
    expect(document.querySelector("[data-impact-overlay]")).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before);
  });
  it("supports focus, lets hovering take priority, and restores the focused setting on leave", () => {
    render(<App />);
    const field = screen.getByLabelText("Primary hex");
    fireEvent.focus(field);
    expect(regions()).toEqual(["title", "process"]);
    fireEvent.mouseEnter(row("colors.output"));
    expect(regions()).toEqual(["output"]);
    fireEvent.mouseLeave(row("colors.output"));
    expect(regions()).toEqual(["title", "process"]);
    fireEvent.blur(field);
    expect(regions()).toEqual([]);
  });
  it("clears highlights when the browser loses focus", () => {
    render(<App />);
    fireEvent.mouseEnter(row("colors.input"));
    fireEvent.blur(window);
    expect(regions()).toEqual([]);
  });
  it("clears inspection when switching groups and distinguishes arrowheads from lines", () => {
    render(<App />);
    fireEvent.mouseEnter(row("colors.input"));
    fireEvent.click(screen.getByRole("tab", { name: "Connectors" }));
    expect(regions()).toEqual([]);
    fireEvent.mouseEnter(row("connectors.arrowLength"));
    expect(regions()).toEqual(["arrow-0", "arrow-1"]);
    fireEvent.mouseLeave(row("connectors.arrowLength"));
    fireEvent.mouseEnter(row("connectors.strokeWidth"));
    expect(regions()).toEqual(["edge-0", "edge-1"]);
  });
  it("measures text bounds from the rendered SVG for typography highlights", () => {
    render(<App />);
    const title = document.querySelector('[data-preview-part="title"]')!;
    Object.defineProperty(title, "getBBox", { value: () => ({ x: 32, y: 35, width: 97, height: 24 }) });
    fireEvent.click(screen.getByRole("tab", { name: "Typography" }));
    fireEvent.mouseEnter(row("typography.titleSize"));
    const rect = document.querySelector('[data-impact-region="title"] rect')!;
    expect(rect.getAttribute("x")).toBe("30");
    expect(rect.getAttribute("width")).toBe("101");
  });
  it("keeps highlights out of SVG downloads and follows the zoom transform", async () => {
    render(<App />);
    const svg = document.querySelector(".diagram-stage svg.diagram")!;
    const expected = new XMLSerializer().serializeToString(svg);
    fireEvent.mouseEnter(row("colors.input"));
    const overlay = document.querySelector("[data-impact-overlay]")!;
    expect(overlay.parentElement).toBe(svg.parentElement);
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(document.querySelector("[data-impact-region=input]")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "SVG" }));
    const downloaded = await blobs[0].text();
    expect(downloaded).toBe(expected);
    expect(downloaded).not.toContain("data-impact");
  });
});
