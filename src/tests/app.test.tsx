import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { Blob as NodeBlob } from "node:buffer";
import App from "../App";
import { loadPreset } from "../styles/presets";
import { STORAGE_KEY } from "../hooks/useStyleConfig";
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
  it("updates every preview and persists representative settings", () => {
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
        .querySelector('.diagram-stage [data-node="q"] rect')
        ?.getAttribute("rx"),
    ).toBe("20");
    fireEvent.click(screen.getByRole("button", { name: "Sequence" }));
    expect(
      screen.getByRole("img", { name: "Sequence Diagram preview" }),
    ).toBeTruthy();
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
