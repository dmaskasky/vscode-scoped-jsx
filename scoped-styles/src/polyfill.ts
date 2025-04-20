import { addEventListener } from "./utils";
import { dedent } from "ts-dedent";

export const SCOPED_CSS = {
  attr: "scoped",
} as NonNullable<Window["SCOPED_CSS"]>;

/**
 * This script transforms every <style scoped> in the DOM into a regular <style>
 * whose content is wrapped in "@scope { ... }".
 *
 * It uses a MutationObserver to:
 *  1. Wrap newly added <style scoped>.
 *  2. Re-wrap the text if the content of an existing <style scoped> changes.
 *  3. Wrap / unwrap the text if the jsx attribute is added or removed.
 */

export function applyPolyfill() {
  if (window.SCOPED_CSS) {
    return;
  }
  /**
   * Wrap the raw CSS in "@scope { ... }" if it's not already wrapped or empty.
   * @param rawCSS The unprocessed CSS text from <style>
   * @returns Possibly modified CSS string
   */
  function transformCSS(rawCSS: string): string {
    const trimmed = dedent(rawCSS).trim();

    // If it's empty or already starts with "@scope {", do nothing
    if (!trimmed || trimmed.startsWith("@scope {")) {
      return rawCSS;
    }

    // Otherwise, wrap it
    return dedent`@scope {
      ${trimmed}
    }`;
  }

  /**
   * Try to remove the "@scope { ... }" wrapper if we detect it's present.
   * We do a naive check for the first line being "@scope {" and the last being "}",
   * and remove them. This might need extra handling for more complex cases.
   *
   * @param wrappedCSS The CSS text possibly containing "@scope { ... }"
   * @returns The CSS string with the @scope wrapper removed, if present
   */
  function removeScopeWrapper(wrappedCSS: string): string {
    const lines = wrappedCSS.split("\n").map((l) => l.trim());

    // If it does not start with @scope { and end with }, leave as-is
    if (
      !lines[0]?.startsWith("@scope {") ||
      !lines[lines.length - 1]?.endsWith("}")
    ) {
      return wrappedCSS;
    }

    // Otherwise, slice off the first and last lines
    const middle = lines.slice(1, -1);
    return dedent(middle.join("\n"));
  }

  /**
   * Process a single <style scoped> by wrapping its text in "@scope { ... }".
   * Prevent re-processing by comparing old vs. new text.
   */
  function upgradeStyle(styleEl: HTMLStyleElement): void {
    console.log(
      "upgrade Style",
      styleEl.hasAttribute(SCOPED_CSS.attr),
      styleEl.getAttribute(SCOPED_CSS.attr),
      styleEl.getAttribute("class"),
    );
    if (!styleEl.hasAttribute(SCOPED_CSS.attr)) {
      return; // Not actually <style scoped>, bail out
    }

    const oldText = styleEl.textContent ?? "";
    const newText = transformCSS(oldText);

    if (newText !== oldText) {
      styleEl.textContent = newText;
    }
  }

  /**
   * Downgrade a <style> by removing the @scope wrapper if it currently has it.
   */
  function downgradeStyle(styleEl: HTMLStyleElement): void {
    if (styleEl.hasAttribute(SCOPED_CSS.attr)) {
      return;
    }
    const oldText = styleEl.textContent ?? "";
    const newText = removeScopeWrapper(oldText);
    if (newText !== oldText) {
      styleEl.textContent = newText;
    }
  }

  /**
   * Process all existing <style scoped> elements in the document.
   */
  function upgradeAllExisting(): void {
    const allScoped = document.querySelectorAll(`style[${SCOPED_CSS.attr}]`);
    allScoped.forEach((styleEl) => {
      if (styleEl instanceof HTMLStyleElement) {
        upgradeStyle(styleEl);
      }
    });
  }

  let removeListener: () => void;
  // 1. Upgrade all <style scoped> on DOM load (or immediately if DOM is ready).
  if (document.readyState === "loading") {
    removeListener = addEventListener(
      document,
      "DOMContentLoaded",
      upgradeAllExisting,
    );
  } else {
    upgradeAllExisting();
  }
  const cleanup = () => {
    removeListener();
    observer.disconnect();
  };

  // 2. Observe changes to the DOM so we can catch new/modified <style scoped> elements.
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((addedNode) => {
        let node = addedNode;
        if (addedNode.nodeType === Node.TEXT_NODE && addedNode.parentNode) {
          node = addedNode.parentNode;
        }

        if (
          node.nodeType === Node.ELEMENT_NODE &&
          (node as Element).nodeName === "STYLE"
        ) {
          upgradeStyle(node as HTMLStyleElement);
        }
        // Or if it's an element containing nested <style scoped>
        if (node.nodeType === Node.ELEMENT_NODE) {
          const scopedStyles = (node as Element).querySelectorAll(
            `style[${SCOPED_CSS.attr}]`,
          );
          scopedStyles.forEach((styleEl) =>
            upgradeStyle(styleEl as HTMLStyleElement),
          );
        }
      });

      if (mutation.type === "characterData" && mutation.target.parentElement) {
        const parent = mutation.target.parentElement;
        if (parent.nodeName === "STYLE") {
          upgradeStyle(parent as HTMLStyleElement);
        }
      }

      if (
        mutation.type === "attributes" &&
        mutation.attributeName === SCOPED_CSS.attr
      ) {
        const targetEl = mutation.target as HTMLStyleElement;
        if (targetEl.hasAttribute(SCOPED_CSS.attr)) {
          upgradeStyle(targetEl);
        } else {
          downgradeStyle(targetEl);
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: [SCOPED_CSS.attr],
  });

  window.SCOPED_CSS = SCOPED_CSS;
}

declare global {
  interface Window {
    SCOPED_CSS:
      | {
          observer: MutationObserver;
          cleanup: () => void;
          attr: string;
        }
      | undefined;
  }
}
