/**
 * CORE — URL HELPERS
 *
 * Framework-agnostic URL parsing shared by the side panel (and any future
 * context that needs to turn a YouTube URL into a stable video ID).
 */
function extractVideoId(url) {
  try {
    const urlObj = new URL(url);

    if (
      ["youtube.com", "www.youtube.com"].includes(urlObj.hostname) &&
      urlObj.searchParams.has("v")
    ) {
      return urlObj.searchParams.get("v");
    }

    if (urlObj.hostname === "youtu.be") {
      return urlObj.pathname.slice(1);
    }

    if (["youtube.com", "www.youtube.com"].includes(urlObj.hostname) && urlObj.pathname.startsWith("/embed/")) {
      return urlObj.pathname.split("/")[2];
    }

    return null;
  } catch {
    return null;
  }
}
