/**
 * BACKGROUND — ENTRY POINT (layer assembler)
 *
 * This file does not contain feature logic anymore. It only loads the layered
 * modules below in dependency order, so each module stays small, focused, and
 * testable:
 *
 *   LAYER 1  settings.js, src/core/*          Pure, framework-agnostic logic
 *   LAYER 2  src/platform/*                   Browser abstraction (Chrome/Edge/Safari)
 *   LAYER 3  src/services/*                   Supadata + AI providers
 *   LAYER 4  src/background/*                 Feature wiring + message router
 *
 * The loader is intentionally dual-mode:
 * - Chrome / Edge run this file as an MV3 SERVICE WORKER, where the classic
 *   `importScripts()` function exists.
 * - Safari has no service-worker background; it loads this file as a classic
 *   script inside a background PAGE (a window context), where importScripts is
 *   undefined. There we fall back to document.write() of classic <script> tags,
 *   which execute synchronously and in order, giving the exact same result.
 */
(function (global) {
  "use strict";

  var ytdBackgroundModules = [
    "settings.js",
    "src/core/debug.js",
    "src/core/json.js",
    "src/core/timestamps.js",
    "src/core/translation-validation.js",
    "src/platform/browser.js",
    "src/platform/storage.js",
    "src/platform/sidepanel.js",
    "src/services/prompts.js",
    "src/services/supadata.js",
    "src/services/ai-client.js",
    "src/services/ai-tasks.js",
    "src/background/panel-scope.js",
    "src/background/notes.js",
    "src/background/video-info.js",
    "src/background/router.js",
    "src/background/main.js",
  ];

  if (typeof importScripts === "function") {
    // Chrome / Edge MV3 service worker path.
    importScripts(
      "settings.js",
      "src/core/debug.js",
      "src/core/json.js",
      "src/core/timestamps.js",
      "src/core/translation-validation.js",
      "src/platform/browser.js",
      "src/platform/storage.js",
      "src/platform/sidepanel.js",
      "src/services/prompts.js",
      "src/services/supadata.js",
      "src/services/ai-client.js",
      "src/services/ai-tasks.js",
      "src/background/panel-scope.js",
      "src/background/notes.js",
      "src/background/video-info.js",
      "src/background/router.js",
      "src/background/main.js"
    );
  } else if (typeof global.document !== "undefined") {
    // Safari background-page path: classic scripts written into the document
    // execute synchronously in listed order (equivalent to importScripts).
    global.document.write(
      '<script src="' +
        ytdBackgroundModules.join('"><\/script><script src="') +
        '"><\/script>'
    );
  }
})(globalThis);
