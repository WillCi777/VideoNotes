/**
 * PANEL — VIDEO & TAB FOLLOWING
 *
 * Watches which tab is in front of the panel and reacts:
 *   - Front tab is NOT YouTube -> close the panel in native side-panel mode
 *     (Chrome/Edge). In Safari fallback mode (panel opened as a tab) we keep
 *     the panel open and simply wait for the next digest request.
 *   - Front tab IS YouTube but on a different video -> refresh the digest.
 *
 * Everything is scoped to the window this panel lives in: tab switches in
 * OTHER browser windows must not close this panel or hijack its content.
 */

let navigationRefreshTimer = null;
let panelWindowId = null;
chrome.windows.getCurrent().then((w) => {
  panelWindowId = w.id;
});

function scheduleDigestRefresh() {
  // Small delay lets YouTube finish rendering the new video's title and
  // description before we read them. Also collapses rapid-fire URL events
  // into a single refresh.
  clearTimeout(navigationRefreshTimer);
  navigationRefreshTimer = setTimeout(() => {
    checkCurrentTab();
  }, 600);
}

function panelIsShowingResults() {
  const results = document.getElementById("resultsState");
  return results && results.style.display !== "none";
}

/**
 * Reacts to the URL now in front of the panel: close on non-YouTube,
 * refresh the digest when the video changed.
 */
function handleFrontTabUrl(url) {
  // Keep pasted/imported results visible across navigation. Explicit start only.
}

/**
 * Locates the YouTube tab this panel should serve and loads its digest.
 */
async function checkCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const input = document.getElementById("localVideoUrl");
  try {
    const video = LocalVideo.parse(tabs[0]?.url);
    if (input) input.value = video.url;
  } catch { /* Input remains available on any website. */ }
}

// ============================================================
// TIMESTAMP / SEEK
// ============================================================

async function seekTo(seconds) {
  const time = Number(seconds);
  if (!Number.isFinite(time) || time < 0) return;
  try { await localPlayback(time); } catch (error) { localStatus(error.message); }
}

async function highlightMomentsOnPage(moments) {
  if (!moments || !moments.length) return;

  try {
    // Route through background script for reliable message passing
    await chrome.runtime.sendMessage({
      action: "relayToContent",
      payload: {
        action: "highlightMoments",
        moments: moments,
        videoDuration: currentVideoDuration,
      },
    });
  } catch (error) {
    console.error("Highlight error:", error);
  }
}
