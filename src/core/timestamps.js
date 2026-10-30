/**
 * CORE — TIMESTAMP VALIDATION
 *
 * Validates all timestamps in an AI analysis and fixes any that exceed the
 * video duration. This is a safety net to prevent hallucinated timestamps
 * from reaching the UI.
 */

function formatTimestamp(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/**
 * @param {Object} analysis - The parsed analysis from the AI provider
 * @param {number} maxSeconds - Maximum valid timestamp in seconds
 * @returns {Object} - Analysis with validated timestamps
 */
function validateAndFixTimestamps(analysis, maxSeconds) {
  const safeMax =
    Number.isFinite(Number(maxSeconds)) && Number(maxSeconds) > 0
      ? Number(maxSeconds)
      : Number.MAX_SAFE_INTEGER;

  const safeString = (value, maxLength) =>
    typeof value === "string" ? value.trim().slice(0, maxLength) : "";
  const safeSeconds = (value) => {
    const seconds = Number(value);
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > safeMax) {
      return null;
    }
    return Math.floor(seconds);
  };

  const chapters = (Array.isArray(analysis?.chapters) ? analysis.chapters : [])
    .slice(0, 100)
    .map((chapter) => {
      const seconds = safeSeconds(chapter?.timestampSeconds);
      const title = safeString(chapter?.title, 300);
      if (seconds === null || !title) return null;
      return {
        title,
        summary: safeString(chapter?.summary, 6000),
        timestampSeconds: seconds,
        timestamp: formatTimestamp(seconds),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.timestampSeconds - b.timestampSeconds);

  const keyQuotes = (
    Array.isArray(analysis?.keyQuotes) ? analysis.keyQuotes : []
  )
    .slice(0, 50)
    .map((quote) => {
      const seconds = safeSeconds(quote?.timestampSeconds);
      const text = safeString(quote?.quote, 3000);
      if (seconds === null || !text) return null;
      return {
        quote: text,
        timestampSeconds: seconds,
        timestamp: formatTimestamp(seconds),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.timestampSeconds - b.timestampSeconds);

  const keyMoments = (
    Array.isArray(analysis?.keyMoments) ? analysis.keyMoments : []
  )
    .map(safeSeconds)
    .filter((seconds) => seconds !== null)
    .slice(0, 100);

  const result = { chapters, keyQuotes, keyMoments };
  if (analysis?.guide && typeof analysis.guide === "object" && !Array.isArray(analysis.guide)) {
    const list = (value, count) => (Array.isArray(value) ? value : [])
      .slice(0, count).map(item => safeString(item, 1000)).filter(Boolean);
    result.guide = {
      goal: safeString(analysis.guide.goal, 1000),
      takeaways: list(analysis.guide.takeaways, 5),
      workflow: list(analysis.guide.workflow, 8),
      exampleChoices: list(analysis.guide.exampleChoices, 6),
      outcome: safeString(analysis.guide.outcome, 1500),
      uncertainties: list(analysis.guide.uncertainties, 8),
    };
  }
  return result;
}
