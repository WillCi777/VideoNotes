/**
 * CORE — MARKUP HELPERS
 *
 * HTML escaping plus the small allowlisted inline-markup renderer used by the
 * transcript views. Everything is escaped first; only exact, attribute-free
 * allowlisted tags are restored as markup afterwards.
 */

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

function renderSubtitleInlineMarkup(text) {
  return escapeHtml(text).replace(
    /&lt;(\/?)(i|em|b|strong|u)&gt;|&lt;br(?:\s*\/)?&gt;/gi,
    (_match, closing, tagName) =>
      tagName ? `<${closing}${tagName.toLowerCase()}>` : "<br>",
  );
}
