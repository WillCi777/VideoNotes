/** Bounded, role-safe video discussion context. */
var VideoDiscussion = (() => {
  const MAX_TRANSCRIPT = 80000;
  function messages(input) {
    return (Array.isArray(input) ? input : []).filter(m => ['user','assistant'].includes(m?.role) && typeof m.content === 'string').slice(-12).map(m => ({ role:m.role, content:m.content.slice(0,4000) }));
  }
  function context(transcript, question, revision = false) {
    if (typeof transcript !== 'string' || !transcript.trim() || transcript.length > 400000) throw new Error('字幕为空或过长，请分段导入。');
    if (transcript.length <= MAX_TRANSCRIPT) return { text:transcript, mode:'full' };
    if (revision) throw new Error('字幕过长，本版无法可靠生成整篇修订稿；请分段导入后修订。当前笔记未修改。');
    const chunks = transcript.match(/[\s\S]{1,1800}/g) || [];
    const tokens = [...new Set((String(question).toLowerCase().match(/[a-z0-9_]{2,}|[\u4e00-\u9fff]{2,}/g)||[]).flatMap(token => /^[\u4e00-\u9fff]+$/.test(token) ? Array.from({length:token.length-1},(_,i)=>token.slice(i,i+2)) : [token]))].slice(0,100);
    const ranked = chunks.map((text,index)=>({text,index,score:tokens.reduce((n,t)=>n+(text.toLowerCase().includes(t)?1:0),0)})).sort((a,b)=>b.score-a.score||a.index-b.index);
    const indices = new Set([0,chunks.length-1]);
    ranked.slice(0,20).forEach(c=>indices.add(c.index));
    return {text:[...indices].sort((a,b)=>a-b).map(i=>`【字幕片段 ${i+1}/${chunks.length}】\n${chunks[i]}`).join('\n\n'),mode:'excerpt'};
  }
  return { messages, context, MAX_TRANSCRIPT };
})();
if (typeof module !== 'undefined') module.exports = VideoDiscussion;
