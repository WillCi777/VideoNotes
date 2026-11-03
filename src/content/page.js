/**
 * CONTENT — PAGE READING & PLAYBACK
 *
 * Reads video metadata from the YouTube DOM and controls the <video> element
 * (seek / current time) on behalf of the side panel.
 */

/**
 * Reads the video title, channel name, and description directly from YouTube's
 * page. These are just sitting in the HTML — we grab them from the DOM elements.
 */
function extractVideoInfo() {
  // The video title is in an h1 element inside the #title container
  const titleElement = document.querySelector(
    "h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string",
  );

  // The channel name is in the channel info section
  const channelElement = document.querySelector(
    "#channel-name yt-formatted-string a, ytd-channel-name yt-formatted-string a",
  );

  // Video duration from the video element
  const videoElement = document.querySelector("video.html5-main-video");

  // Video description — YouTube has this in a few possible places
  const descriptionElement = document.querySelector(
    "#description-inner, " +
      "ytd-watch-metadata #description yt-attributed-string, " +
      "#description yt-formatted-string, " +
      "ytd-expander#description yt-attributed-string",
  );

  return {
    title: titleElement?.textContent?.trim() || "",
    channelName: channelElement?.textContent?.trim() || "",
    duration: videoElement?.duration || 0,
    description: descriptionElement?.textContent?.trim() || "",
  };
}

/**
 * Jumps the YouTube video to a specific timestamp (in seconds).
 * This is called when the user clicks a timestamp in the side panel.
 *
 * We simply set the video element's .currentTime property,
 * which is the standard HTML5 way to seek in a video.
 */
function seekToTimestamp(seconds) {
  const video = document.querySelector("video.html5-main-video");
  if (!video) {
    console.error("[VideoNotes Content] No video element found for seek");
    return;
  }

  debugLog("[VideoNotes Content] Seeking to:", seconds);
  video.currentTime = seconds;
  // Also play the video if it's paused
  if (video.paused) {
    video.play().catch(() => {}); // Ignore autoplay errors
  }
}

/**
 * Reads the current playback time and paused state from the <video> element.
 */
function getCurrentVideoTime() {
  const video = document.querySelector("video.html5-main-video");
  return {
    currentTime: video ? Math.floor(video.currentTime) : 0,
    paused: video ? video.paused : true,
  };
}

/**
 * Adds colored marker dots to YouTube's video progress bar
 * at the positions of key moments identified by the AI provider.
 *
 * Disabled: no timeline markers. Chapters live only in the side panel.
 */
function highlightKeyMoments(moments, videoDuration) {
  return;
}
