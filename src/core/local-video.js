/** Local input boundaries, shared by the background and side panel. */
var LocalVideo = (() => {
  const MAX_TEXT = 300000;
  function parse(input) {
    let url;
    try { url = new URL(String(input).trim()); } catch { throw new Error("请输入完整的 B站或 YouTube 视频链接。"); }
    if (url.protocol !== "https:" || url.username || url.password) throw new Error("仅支持 HTTPS 视频链接。");
    const host = url.hostname;
    if (["www.bilibili.com", "bilibili.com"].includes(host)) {
      const match = url.pathname.match(/^\/video\/(BV[0-9A-Za-z]{10})\/?$/);
      const page = Number(url.searchParams.get("p") || 1);
      if (!match || !Number.isSafeInteger(page) || page < 1 || page > 10000) throw new Error("请使用 B站普通视频完整链接，支持 p 分集参数。");
      return { platform: "bilibili", id: match[1], page, key: `bilibili:${match[1]}:p${page}`, url: `https://www.bilibili.com/video/${match[1]}?p=${page}` };
    }
    if (["www.youtube.com", "youtube.com", "youtu.be"].includes(host)) {
      const id = host === "youtu.be" ? url.pathname.slice(1) : url.pathname === "/watch" ? url.searchParams.get("v") : null;
      if (!/^[A-Za-z0-9_-]{11}$/.test(id || "")) throw new Error("请使用 YouTube 普通视频链接。");
      return { platform: "youtube", id, key: id, url: `https://www.youtube.com/watch?v=${id}` };
    }
    throw new Error("目前支持 B站和 YouTube 完整链接；短链接请先在浏览器打开后复制地址。");
  }
  function result(entries, language = null) {
    if (!Array.isArray(entries) || entries.length > 20000) throw new Error("字幕条数过多或格式错误。");
    const transcript = entries.map(e => ({ text: String(e.text || "").trim(), start: Number(e.start), duration: Number(e.duration || 0), language }))
      .filter(e => e.text);
    if (!transcript.length || transcript.some(e => !Number.isFinite(e.start) || e.start < 0 || !Number.isFinite(e.duration) || e.duration < 0)) throw new Error("字幕为空或时间戳无效。");
    transcript.sort((a,b) => a.start-b.start);
    const transcriptText = transcript.map(e => e.text).join(" ");
    if (transcriptText.length > MAX_TEXT) throw new Error("字幕过长，请拆分为较短内容后导入。");
    const transcriptTextTimestamped = transcript.map(e => {
      const seconds = Math.floor(e.start);
      return `[${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}] ${e.text}`;
    }).join("\n");
    return { success: true, transcript, transcriptText, transcriptTextTimestamped, language };
  }
  function importText(input) {
    const text = String(input || "").replace(/^\uFEFF/, "").replace(/\r/g, "").trim();
    if (!text || text.length > MAX_TEXT) throw new Error("请提供非空字幕，最多 30 万字符。");
    const clock = s => s.replace(",", ".").split(":").reduce((n,v) => n*60+Number(v),0);
    const entries = [];
    const timing = /^((?:\d{2,}:)?\d{2}:\d{2}[.,]\d{3})\s+-->\s+((?:\d{2,}:)?\d{2}:\d{2}[.,]\d{3})(?:\s.*)?$/;
    for (const block of text.split(/\n\s*\n/)) {
      const lines = block.split("\n");
      if (/^(NOTE|STYLE|REGION)(\s|$)/.test(lines[0])) continue;
      const index = lines.findIndex(line => timing.test(line.trim()));
      if (index < 0) { if (lines.some(line => line.includes("-->"))) throw new Error("字幕包含无效时间轴，请检查后重新导入。"); continue; }
      const match = lines[index].trim().match(timing);
      const start = clock(match[1]), end = clock(match[2]);
      entries.push({ start, duration: end-start, text: lines.slice(index+1).join(" ").replace(/<[^>]*>/g, "") });
    }
    if (entries.length) return { ...result(entries), timed: true };
    if (/-->|^WEBVTT/.test(text)) throw new Error("无法识别字幕时间轴，请检查 SRT / VTT 格式。");
    // Plain text has no real timing. Do not invent seekable timestamps.
    return { ...result([{ text, start: 0, duration: 0 }]), timed: false };
  }
  function timestampUrl(input, seconds) {
    if (!input) return "";
    const video = parse(input), url = new URL(video.url);
    url.searchParams.set(video.platform === "bilibili" ? "t" : "t", String(Math.max(0, Math.floor(Number(seconds)||0))));
    return url.href;
  }
  return { parse, result, importText, timestampUrl, MAX_TEXT };
})();
if (typeof module !== "undefined") module.exports = LocalVideo;
