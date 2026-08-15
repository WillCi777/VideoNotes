/**
 * BACKGROUND — SIDE PANEL SCOPE
 *
 * Keeps the side panel scoped to YouTube tabs only.
 *
 * Chrome side panels are "global" by default: once opened, the panel follows
 * you to every tab. To make YouTube Digest behave like a YouTube-only tool, we
 * enable the panel on YouTube tabs and disable it everywhere else. Disabling
 * on a tab makes Chrome hide/close the panel for that tab, so it never lingers
 * on a new tab or some other website.
 *
 * We have to react to BOTH things that can change "what tab you're looking at":
 *   - onUpdated: the current tab navigates to a new URL
 *   - onActivated: you switch to (or open) a different tab
 * The original code only handled onUpdated, which is why the panel stayed
 * visible when switching to an already-loaded non-YouTube tab.
 *
 * All side-panel API access goes through src/platform/sidepanel.js so hosts
 * without the Side Panel API (Safari) degrade gracefully.
 */

/**
 * When the user clicks the extension icon, open the side panel (Chrome/Edge)
 * or the panel tab fallback (Safari).
 */
chrome.action.onClicked.addListener((tab) => {
  // Re-enable + open without awaiting — preserves user gesture context
  const opened = ytdOpenSidePanel(tab.id);
  if (!opened) {
    ytdOpenSidePanelFallback().catch(() => {});
  }
});

/**
 * Allow the side panel to open on any page, but it's designed for YouTube.
 */
ytdSetPanelBehavior();

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    try {
      chrome.runtime.openOptionsPage();
    } catch (e) {
      // Hosts without an options_ui surface (some Safari builds) simply skip.
    }
  }
});

function updatePanelForTab(tabId, url) {
  ytdSetPanelForTab(tabId, url);
}

// A tab navigated to a new URL.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!changeInfo.url) return; // ignore title/favicon-only updates
  updatePanelForTab(tabId, changeInfo.url);
});

// The user switched to a different tab (or opened a new one).
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    updatePanelForTab(tabId, tab.url);
  } catch (e) {
    // Tab vanished before we could read it — nothing to do.
  }
});
