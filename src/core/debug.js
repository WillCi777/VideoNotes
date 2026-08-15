/**
 * CORE — DEBUG
 *
 * Shared debug flag and logger. This is the FIRST module loaded in every
 * extension context (background, content, side panel, options), so all other
 * modules can rely on `debugLog` being defined.
 *
 * Declared with `var` + a plain function so no classic-script context can
 * accidentally redeclare it; both are also safe across repeated script loads.
 */
var YTD_DEBUG = false;

function debugLog() {
  if (YTD_DEBUG) console.log.apply(console, arguments);
}
