/** Explicit local jobs. Never automatically replace pasted/imported content. */
let localGeneration = 0;
let localBusy = false;
let localTimed = true;
let localSourceLabel = "平台字幕";

function localStatus(text) { document.getElementById("localStatus").textContent = text; }
function resetLocalDigest(key, url, metadata = {}) {
  localGeneration++;
  resetVideoDiscussion();
  translationGeneration++;
  transcriptScrollObserver?.disconnect();
  transcriptScrollObserver = null;
  transcriptParagraphCache.clear();
  stopPlaybackTracking();
  currentVideoId = key;
  currentVideoUrl = url || "";
  currentVideoTitle = metadata.title || "视频资料";
  currentChannelName = metadata.channelName || "";
  currentVideoDescription = metadata.description || "";
  currentTranscriptMode = "original";
  document.querySelectorAll(".transcript-mode-btn").forEach(b => { b.classList.toggle("active", b.dataset.transcriptMode === "original"); b.setAttribute("aria-pressed", String(b.dataset.transcriptMode === "original")); });
  currentVideoDuration = Number(metadata.duration) || 0;
  currentTranscript = null;
  currentAnalysis = null;
  currentTranscriptText = null;
  currentTranscriptTimestamped = null;
  currentTranscriptLanguage = null;
  isAnalysisLoading = false;
  youtubeTabId = null;
  const source = document.getElementById("readerSource");
  source.hidden = !url;
  source.textContent = url || "";
  if (url) source.href = LocalVideo.parse(url).url;
  else source.removeAttribute("href");
  const location = new URL(window.location.href);
  location.hash = url ? new URLSearchParams({ video: url }).toString() : "";
  window.history.replaceState(null, "", location.href);
}
async function displayLocalTranscript(data, generate = true) {
  currentTranscript = data.transcript;
  currentTranscriptText = data.transcriptText;
  currentTranscriptTimestamped = data.transcriptTextTimestamped || data.transcriptTimestamped;
  currentTranscriptLanguage = data.language || data.transcriptLanguage || null;
  currentAnalysis = data.analysis || null;
  localTimed = data.timed !== false;
  localSourceLabel = data.source || "平台字幕";
  restoreVideoDiscussion(data.discussion);
  document.getElementById("videoTitle").textContent = currentVideoTitle;
  document.getElementById("videoChannel").textContent = currentChannelName;
  document.getElementById("videoInfo").style.display = "block";
  renderTranscript();
  showState("results");
  setupExplainFeature();
  document.title = `${currentVideoTitle} · 视频总结`;
  if (currentAnalysis) renderAnalysisResults(currentAnalysis);
  // Original subtitle mode avoids unwanted translation charges on every import.
  switchTab("overview", true);
  if (!currentAnalysis && generate) await triggerAnalysis();
  const saved = await saveToCache(currentVideoId);
  await refreshLocalHistory();
  if (saved) {
    const location = new URL(window.location.href);
    location.hash = new URLSearchParams({ record: currentVideoId, ...(currentVideoUrl ? { video: currentVideoUrl } : {}) }).toString();
    window.history.replaceState(null, "", location.href);
  }
  if (!saved) { localStatus("内容已处理，但本地保存失败；请立即导出，并在设置中清理存储空间。"); return; }
  localStatus(!currentAnalysis ? "文字稿已保存。总结尚未成功，请检查 AI 设置，再点击“总结”重试。" : localTimed ? "总结已在下方展开，并自动保存到本机。" : "总结已生成。导入文字没有真实时间轴，无法跳转播放器。");
}
async function localJob(job) {
  if (localBusy || isAnalysisLoading || discussionBusy) { localStatus("请等待当前任务完成后再开始。页面需保持打开。"); return; }
  localBusy = true;
  document.querySelectorAll(".local-entry button").forEach(b => b.disabled = true);
  try { await job(); }
  catch (error) { localStatus(error.message || "处理失败，请重试或导入字幕。"); showError("处理未完成", error.message); }
  finally { localBusy = false; document.querySelectorAll(".local-entry button").forEach(b => b.disabled = false); }
}
async function openLocalLink() {
  return localJob(async () => {
    const video = LocalVideo.parse(document.getElementById("localVideoUrl").value);
    const cached = await loadFromCache(video.key);
    resetLocalDigest(video.key, video.url, cached ? { title: cached.videoTitle, channelName: cached.channelName, duration: cached.videoDuration, description: cached.videoDescription } : { title: video.platform === "bilibili" ? video.id : "YouTube 视频" });
    if (cached) { await displayLocalTranscript(cached); return; }
    showState("loading");
    updateLoading("正在获取字幕", "B站可尝试先登录；若无字幕，可使用导入功能。");
    localStatus("正在获取字幕，请保持此页面打开。");
    const data = await chrome.runtime.sendMessage({ action: "localFetchTranscript", url: video.url });
    if (!data?.success) throw new Error(data?.message || data?.error || "无法获取字幕。");
    if (data.metadata) {
      currentVideoTitle = data.metadata.title;
      currentChannelName = data.metadata.channelName;
      currentVideoDescription = data.metadata.description;
      currentVideoDuration = data.metadata.duration;
    } else if (video.platform === "youtube") {
      const tabs = await matchingLocalTabs();
      if (tabs[0]) {
        try {
          const info = await chrome.tabs.sendMessage(tabs[0].id, { action: "getVideoInfo" });
          currentVideoTitle = info.title || currentVideoTitle;
          currentChannelName = info.channelName || "";
          currentVideoDescription = info.description || "";
          currentVideoDuration = info.duration || 0;
        } catch { /* Pasted URL need not be open in a tab. */ }
      }
    }
    await displayLocalTranscript({ ...data, source: video.platform === "bilibili" ? "B站字幕" : "YouTube 字幕", timed: true });
  });
}
async function importLocalText() {
  return localJob(async () => {
    const file = document.getElementById("localFile").files[0];
    if (file && (file.size > 1024*1024 || !/\.(srt|vtt|txt)$/i.test(file.name))) throw new Error("请选择 1 MiB 以内的 SRT / VTT / TXT 文件。");
    const data = LocalVideo.importText(file ? await file.text() : document.getElementById("localText").value);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data.transcriptTextTimestamped));
    const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,"0")).join("");
    // Imports are separate records, never silently overwrite a platform transcript.
    resetLocalDigest(`import:${hash}`, "", { title: document.getElementById("localTitle").value.trim() || file?.name || "导入文字", duration: Math.max(...data.transcript.map(e => e.start + e.duration)) });
    await displayLocalTranscript({ ...data, source: data.timed ? "导入字幕" : "导入文字（无时间轴）" });
  });
}
async function refreshLocalHistory() {
  const container = document.getElementById("localHistory");
  if (!container) return;
  const stored = await chrome.storage.local.get(null);
  container.replaceChildren();
  const entries = Object.entries(stored).filter(([k]) => k.startsWith("digest_")).sort((a,b) => b[1].timestamp-a[1].timestamp).slice(0,20);
  if (!entries.length) container.textContent = "暂无历史记录。";
  for (const [key, data] of entries) {
    const row = document.createElement("div"); row.className = "local-history-row";
    const open = document.createElement("button"); open.type = "button";
    open.textContent = `${data.videoTitle || "视频资料"} · ${new Date(data.timestamp).toLocaleDateString()}`;
    open.addEventListener("click", () => localJob(async () => {
      const fresh = await loadFromCache(key.slice(7));
      if (!fresh) { await refreshLocalHistory(); throw new Error("记录已过期或删除。"); }
      resetLocalDigest(key.slice(7), fresh.videoUrl || "", { title: fresh.videoTitle, channelName: fresh.channelName, duration: fresh.videoDuration, description: fresh.videoDescription });
      await displayLocalTranscript(fresh, false);
    }));
    const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "删除";
    remove.addEventListener("click", () => localJob(async () => { await chrome.storage.local.remove(key); if (key === `digest_${currentVideoId}`) { resetLocalDigest(null, ""); showState("welcome"); } await refreshLocalHistory(); }));
    row.append(open, remove); container.append(row);
  }
}
async function matchingLocalTabs() {
  if (!currentVideoUrl) return [];
  const video = LocalVideo.parse(currentVideoUrl);
  const tabs = await chrome.tabs.query({ url: video.platform === "bilibili" ? "https://www.bilibili.com/*" : "https://www.youtube.com/*" });
  return tabs.filter(tab => { try { return LocalVideo.parse(tab.url).key === video.key; } catch { return false; } });
}
async function localPlayback(seconds) {
  if (!localTimed || !currentVideoUrl) { localStatus("此导入资料未关联播放器，或没有真实时间轴。"); return null; }
  const video = LocalVideo.parse(currentVideoUrl);
  const tabs = await matchingLocalTabs();
  if (!tabs.length) {
    if (seconds !== undefined) await chrome.tabs.create({ url: LocalVideo.timestampUrl(video.url, seconds) });
    return null;
  }
  if (video.platform === "youtube") {
    return chrome.tabs.sendMessage(tabs[0].id, seconds === undefined ? { action: "getCurrentTime" } : { action: "seekTo", seconds });
  }
  const results = await chrome.scripting.executeScript({ target: { tabId: tabs[0].id }, func: (time) => {
    const player = document.querySelector("video");
    if (!player) return null;
    if (time !== null) { player.currentTime = time; player.play().catch(() => {}); }
    return { currentTime: player.currentTime, paused: player.paused };
  }, args: [seconds === undefined ? null : seconds] });
  return results[0]?.result;
}
async function restoreLocalLocation() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const key = params.get("record");
  if (key) {
    const data = await loadFromCache(key);
    if (data) {
      await localJob(async () => {
        resetLocalDigest(key, data.videoUrl || "", { title: data.videoTitle, channelName: data.channelName, duration: data.videoDuration, description: data.videoDescription });
        if (data.videoUrl) document.getElementById("localVideoUrl").value = data.videoUrl;
        await displayLocalTranscript(data, false);
      });
      return true;
    }
    localStatus("这份本地记录已删除或过期，请重新生成或导入。");
    if (params.get("video")) {
      try { document.getElementById("localVideoUrl").value = LocalVideo.parse(params.get("video")).url; } catch {}
    }
    return true;
  }
  const input = params.get("video") || params.get("source");
  if (input) {
    try { document.getElementById("localVideoUrl").value = LocalVideo.parse(input).url; }
    catch (error) { localStatus(error.message); return false; }
    if (params.has("video")) { await openLocalLink(); return true; }
    return true;
  }
  return false;
}

function setupLocalDigest() {
  document.getElementById("regenerateAnalysisBtn").addEventListener("click", () => localJob(async () => {
    if (!currentTranscriptTimestamped) throw new Error("请先获取或导入字幕。");
    localStatus("正在根据现有字幕提取细节，将调用 AI；无需重新获取字幕。");
    await triggerAnalysis(true);
    await refreshLocalHistory();
  }));
  document.getElementById("localLinkForm").addEventListener("submit", e => { e.preventDefault(); openLocalLink(); });
  document.getElementById("localCurrentTab").addEventListener("click", () => checkCurrentTab().catch(e => localStatus(e.message)));
  document.getElementById("localImport").addEventListener("click", importLocalText);
  document.getElementById("localClearHistory").addEventListener("click", () => localJob(async () => {
    const stored = await chrome.storage.local.get(null);
    await chrome.storage.local.remove(Object.keys(stored).filter(k => k.startsWith("digest_")));
    resetLocalDigest(null, ""); showState("welcome");
    await refreshLocalHistory(); localStatus("历史已清空；API 设置和独立笔记未删除。");
  }));
  refreshLocalHistory().catch(e => localStatus(e.message));
}
