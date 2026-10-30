/**
 * PANEL — SUMMARY & MINDMAP
 *
 * One-click export of the digest as a Markdown summary, plus a mindmap
 * viewer built from the chapters (rendered as a tree with copy/download of
 * the Mermaid source and an XMind-compatible outline). Document generation
 * is pure logic in src/core/summary.js; this module only handles the UI.
 */

function summaryVideoUrl() {
  return currentVideoId
    ? (currentVideoUrl || "")
    : "";
}

/**
 * Ensures the AI analysis exists, lazily triggering it when the user exports
 * before opening the Overview tab.
 */
async function ensureAnalysis() {
  if (currentAnalysis) return currentAnalysis;
  await triggerAnalysis();
  return currentAnalysis;
}

function summaryMeta() {
  return {
    title: currentVideoTitle,
    channelName: currentChannelName,
    description: currentVideoDescription,
    videoUrl: summaryVideoUrl(),
    guide: currentAnalysis?.guide,
    chapters: currentAnalysis?.chapters || [],
    keyQuotes: currentAnalysis?.keyQuotes || [],
  };
}

async function exportMarkdownSummary() {
  const analysis = await ensureAnalysis();
  if (!analysis) {
    showError(
      "No analysis yet",
      "Open the Overview tab once so chapters and quotes can be generated.",
    );
    return;
  }
  const markdown = buildMarkdownSummary(summaryMeta());
  const filename = `${sanitizeFilename(currentVideoTitle) || "video"}-summary.md`;
  downloadTextFile(markdown, filename);
}

function renderMindmapTree(container, chapters, title) {
  const root = document.createElement("ul");
  root.className = "mindmap-tree";

  const rootItem = document.createElement("li");
  rootItem.className = "mindmap-root";
  rootItem.textContent = title || "Video";
  root.appendChild(rootItem);

  (chapters || []).forEach((chapter) => {
    const node = document.createElement("li");
    node.className = "mindmap-node";
    node.textContent = `${chapter.timestamp || ""} ${chapter.title || ""}`.trim();

    const summary = (chapter.summary || "").trim();
    if (summary) {
      const sub = document.createElement("ul");
      const leaf = document.createElement("li");
      leaf.className = "mindmap-leaf";
      leaf.textContent = summary.length > 120 ? `${summary.slice(0, 120)}…` : summary;
      sub.appendChild(leaf);
      node.appendChild(sub);
    }
    root.appendChild(node);
  });

  container.appendChild(root);
}

async function showMindmapModal() {
  const analysis = await ensureAnalysis();
  const chapters = analysis?.chapters || [];
  if (chapters.length === 0) {
    showError(
      "No chapters yet",
      "Open the Overview tab once so chapters can be generated.",
    );
    return;
  }

  const existing = document.getElementById("mindmapModal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "mindmapModal";
  modal.className = "explain-modal-overlay";
  modal.innerHTML = `
    <div class="explain-modal mindmap-modal">
      <div class="explain-modal-header">
        <div class="explain-modal-title">思维导图</div>
        <button class="explain-modal-close" id="closeMindmap">✕</button>
      </div>
      <div class="mindmap-content" id="mindmapContent"></div>
      <div class="mindmap-actions">
        <button id="copyMindmapBtn" type="button">复制 Mermaid</button>
        <button id="downloadOutlineBtn" type="button">下载大纲 (.md)</button>
      </div>
      <div id="mindmapStatus" role="status" aria-live="polite"></div>
    </div>
  `;
  document.body.appendChild(modal);

  renderMindmapTree(
    document.getElementById("mindmapContent"),
    chapters,
    currentVideoTitle,
  );

  document.getElementById("closeMindmap").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  document.getElementById("copyMindmapBtn").addEventListener("click", async () => {
    const source = buildMindmapMarkdown(summaryMeta());
    const status = document.getElementById("mindmapStatus");
    try {
      await navigator.clipboard.writeText(source);
      status.textContent = "已复制 Mermaid 代码";
    } catch (error) {
      status.textContent = "复制失败，请手动选择复制";
    }
  });

  document.getElementById("downloadOutlineBtn").addEventListener("click", () => {
    const outline = buildOutlineMarkdown(summaryMeta());
    const filename = `${sanitizeFilename(currentVideoTitle) || "video"}-outline.md`;
    downloadTextFile(outline, filename);
    const status = document.getElementById("mindmapStatus");
    if (status) status.textContent = "大纲已下载";
  });
}
