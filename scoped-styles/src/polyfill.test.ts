// @vitest-environment jsdom
import { microtask } from "./utils";
import { dedent as d } from "ts-dedent";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { SCOPED_CSS } from "./polyfill";

const { attr: SCOPED_ATTR } = SCOPED_CSS;

describe("style-scoped polyfill", () => {
  // Setup and teardown
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    // Clean up any observers that might have been created
    vi.restoreAllMocks();
  });

  it("should transform existing style scoped elements on load", async () => {
    // Add a scoped style before loading the polyfill
    const style = document.createElement("style");
    style.setAttribute(SCOPED_ATTR, "");
    style.textContent = "p { color: red; }";
    document.body.appendChild(style);

    // Load the polyfill
    const { applyPolyfill } = await import("./polyfill");
    applyPolyfill();

    // Check that the style content was transformed with exact text
    expect(style.textContent).toBe(d`
      @scope {
        p { color: red; }
      }
    `);
  });

  it("should transform newly added style scoped elements", async () => {
    // Load the polyfill first
    const { applyPolyfill } = await import("./polyfill");
    applyPolyfill();

    // Add a scoped style after loading
    const style = document.createElement("style");
    style.setAttribute(SCOPED_ATTR, "");
    style.textContent = "div { margin: 10px; }";
    document.body.appendChild(style);
    await microtask();

    // Check that the style was transformed with exact text
    expect(style.textContent).toBe(d`
      @scope {
        div { margin: 10px; }
      }
    `);
  });

  it("should handle style content changes", async () => {
    // Load the polyfill
    const { applyPolyfill } = await import("./polyfill");
    applyPolyfill();

    // Add a scoped style
    const style = document.createElement("style");
    style.setAttribute(SCOPED_ATTR, "");
    style.textContent = "span { padding: 5px; }";
    document.body.appendChild(style);
    await microtask();

    // Verify initial transformation
    expect(style.textContent).toBe(d`
      @scope {
        span { padding: 5px; }
      }
    `);

    // Change the content
    style.textContent = "span { padding: 10px; }";
    await microtask();

    // Check that the new content was transformed with exact text
    expect(style.textContent).toBe(d`
      @scope {
        span { padding: 10px; }
      }
    `);
  });

  it("should handle scoped attribute being added or removed", async () => {
    // Load the polyfill
    const { applyPolyfill } = await import("./polyfill");
    applyPolyfill();

    // Add a regular style
    const style = document.createElement("style");
    style.textContent = "h1 { font-size: 24px; }";
    document.body.appendChild(style);

    // Original content should be unchanged
    expect(style.textContent).toBe("h1 { font-size: 24px; }");

    // Add scoped attribute
    style.setAttribute(SCOPED_ATTR, "");
    await microtask();

    // Content should now be wrapped with exact text
    expect(style.textContent).toBe(d`
      @scope {
        h1 { font-size: 24px; }
      }
    `);

    // Remove scoped attribute
    style.removeAttribute(SCOPED_ATTR);
    await microtask();

    // Content should be unwrapped with exact text
    expect(style.textContent).toBe("h1 { font-size: 24px; }");
  });

  it("should not transform already transformed styles", async () => {
    // Load the polyfill
    const { applyPolyfill } = await import("./polyfill");
    applyPolyfill();

    // Add a scoped style that's already in the @scope format
    const style = document.createElement("style");
    style.setAttribute(SCOPED_ATTR, "");
    style.textContent = d`
      @scope {
        a { color: blue; }
      }
    `;
    document.body.appendChild(style);
    await microtask();

    // Content should remain the same
    expect(style.textContent).toBe(d`
      @scope {
        a { color: blue; }
      }
    `);
  });

  it("should handle empty style elements", async () => {
    // Load the polyfill
    const { applyPolyfill } = await import("./polyfill");
    applyPolyfill();

    // Add an empty scoped style
    const style = document.createElement("style");
    style.setAttribute(SCOPED_ATTR, "");
    style.textContent = "";
    document.body.appendChild(style);
    await microtask();

    // Content should remain empty
    expect(style.textContent).toBe("");
  });
});
