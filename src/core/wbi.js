/** MD5 here implements Bilibili's public request checksum, not password hashing. */
var BiliWbi = (() => {
  function md5(text) {
    const input = new TextEncoder().encode(text);
    const bytes = new Uint8Array(Math.ceil((input.length + 9)/64)*64);
    bytes.set(input); bytes[input.length] = 128;
    const view = new DataView(bytes.buffer);
    view.setUint32(bytes.length-8, (input.length*8) >>> 0, true);
    view.setUint32(bytes.length-4, Math.floor(input.length/0x20000000), true);
    const shifts = [7,12,17,22,5,9,14,20,4,11,16,23,6,10,15,21];
    const constants = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i+1))*0x100000000) | 0);
    let state = [0x67452301, 0xefcdab89 | 0, 0x98badcfe | 0, 0x10325476];
    for (let offset=0; offset<bytes.length; offset+=64) {
      let [a,b,c,d] = state;
      for (let i=0; i<64; i++) {
        let f,g;
        if (i<16) { f=(b&c)|(~b&d);g=i; }
        else if(i<32) { f=(d&b)|(~d&c);g=(5*i+1)%16; }
        else if(i<48) { f=b^c^d;g=(3*i+5)%16; }
        else { f=c^(b|~d);g=(7*i)%16; }
        const sum=(a+f+constants[i]+view.getInt32(offset+g*4,true))|0;
        const shift=shifts[Math.floor(i/16)*4+i%4];
        const next=(b+((sum<<shift)|(sum>>>(32-shift))))|0;
        a=d;d=c;c=b;b=next;
      }
      state=state.map((v,i)=>(v+[a,b,c,d][i])|0);
    }
    return state.map(v => [0,8,16,24].map(s => ((v>>>s)&255).toString(16).padStart(2,"0")).join("")).join("");
  }
  const order = [46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13,37,48,7,16,24,55,40,61,26,17,0,1,60,51,30,4,22,25,54,21,56,59,6,63,57,62,11,36,20,34,44,52];
  function sign(params, imageUrl, subUrl, timestamp = Math.floor(Date.now()/1000)) {
    const key = url => { const match = new URL(url).pathname.match(/\/([a-f\d]{32})\.[a-z]+$/i); if (!match) throw new Error("B站请求签名信息不可用。"); return match[1]; };
    const raw = key(imageUrl)+key(subUrl);
    const mix = order.map(i => raw[i]).join("").slice(0,32);
    const values = { ...params, wts: timestamp };
    const query = Object.keys(values).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(String(values[k]).replace(/[!'()*]/g,""))}`).join("&");
    return `${query}&w_rid=${md5(query+mix)}`;
  }
  return { md5, sign };
})();
if (typeof module !== "undefined") module.exports = BiliWbi;
