/**
 * PLATFORM — STORAGE ADAPTER
 *
 * Storage helpers that work on Chrome, Edge, and Safari:
 * - `ytdRestrictStorageAccess()` guards the Chrome/Edge-only
 *   `storage.local.setAccessLevel("TRUSTED_CONTEXTS")` call.
 * - `getSettings()` reads and normalizes the shared settings object.
 */

/**
 * Prevent the YouTube content script from reading API keys or cached data.
 * Side panel, options, and service-worker contexts remain trusted.
 * Chrome 102+ / Edge only; silently skipped elsewhere (Safari).
 */
function ytdRestrictStorageAccess() {
  const api = ytdBrowserApi();
  if (
    api.storage?.local &&
    typeof api.storage.local.setAccessLevel === "function"
  ) {
    api.storage.local
      .setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" })
      .catch((error) =>
        console.warn("[VideoNotes] Could not restrict storage access:", error),
      );
  }
}

async function getSettings() {
  const api = ytdBrowserApi();
  const stored = await api.storage.local.get(YTD_SETTINGS.STORAGE_KEY);
  return YTD_SETTINGS.normalize(stored[YTD_SETTINGS.STORAGE_KEY]);
}
