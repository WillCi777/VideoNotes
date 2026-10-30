const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const LocalVideo = require('../src/core/local-video.js');
const BiliWbi = require('../src/core/wbi.js');

test('platform boundaries reject spoofed hosts and invalid pages; strip tracking', () => {
  const v = LocalVideo.parse('https://www.bilibili.com/video/BV1xx411c7mD?p=2&share_source=copy');
  assert.equal(v.key, 'bilibili:BV1xx411c7mD:p2');
  assert.equal(v.url, 'https://www.bilibili.com/video/BV1xx411c7mD?p=2');
  assert.equal(LocalVideo.parse('https://youtu.be/dQw4w9WgXcQ?t=2').key, 'dQw4w9WgXcQ');
  for (const url of ['https://www.youtube.com.evil.test/watch?v=dQw4w9WgXcQ','https://evil.test/embed/dQw4w9WgXcQ','http://www.bilibili.com/video/BV1xx411c7mD','https://www.bilibili.com/video/BV1xx411c7mD?p=-1','https://www.bilibili.com/video/BV1xx411c7mD?p=NaN']) assert.throws(() => LocalVideo.parse(url));
});
test('SRT and VTT retain real timing; malformed and oversized inputs fail', () => {
  const srt = LocalVideo.importText('1\r\n00:00:01,500 --> 00:00:03,000\r\n<b>你好</b>\r\n\r\n2\r\n00:01:02,000 --> 00:01:05,000\r\n世界');
  assert.equal(srt.transcript[0].start,1.5); assert.equal(srt.transcript[0].duration,1.5);
  assert.equal(srt.transcript[0].text,'你好'); assert.equal(srt.transcript[1].start,62);
  const vtt = LocalVideo.importText('WEBVTT\n\n00:01.000 --> 00:02.000 align:start\nhello');
  assert.equal(vtt.transcript[0].start,1);
  assert.throws(() => LocalVideo.importText('1\n00:02:00,000 --> 00:01:00,000\nBad'));
  assert.throws(() => LocalVideo.importText('WEBVTT\ninvalid --> invalid\nx'));
  assert.throws(() => LocalVideo.importText('1\n00:00:01,000 --> 00:00:02,000\nvalid\n\n2\ninvalid --> invalid\ninvalid'));
  assert.throws(() => LocalVideo.importText('a'.repeat(300001)));
  assert.throws(() => LocalVideo.result([{ text:'x', start:Infinity }]));
});
test('plain text is explicitly untimed and cannot be confused with platform IDs', () => {
  const data = LocalVideo.importText('第一段\n第二段');
  assert.equal(data.timed,false); assert.equal(data.transcript[0].start,0);
  assert.equal(LocalVideo.timestampUrl('https://www.bilibili.com/video/BV1xx411c7mD?p=2',12.9),'https://www.bilibili.com/video/BV1xx411c7mD?p=2&t=12');
});
test('WBI MD5 matches standard vectors and a fixed WBI checksum fixture', () => {
  assert.equal(BiliWbi.md5(''),'d41d8cd98f00b204e9800998ecf8427e');
  assert.equal(BiliWbi.md5('abc'),'900150983cd24fb0d6963f7d28e17f72');
  assert.equal(BiliWbi.md5('a'.repeat(1000)), require('node:crypto').createHash('md5').update('a'.repeat(1000)).digest('hex'));
  const query = BiliWbi.sign({ foo:'114', bar:'514', baz:1919810 }, 'https://i0.hdslb.com/bfs/wbi/7cd084941338484aae1ad9425b84077c.png','https://i0.hdslb.com/bfs/wbi/4932caff0ff746eab6f01bf08b70ac45.png',1702204169);
  assert.equal(query,'bar=514&baz=1919810&foo=114&wts=1702204169&w_rid=6149fdadf571698ca7e6a567265cd0ee');
});
function provider(fetch) {
  const sandbox = { LocalVideo, BiliWbi, URL, fetch, AbortSignal, TextDecoder, console };
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/services/bilibili.js'),'utf8'),sandbox);
  return sandbox;
}
function response(data) { return new Response(JSON.stringify(data)); }
test('Bilibili pipeline binds requested part to signed request and normalized subtitle', async () => {
  const calls=[];
  const p=provider(async (url,options) => {
    calls.push([url,options]);
    if(url.includes('/view?')) return response({code:0,data:{aid:123,title:'课程',owner:{name:'作者'},pages:[{page:2,cid:456,part:'下集',duration:100}]}});
    if(url.includes('/nav')) return response({ data:{wbi_img:{img_url:'https://i0.hdslb.com/a/7cd084941338484aae1ad9425b84077c.png',sub_url:'https://i0.hdslb.com/a/4932caff0ff746eab6f01bf08b70ac45.png'}}});
    if(url.includes('/wbi/v2')) return response({code:0,data:{cid:456,bvid:'BV1xx411c7mD',subtitle:{subtitles:[{lan:'zh-CN',subtitle_url:'//aisubtitle.hdslb.com/test.json'}]}}});
    return response({body:[{from:1,to:3,content:'知识点'}]});
  });
  const data=await p.handleLocalTranscript('https://www.bilibili.com/video/BV1xx411c7mD?p=2');
  assert.equal(data.success,true); assert.equal(data.transcript[0].start,1); assert.equal(data.metadata.title,'课程');
  assert.match(calls[2][0],/cid=456/); assert.match(calls[2][0],/w_rid=[a-f0-9]{32}/);
  assert.equal(calls[0][1].credentials,'include'); assert.equal(calls[3][1].credentials,'omit');
});
test('subtitle fetch refuses unrelated hosts, redirects and oversized responses', async () => {
  const p=provider(async () => new Response('x'.repeat(2*1024*1024+1)));
  await assert.rejects(p.localFetchJson('https://aisubtitle.hdslb.com.evil.test/x'),/允许/);
  await assert.rejects(p.localFetchJson('http://aisubtitle.hdslb.com/x'),/允许/);
  await assert.rejects(p.localFetchJson('https://aisubtitle.hdslb.com/x'),/过大/);
});
test('Bilibili failures do not silently summarize empty or mismatched content', async () => {
  const p=provider(async () => response({code:-403}));
  assert.equal((await p.handleLocalTranscript('https://www.bilibili.com/video/BV1xx411c7mD')).success,false);
});

test('adaptive guide validates types, limits lists and preserves older summaries', () => {
  const sandbox = {};
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/core/timestamps.js'),'utf8'),sandbox);
  const old = sandbox.validateAndFixTimestamps({chapters:[],keyQuotes:[]},100);
  assert.equal('guide' in old,false);
  const data = sandbox.validateAndFixTimestamps({guide:{goal:123,takeaways:['重要结论',null,...Array(8).fill('要点')],outcome:'工作区已就绪；初始提交仅为举例',uncertainties:['代理名称转写不一致']},chapters:[]},100);
  assert.equal(data.guide.goal,'');
  assert.ok(data.guide.takeaways.length<=5);
  assert.ok(data.guide.takeaways.every(item=>typeof item==='string'&&item));
  assert.match(data.guide.outcome,/仅为举例/);
  assert.equal(data.guide.uncertainties[0],'代理名称转写不一致');
});

test('workflow and example choices are bounded and reject non-text model fields', () => {
  const sandbox = {};
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/core/timestamps.js'),'utf8'),sandbox);
  const result = sandbox.validateAndFixTimestamps({guide:{workflow:[{text:'not a string'},'明确需求',...Array(10).fill('核实决策')],exampleChoices:['保留适用条件',null,...Array(9).fill('本例配置')]},chapters:[]},100);
  assert.ok(result.guide.workflow.length<=8);
  assert.ok(result.guide.workflow.every(value=>typeof value==='string'&&value));
  assert.ok(result.guide.exampleChoices.length<=6);
  assert.equal(result.guide.exampleChoices[0],'保留适用条件');
});
