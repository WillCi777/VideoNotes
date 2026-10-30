/** The action opens a regular, bookmarkable local reader tab. */
chrome.action.onClicked.addListener((tab) => {
  ytdOpenReader(tab?.url).catch(error => console.error("Reader open failed:", error));
});
// Reset behavior for profiles upgraded from the side-panel version.
if (chrome.sidePanel?.setPanelBehavior) chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") chrome.runtime.openOptionsPage();
});
