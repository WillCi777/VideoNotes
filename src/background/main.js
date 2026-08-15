/**
 * BACKGROUND — MAIN WIRING
 *
 * Runs last, after every background module has been loaded. Handles one-time
 * startup concerns and exposes the pure helpers used by the repository's
 * Node tests.
 */

// Prevent the YouTube content script from reading API keys or cached data.
// Side panel, options, and service-worker contexts remain trusted.
// Chrome/Edge only; skipped automatically on hosts without the API (Safari).
ytdRestrictStorageAccess();

// Pure validators are exposed for the repository's Node tests only.
globalThis.__YTD_TRANSLATION_TESTING__ = {
  requestAiCompletion,
  callAiTranslation,
  validateTranscriptBatchRequest,
  normalizeTranslatedSegmentBatch,
  handleTranslateContent,
  handleChatMessage,
};
