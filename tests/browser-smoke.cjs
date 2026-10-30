const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=require('path').resolve(__dirname, '..');
const base=require('node:url').pathToFileURL(root+require('node:path').sep).href;
const store={ytd_settings:{provider:'openai',openaiApiKey:'test-placeholder',openaiModel:'test-model'}};
const handlers=[];
const noop={addListener(){}};
const storage={
 async get(keys){return keys==null?{...store}:Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(k=>k in store).map(k=>[k,store[k]]));},
 async set(items){Object.assign(store,items);}, async remove(keys){for(const k of Array.isArray(keys)?keys:[keys])delete store[k];}, async setAccessLevel(){}
};
let aiCalls=0, fetchCalls=[], openedTabs=[];
const chrome={storage:{local:storage},runtime:{id:'test-extension',getURL:p=>base+p,onMessage:{addListener:fn=>handlers.push(fn)},onInstalled:noop,sendMessage:async()=>({}),openOptionsPage(){}},tabs:{onUpdated:noop,onActivated:noop,query:async()=>[],get:async()=>({}),create:async options=>{openedTabs.push(options);return options;}},action:{onClicked:noop},sidePanel:{setPanelBehavior(){},setOptions:async()=>{}},scripting:{}};
const sandbox={chrome,console,URL,URLSearchParams,TextEncoder,TextDecoder,AbortController,AbortSignal,crypto:require('crypto').webcrypto,setTimeout,clearTimeout,Response};
sandbox.fetch=async(input,options)=>{
 const url=String(input);fetchCalls.push(url);
 if(url.startsWith(base))return new Response(fs.readFileSync(require('node:url').fileURLToPath(url),'utf8'));
 if(url.includes('api.openai.com')){aiCalls++;assert.equal(options.headers.Authorization,'Bearer test-placeholder');
 const request=JSON.parse(options.body);
 if(request.messages[0].content.startsWith('你是当前视频')) {
   assert.ok(request.messages[1].content.includes('知识点'));
   if(!request.response_format)return new Response(JSON.stringify({choices:[{message:{content:'依据 [0:00]，应保留操作步骤。<img src=x onerror=alert(1)>'}}]}));
   return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({chapters:[{title:'修订后的章节',summary:'根据讨论展开操作细节',timestampSeconds:0}],keyQuotes:[]})}}]}));
 }
return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({guide:{goal:'建立可追踪的项目工作区',takeaways:['方法不绑定工具','代码与规格纳入版本管理'],workflow:['明确需求与已有约束','审查代理推断并确认选择'],exampleChoices:['本例使用 SQLite，供快速原型使用'],outcome:'项目已建立，初始提交仅是举例',uncertainties:['编码代理名称转写不一致']},chapters:[{title:'测试章节',summary:'核心任务：设置采样率\n操作步骤：\n1. 打开音频设置。\n2. 将采样率设置为 48000 Hz。\n关键提醒：字幕未说明按钮位置，需回看画面。',timestampSeconds:0}],keyQuotes:[{quote:'知识点',timestampSeconds:0}]})}}]}));}
 if(url.includes('/view?'))return new Response(JSON.stringify({code:0,data:{aid:123,title:'B站测试视频',owner:{name:'测试作者'},pages:[{page:1,cid:456,part:'第一集',duration:100}]}}));
 if(url.includes('/nav'))return new Response(JSON.stringify({data:{wbi_img:{img_url:'https://i0.hdslb.com/a/7cd084941338484aae1ad9425b84077c.png',sub_url:'https://i0.hdslb.com/a/4932caff0ff746eab6f01bf08b70ac45.png'}}}));
 if(url.includes('/wbi/v2'))return new Response(JSON.stringify({code:0,data:{cid:456,bvid:'BV1xx411c7mD',subtitle:{subtitles:[{lan:'zh-CN',subtitle_url:'//aisubtitle.hdslb.com/test.json'}]}}}));
 if(url.includes('aisubtitle.hdslb.com'))return new Response(JSON.stringify({body:[{from:0,to:4,content:'知识点'},{from:4,to:8,content:'第二段内容'}]}));
 throw Error('Unexpected network: '+url);
};
vm.createContext(sandbox);
sandbox.importScripts=(...files)=>{for(const file of files)vm.runInContext(fs.readFileSync(root+'/'+file,'utf8'),sandbox,{filename:file});};
vm.runInContext(fs.readFileSync(root+'/background.js','utf8'),sandbox);
function send(message){return new Promise((resolve,reject)=>{
 let handled=false;
 for(const handler of handlers){const async=handler(message,{id:chrome.runtime.id,url:base+'sidepanel.html'},value=>{handled=true;resolve(value);});if(async){handled=true;break;}if(handled)break;}
 if(!handled)resolve({});
});}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const page=await browser.newPage({viewport:{width:1360,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.exposeFunction('mockSend',send);
 await page.exposeFunction('mockStorageGet',storage.get);
 await page.exposeFunction('mockStorageSet',storage.set);
 await page.exposeFunction('mockStorageRemove',storage.remove);
 await page.addInitScript(({base})=>{
 const event={addListener(){}};
 window.chrome={runtime:{id:'test-extension',getURL:p=>base+p,sendMessage:m=>window.mockSend(m),onMessage:event},storage:{local:{get:k=>window.mockStorageGet(k),set:o=>window.mockStorageSet(o),remove:k=>window.mockStorageRemove(k)}},windows:{getCurrent:async()=>({id:1})},tabs:{query:async()=>[],onUpdated:event,onActivated:event,create:async()=>({})}};
 },{base});
 await sandbox.ytdOpenReader('https://www.bilibili.com/video/BV1xx411c7mD');
 assert.match(openedTabs[0].url,/view=page/);
 assert.match(openedTabs[0].url,/#source=/);
 await page.goto(base+'sidepanel.html?view=page');
 await page.locator('#welcomeState').waitFor({state:'visible'});
 await page.locator('details').first().locator('summary').click();
 await page.locator('#localText').fill('知识点：先获取字幕，再生成总结。<img src=x onerror=alert(1)>');
 await page.locator('#localTitle').fill('导入测试');
 await page.locator('#localImport').click();
 await page.locator('#chapterList').getByText('测试章节',{exact:true}).waitFor();
 await page.getByText('总结已生成。导入文字没有真实时间轴，无法跳转播放器。',{exact:true}).waitFor();
 assert.equal(await page.locator('#chapterList .chapter-timestamp').innerText(),'');
 assert.equal(aiCalls,1);
 assert.ok(Object.keys(store).some(k=>k.startsWith('digest_import:')));
 await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(),'local-digest-import.png'),fullPage:true});
 // A bookmarkable local URL restores cached content on refresh without AI.
 assert.match(page.url(), /#record=import/);
 await page.reload();
 await page.locator('#chapterList').getByText('测试章节',{exact:true}).waitFor();
 assert.equal(aiCalls,1);
 assert.equal(await page.locator('[data-tab=notes]').isVisible(),false);
 assert.equal(await page.locator('[data-tab=chat]').isVisible(),false);
 assert.equal(await page.locator('[data-panel=transcript]').isVisible(),true);
 // Read local history without another model request.
 await page.locator('details').last().locator('summary').click();
 await page.locator('#localHistory button').filter({hasText:'导入测试'}).click();
 await page.locator('#chapterList').getByText('测试章节',{exact:true}).waitFor();
 assert.equal(aiCalls,1);
 // Bilibili link reaches real background adapter, mock network and real AI client.
 await page.locator('#localVideoUrl').fill('https://www.bilibili.com/video/BV1xx411c7mD');
 await page.locator('#localLinkForm button[type=submit]').click();
 await page.getByText('总结已在下方展开，并自动保存到本机。',{exact:true}).waitFor();
 assert.equal(aiCalls,2);assert.match(await page.locator('#videoTitle').innerText(),/B站测试视频/);
 await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(),'local-digest-bilibili.png'),fullPage:true});
 assert.equal(await page.locator('#readerSource').getAttribute('href'),'https://www.bilibili.com/video/BV1xx411c7mD?p=1');
 const savedUrl=page.url();
 assert.match(savedUrl,/#record=/);
 await page.reload();
 await page.locator('#chapterList').getByText('测试章节',{exact:true}).waitFor();
 assert.equal(aiCalls,2);
 await page.waitForURL(savedUrl);
 assert.equal(page.url(),savedUrl);
 assert.equal(errors.length,0,errors.join('\n'));
 assert.ok(fetchCalls.some(u=>u.includes('/wbi/v2')&&u.includes('w_rid=')));
 // Explicit detail regeneration uses saved subtitles and updates the existing record.
 const subtitleFetches=fetchCalls.filter(url=>url.includes('bilibili.com')||url.includes('hdslb.com')).length;
 await page.locator('#regenerateAnalysisBtn').click();
 await page.getByText('详细笔记已在下方展开，并保存到本机。',{exact:true}).waitFor();
 assert.equal(aiCalls,3);
 assert.match(await page.locator('#analysisGuide').innerText(),/初始提交仅是举例/);
 assert.match(await page.locator('#analysisGuide').innerText(),/编码代理名称转写不一致/);
 assert.match(await page.locator('#analysisGuide ol').innerText(),/审查代理推断并确认选择/);
 assert.match(await page.locator('#analysisGuide').innerText(),/本例使用 SQLite/);
 assert.equal(fetchCalls.filter(url=>url.includes('bilibili.com')||url.includes('hdslb.com')).length,subtitleFetches);
 assert.match(await page.locator('.chapter-summary').innerText(),/48000 Hz/);
 assert.equal(await page.locator('.chapter-summary').evaluate(el=>getComputedStyle(el).whiteSpace),'pre-line');
 assert.equal(Object.keys(store).filter(key=>key.startsWith('digest_bilibili:')).length,1);
 // Discussion reads full source, remains separate from notes, then revises explicitly.
 await page.locator('#discussionInput').fill('请解释操作步骤并指出依据');
 await page.locator('#discussionSend').click();
 await page.getByText('已回答，依据为本视频完整字幕及当前笔记。',{exact:true}).waitFor();
 assert.equal(aiCalls,4);
 assert.equal(await page.locator('#discussionMessages .discussion-citation').count(),1);
 assert.equal(await page.locator('#discussionMessages img').count(),0);
 assert.equal(await page.locator('#chapterList .chapter-title').innerText(),'测试章节');
 await page.locator('#discussionInput').fill('根据讨论展开步骤，修订整份笔记');
 await page.locator('#discussionRevise').click();
 await page.locator('#discussionDraft').waitFor({state:'visible'});
 assert.equal(await page.locator('#chapterList .chapter-title').innerText(),'测试章节');
 assert.match(await page.locator('#discussionPreview').innerText(),/修订后的章节/);
 await page.locator('#discussionApply').click();
 await page.getByText('修订稿已应用并保存，可以恢复上一版。',{exact:true}).waitFor();
 assert.equal(await page.locator('#chapterList .chapter-title').innerText(),'修订后的章节');
 await page.reload();
 await page.locator('#chapterList').getByText('修订后的章节',{exact:true}).waitFor();
 assert.equal(await page.locator('#discussionMessages .discussion-message').count(),3);
 await page.locator('#discussionUndo').click();
 await page.getByText('已恢复上一版笔记并保存。',{exact:true}).waitFor();
 assert.equal(await page.locator('#chapterList .chapter-title').innerText(),'测试章节');
 // Switching video does not expose the previous video's conversation.
 await page.locator('details').last().locator('summary').click();
 await page.locator('#localHistory button').filter({hasText:'导入测试'}).click();
 await page.locator('#chapterList').getByText('测试章节',{exact:true}).waitFor();
 assert.equal(await page.locator('#discussionMessages .discussion-message').count(),0);
 // Untrusted domains rejected before a network call.
 const before=fetchCalls.length;
 await page.locator('#localVideoUrl').fill('https://www.youtube.com.evil.test/watch?v=dQw4w9WgXcQ');
 await page.locator('#localLinkForm button[type=submit]').click();
 await page.locator('#errorState').waitFor({state:'visible'});
 assert.equal(fetchCalls.length,before);
 console.log('PASS: browser import → actual background AI client → summary; history reload without repeated AI; Bilibili signed adapter; spoofed host rejection; no page errors. Network and Chrome APIs are mocked.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
