/** Bilibili adapter. No cookie export, no proxy and no access-control bypass. */
async function localFetchJson(input, authenticated = false) {
  const url = new URL(input);
  const allowed = url.hostname === "api.bilibili.com" || url.hostname === "aisubtitle.hdslb.com" || url.hostname === "i0.hdslb.com";
  if (url.protocol !== "https:" || !allowed || url.username || url.password) throw new Error("字幕地址不在允许的服务范围内。");
  const response = await fetch(url.href, { credentials: authenticated ? "include" : "omit", redirect: "error", signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`B站请求失败 (${response.status})，可改用字幕导入。`);
  const reader = response.body.getReader();
  let size = 0, text = "";
  const decoder = new TextDecoder();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 2*1024*1024) { await reader.cancel(); throw new Error("字幕响应过大。"); }
    text += decoder.decode(value, { stream: true });
  }
  return JSON.parse(text + decoder.decode());
}
async function handleLocalTranscript(input) {
  try {
    const video = LocalVideo.parse(input);
    if (video.platform === "youtube") return await handleFetchTranscript(video.id);
    const detail = await localFetchJson(`https://api.bilibili.com/x/web-interface/view?bvid=${video.id}`, true);
    if (detail.code !== 0) throw new Error("无法获取视频信息，请检查链接或在浏览器登录 B站后重试。");
    const data = detail.data, page = data.pages?.find(p => p.page === video.page);
    if (!page || !Number.isSafeInteger(page.cid) || !Number.isSafeInteger(data.aid)) throw new Error("找不到该分 P，请检查链接。");
    const nav = await localFetchJson("https://api.bilibili.com/x/web-interface/nav", true);
    const images = nav.data?.wbi_img;
    if (!images?.img_url || !images?.sub_url) throw new Error("无法获取 B站请求参数，请登录后重试或导入字幕。");
    const query = BiliWbi.sign({ aid: data.aid, cid: page.cid }, images.img_url, images.sub_url);
    const player = await localFetchJson(`https://api.bilibili.com/x/player/wbi/v2?${query}`, true);
    if (player.code !== 0) throw new Error("B站字幕接口不可用或需要验证，请导入字幕；本版本不会绕过访问限制。");
    if ((player.data?.cid && Number(player.data.cid) !== page.cid) || (player.data?.bvid && player.data.bvid !== video.id)) throw new Error("字幕与当前视频不匹配，已停止处理。");
    const tracks = player.data?.subtitle?.subtitles || [];
    const track = tracks.find(t => /^zh/.test(t.lan)) || tracks[0];
    if (!track?.subtitle_url) throw new Error("没有可获取的字幕。可先登录 B站重试，或导入 SRT / VTT / TXT；暂不支持音频转写。");
    const subtitles = await localFetchJson(new URL(track.subtitle_url, "https://api.bilibili.com").href);
    if (!Array.isArray(subtitles.body)) throw new Error("字幕格式不正确。");
    return { ...LocalVideo.result(subtitles.body.map(e => ({ text: e.content, start: e.from, duration: e.to-e.from })), track.lan),
      source: "bilibili", timed: true,
      metadata: { title: data.pages.length > 1 ? `${data.title} · P${video.page} ${page.part}` : data.title, channelName: data.owner?.name || "", description: data.desc || "", duration: page.duration || data.duration || 0 } };
  } catch (error) { return { success: false, error: error.message }; }
}
