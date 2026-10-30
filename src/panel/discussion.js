/** Video-specific discussion is stored inside the same local history record. */
let discussionBusy = false;
let currentDiscussion = {messages:[],draft:null,previous:null,draftBase:null};
function discussionStatus(text) {document.getElementById('discussionStatus').textContent=text;}
function resetVideoDiscussion() {
  currentDiscussion={messages:[],draft:null,previous:null,draftBase:null};
  if(document.getElementById('discussionMessages')) {
    document.getElementById('discussionInput').value='';
    discussionStatus('先加载视频字幕或导入文字，再开始讨论。');
    renderVideoDiscussion();
  }
}
function restoreVideoDiscussion(data) {
  currentDiscussion = {
    messages:(Array.isArray(data?.messages)?data.messages:[]).filter(m=>['user','assistant'].includes(m?.role)&&typeof m.content==='string').slice(-40).map(m=>({role:m.role,content:m.content.slice(0,8000)})),
    draft:data?.draft||null,previous:data?.previous||null,draftBase:typeof data?.draftBase==='string'?data.draftBase:null,
  };
  renderVideoDiscussion();
  discussionStatus('当前视频的对话会随本地历史保存；普通提问不会修改笔记。');
}
function renderVideoDiscussion() {
  const container=document.getElementById('discussionMessages');
  if(!container)return;
  container.replaceChildren();
  if(!currentDiscussion.messages.length) {const p=document.createElement('p');p.className='discussion-hint';p.textContent='可以问：核心方法是什么？哪些步骤需要补充？这个结论的字幕依据在哪里？';container.append(p);}
  const stamps = new Set((currentTranscriptTimestamped||'').match(/\[\d+:\d{2}\]/g)||[]);
  currentDiscussion.messages.forEach(message=>{
    const bubble=document.createElement('div');bubble.className=`discussion-message ${message.role}`;
    const label=document.createElement('strong');label.textContent=message.role==='user'?'你':'AI';bubble.append(label);
    const body=document.createElement('div');
    // Only exact source timestamps become clickable, never arbitrary model URLs.
    for(const part of message.content.split(/(\[\d+:\d{2}\])/)) {
      if(message.role==='assistant'&&localTimed&&stamps.has(part)) {
        const button=document.createElement('button');button.type='button';button.className='discussion-citation';button.textContent=part;
        button.addEventListener('click',()=>{const [m,s]=part.slice(1,-1).split(':').map(Number);seekTo(m*60+s);});body.append(button);
      } else body.append(document.createTextNode(part));
    }
    bubble.append(body);container.append(bubble);
  });
  container.scrollTop=container.scrollHeight;
  const draft=document.getElementById('discussionDraft');draft.hidden=!currentDiscussion.draft;
  document.getElementById('discussionUndo').hidden=!currentDiscussion.previous;
  if(currentDiscussion.draft)document.getElementById('discussionPreview').textContent=buildMarkdownSummary({title:currentVideoTitle,videoUrl:currentVideoUrl,...currentDiscussion.draft});
}
async function sendVideoDiscussion(revise=false) {
  if(discussionBusy||localBusy||isAnalysisLoading) {discussionStatus('请等待当前任务完成。');return;}
  if(!currentVideoId||!currentTranscriptTimestamped) {discussionStatus('请先加载视频或导入文字。');return;}
  const input=document.getElementById('discussionInput');
  const text=input.value.trim();
  if(!text&&!revise) {discussionStatus('请输入问题。');return;}
  const generation=localGeneration;
  discussionBusy=true;
  document.querySelectorAll('#videoDiscussion button').forEach(b=>b.disabled=true);
  try {
    if(text)currentDiscussion.messages.push({role:'user',content:text});
    else currentDiscussion.messages.push({role:'user',content:'请根据以上讨论修订完整笔记，保留有字幕依据的内容，区分可复用方法和示例选择。'});
    currentDiscussion.messages=currentDiscussion.messages.slice(-40);
    input.value='';renderVideoDiscussion();
    await saveToCache(currentVideoId);
    discussionStatus(revise?'正在生成修订稿，原笔记保持不变……':'正在结合字幕与当前笔记回答……');
    const result=await sendTranslationMessage({action:'videoDiscussion',mode:revise?'revise':'chat',messages:currentDiscussion.messages,title:currentVideoTitle,transcript:currentTranscriptTimestamped,analysis:currentAnalysis,duration:currentVideoDuration,timed:localTimed});
    if(generation!==localGeneration)return;
    if(!result?.success)throw new Error(result?.error||'AI 未返回结果。');
    if(revise) {
      currentDiscussion.draft=result.analysis;
      currentDiscussion.draftBase=JSON.stringify(currentAnalysis);
    } else currentDiscussion.messages.push({role:'assistant',content:String(result.reply).slice(0,8000)});
    currentDiscussion.messages=currentDiscussion.messages.slice(-40);
    const saved=await saveToCache(currentVideoId);
    renderVideoDiscussion();
    discussionStatus(!saved?'已生成，但本地保存失败；请复制保留结果。':revise?'修订稿已生成，请预览后点击“应用到笔记”。':result.contextMode==='excerpt'?'已回答。本次字幕过长，仅使用相关片段和当前笔记，未核对全文。':'已回答，依据为本视频完整字幕及当前笔记。');
    await refreshLocalHistory();
  } catch(error) {discussionStatus(`处理失败：${error.message}。当前笔记未修改，可重新输入问题再试。`);}
  finally {discussionBusy=false;document.querySelectorAll('#videoDiscussion button').forEach(b=>b.disabled=false);}
}
async function changeDiscussionRevision(action) {
  if(discussionBusy||localBusy||isAnalysisLoading)return;
  if(!currentVideoId)return;
  const oldDiscussion=JSON.parse(JSON.stringify(currentDiscussion)),oldAnalysis=currentAnalysis;
  discussionBusy=true;
  try {
    if(action==='apply') {
      if(!currentDiscussion.draft)return;
      if(currentDiscussion.draftBase!==JSON.stringify(currentAnalysis))throw new Error('笔记已经变化，请重新生成修订稿。');
      currentDiscussion.previous=currentAnalysis;
      currentAnalysis=currentDiscussion.draft;
      currentDiscussion.draft=null;currentDiscussion.draftBase=null;
    } else if(action==='undo') {
      if(!currentDiscussion.previous)return;
      currentAnalysis=currentDiscussion.previous;
      currentDiscussion.previous=null;currentDiscussion.draft=null;currentDiscussion.draftBase=null;
    } else {currentDiscussion.draft=null;currentDiscussion.draftBase=null;}
    if(!await saveToCache(currentVideoId))throw new Error('本地保存失败，未替换笔记。');
    if(currentAnalysis)renderAnalysisResults(currentAnalysis);
    renderVideoDiscussion();await refreshLocalHistory();
    discussionStatus(action==='apply'?'修订稿已应用并保存，可以恢复上一版。':action==='undo'?'已恢复上一版笔记并保存。':'修订稿已放弃，当前笔记不变。');
  } catch(error) {currentDiscussion=oldDiscussion;currentAnalysis=oldAnalysis;renderVideoDiscussion();discussionStatus(error.message);}
  finally {discussionBusy=false;}
}
function setupVideoDiscussion() {
  document.getElementById('discussionForm').addEventListener('submit',event=>{event.preventDefault();sendVideoDiscussion();});
  document.getElementById('discussionRevise').addEventListener('click',()=>sendVideoDiscussion(true));
  document.getElementById('discussionApply').addEventListener('click',()=>changeDiscussionRevision('apply'));
  document.getElementById('discussionDiscard').addEventListener('click',()=>changeDiscussionRevision('discard'));
  document.getElementById('discussionUndo').addEventListener('click',()=>changeDiscussionRevision('undo'));
  renderVideoDiscussion();
}
