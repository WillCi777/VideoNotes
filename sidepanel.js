/**
 * SIDE PANEL — ENTRY POINT (layer assembler)
 *
 * Loaded LAST by sidepanel.html, after every PANEL module. It contains no
 * feature logic — all of it lives in src/panel/*. This file only exposes the
 * pure helpers used by the repository's Node tests.
 */
(function () {
  "use strict";

  // Pure helpers are exposed for the repository's Node tests. The extension
  // does not read this object at runtime.
  globalThis.__YTD_TRANSCRIPT_TESTING__ = {
    sendTranslationMessage,
    groupTranscriptEntries,
    splitOversizedThought,
    alignTranslatedSegmentBatch,
    renderSubtitleInlineMarkup,
    renderTranscriptSegmentContent,
  };
})();
