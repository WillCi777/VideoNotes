/**
 * PLATFORM — BROWSER ABSTRACTION
 *
 * Detects the host browser's extension namespace and exposes feature flags.
 *
 * - Chrome / Edge expose the `chrome` namespace.
 * - Safari web extensions expose the `browser` namespace (and, depending on
 *   version, may not alias `chrome`). We alias `browser` onto `chrome` once,
 *   at load time, so the rest of the codebase can keep using the familiar
 *   `chrome.*` calls.
 * - `chrome.sidePanel` is Chrome/Edge-only; Safari has no equivalent, so the
 *   side-panel adapter (src/platform/sidepanel.js) falls back to a tab.
 * - `chrome.storage.local.setAccessLevel` is Chrome/Edge-only; guarded in
 *   src/platform/storage.js.
 * - `chrome.scripting.executeScript({ world: "MAIN" })` is Chrome/Edge-only;
 *   guarded in src/background/video-info.js.
 */

function ytdBrowserApi() {
  if (typeof globalThis.chrome !== "undefined" && globalThis.chrome) {
    return globalThis.chrome;
  }
  if (typeof globalThis.browser !== "undefined" && globalThis.browser) {
    return globalThis.browser;
  }
  return {};
}

/**
 * Make `chrome` resolve on Safari, where only `browser` may exist. Safe to
 * call repeatedly; never overwrites a real `chrome` object.
 */
function ytdAliasBrowserNamespace() {
  const api = ytdBrowserApi();
  if (
    typeof globalThis.chrome === "undefined" &&
    typeof globalThis.browser !== "undefined"
  ) {
    globalThis.chrome = globalThis.browser;
  }
  return api;
}

/**
 * True when the host supports Chrome's Side Panel API (Chrome 114+, Edge 114+).
 * Safari has no side-panel API, so callers must use the tab fallback.
 */
function ytdSupportsSidePanel() {
  const api = ytdBrowserApi();
  return Boolean(
    api.sidePanel &&
      typeof api.sidePanel.open === "function" &&
      typeof api.sidePanel.setOptions === "function",
  );
}

// Run the namespace alias as early as possible in every context.
ytdAliasBrowserNamespace();
