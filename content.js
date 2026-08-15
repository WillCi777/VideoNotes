/**
 * CONTENT — ENTRY POINT (layer assembler)
 *
 * Runs LAST, after the CONTENT modules listed in manifest.json have loaded:
 *   src/core/debug.js, src/content/digest-button.js, src/content/note-button.js,
 *   src/content/page.js, src/content/main.js
 *
 * It only triggers init() once the DOM is ready. All feature logic lives in
 * the modules above.
 */
(function () {
  "use strict";

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
