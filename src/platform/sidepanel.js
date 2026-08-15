/**
 * PLATFORM — SIDE PANEL ADAPTER
 *
 * Wraps the Chrome/Edge Side Panel API behind one adapter. On browsers
 * without `chrome.sidePanel` (Safari), the adapter reports `false` from
 * `ytdOpenSidePanel()` and callers fall back to opening the panel page in a
 * regular tab via `ytdOpenSidePanelFallback()`.
 *
 * Gesture preservation is important: `setOptions` followed by `open` must
 * run synchronously inside a user gesture, which `ytdOpenSidePanel` does.
 */

/**
 * Enables and opens the side panel for a tab (Chrome/Edge only).
 * Returns true when the native side panel was opened, false when the host
 * lacks the API (callers should use the tab fallback).
 */
function ytdOpenSidePanel(tabId) {
  if (!ytdSupportsSidePanel()) return false;
  const api = ytdBrowserApi();
  api.sidePanel.setOptions({
    tabId,
    path: "sidepanel.html",
    enabled: true,
  });
  api.sidePanel.open({ tabId });
  return true;
}

/**
 * Safari fallback: open sidepanel.html in a new tab. The panel page detects
 * this mode and keeps following the active YouTube tab instead of closing
 * itself on non-YouTube pages.
 */
function ytdOpenSidePanelFallback() {
  return ytdBrowserApi().tabs.create({ url: "sidepanel.html" });
}

/**
 * Enables the side panel only on YouTube tabs (Chrome/Edge only). No-op on
 * hosts without the API.
 */
function ytdSetPanelForTab(tabId, url) {
  if (!ytdSupportsSidePanel()) return;
  const isYouTube = (url || "").startsWith("https://www.youtube.com");
  // setOptions can reject if the tab just closed — ignore that harmlessly.
  ytdBrowserApi()
    .sidePanel.setOptions({ tabId, path: "sidepanel.html", enabled: isYouTube })
    .catch(() => {});
}

/**
 * Allows the side panel to open on any page (Chrome/Edge only). No-op on
 * hosts without the API.
 */
function ytdSetPanelBehavior() {
  const api = ytdBrowserApi();
  if (api.sidePanel && typeof api.sidePanel.setPanelBehavior === "function") {
    api.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
}
