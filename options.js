/**
 * OPTIONS — ENTRY POINT (layer assembler)
 *
 * Loaded LAST by options.html, after settings.js and the OPTIONS modules:
 *   src/options/i18n.js, src/options/storage.js, src/options/main.js
 *
 * In the browser it assembles the YTD_OPTIONS API from the global namespace
 * and boots the page. In Node (repository tests) it assembles the same API
 * from the CommonJS exports so `require("../options.js")` keeps working.
 */
(function (global) {
  "use strict";

  var YTD_OPTIONS = {};

  if (typeof module !== "undefined" && module.exports) {
    // Node (repository tests): assemble from the CommonJS modules.
    YTD_OPTIONS = Object.assign(
      {},
      require("./src/options/i18n.js"),
      require("./src/options/storage.js"),
      require("./src/options/main.js"),
    );
    module.exports = YTD_OPTIONS;
    return;
  }

  // Browser: the OPTIONS modules have populated global.YTD.options.
  var modules = global.YTD && global.YTD.options;
  if (modules) {
    Object.assign(YTD_OPTIONS, modules.i18n, modules.storage, modules.main);
  }
  global.YTD_OPTIONS = YTD_OPTIONS;

  if (typeof document !== "undefined") {
    YTD_OPTIONS.initialize();
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
