'use strict';
const sharp=require('sharp');
const path=require('node:path');
const os=require('node:os');
const fs=require('node:fs/promises');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const run=promisify(execFile);
const {FORMATS}=require('./scenes.cjs');
const {brandFor}=require('./direction.cjs');
const xml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function validateCopy(headline='',subline='') {
  if(typeof headline!=='string'||typeof subline!=='string')throw new Error('Add your words as plain text.');
  if(headline.length>120||headline.trim().split(/\s+/).filter(Boolean).length>8)throw new Error('Keep the headline to eight words or fewer.');
  if(subline.length>90)throw new Error('Keep the small line under 90 characters.');
  if(/\b(guaranteed?|approved|approval|lowest rate|risk.free|testimonial)\b|\d\s*%|\$\s*\d/i.test(headline+' '+subline))throw new Error('Use a headline without approval promises, rates or claimed results.');
}
async function ocr(buffer) {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'studio-ocr-'));
  try { const file=path.join(dir,'background.png');await sharp(buffer,{limitInputPixels:24e6}).resize({width:1536,withoutEnlargement:true}).png().toFile(file);
    const {stdout}=await run(process.env.TESSERACT_PATH||'tesseract',[file,'stdout','--psm','11','tsv'],{timeout:20000,maxBuffer:2e6});
    return stdout.split('\n').slice(1).map(line=>line.split('\t')).filter(row=>Number(row[10])>=65&&/[a-z]{2,}|\d{2,}/i.test(row[11]||'')).map(row=>row[11]);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
}
async function readArtwork(buffer,openai) {
  let local;
  try{local=await ocr(buffer);}catch{if(!openai)throw new Error('OCR unavailable');}
  if(!openai)return local;
  const preview=await sharp(buffer).resize({width:768,withoutEnlargement:true}).jpeg({quality:75}).toBuffer();
  // OCR/mark extraction only: decisions are deterministic checks on this list.
  const reply=await openai.chat.completions.create({model:'gpt-4o-mini',response_format:{type:'json_object'},messages:[{role:'system',content:'Extract visible readable words, digits, logos, watermarks and brand marks from this photograph. Return JSON {"words":[],"marks":[]}. Ignore unreadable reflections and ordinary door handles. Marks entries describe actual recognizable logos, not ordinary objects. Do not invent content.'},{role:'user',content:[{type:'image_url',image_url:{url:`data:image/jpeg;base64,${preview.toString('base64')}`,detail:'low'}}]}],max_tokens:180},{timeout:30000,maxRetries:0});
  const data=JSON.parse(reply.choices?.[0]?.message?.content||'{}');
  if(!Array.isArray(data.words)||!Array.isArray(data.marks))throw new Error('OCR result unavailable');
  const found=[...(local||[]),...data.words,...data.marks];if(found.some(s=>typeof s!=='string'&&typeof s!=='number'))throw new Error('OCR result unavailable');
  return found.map(String).filter(s=>s.trim());
}
async function inspectBackground(buffer,zone,{readWords=ocr,uploaded=false}={}) {
  const problems=[];
  const metadata=await sharp(buffer,{limitInputPixels:24e6}).metadata();
  if(!metadata.width||!metadata.height)problems.push('This picture could not be opened.');
  // User photographs can contain real signs; generated backgrounds cannot.
  if(!uploaded){ try {const words=await readWords(buffer);if(words.length)problems.push('Words or a lettered mark appeared in the background. Regenerate this choice.');}catch{problems.push('The word check is unavailable on this server. This AI picture cannot be used yet.');} }
  const small=await sharp(buffer).resize(100,100,{fit:'fill'}).greyscale().raw().toBuffer();
  let edges=0,count=0;
  for(let y=8;y<92;y++)for(let x=8;x<92;x++){if(zone==='left'&&x>38||zone==='right'&&x<62||zone==='top'&&y>38||zone==='bottom'&&y<62||zone==='none')continue;count++;if(Math.abs(small[y*100+x]-small[y*100+x+1])>26)edges++;}
  if(count&&edges/count>.20)problems.push('The headline space is too busy. Try “less busy” or move the subject.');
  return {problems,emptySpace:!problems.some(p=>p.includes('busy')),ocrPassed:uploaded||!problems.some(p=>p.includes('word')||p.includes('Words'))};
}
async function compose(buffer,{format='blog',brand='homelistingai',text_zone='left',headline='',subline='',alt_text='',requiresLending=false,nmls='',lendingAsset,logoPath=path.resolve(__dirname,'../../../public/newlogo.png'),encoding}={}) {
  const f=Object.hasOwn(FORMATS,format)?FORMATS[format]:null;if(!f)throw new Error('Choose a supported size.');
  validateCopy(headline,subline);
  if(!alt_text.trim())throw new Error('Add a short picture description first.');
  if(requiresLending&&(!lendingAsset||!/^\d{1,12}$/.test(nmls)))throw new Error('This ad needs your official Equal Housing Lender file and verified NMLS number.');
  const b=brandFor(brand);const w=f.width,h=f.height;let layers=[];
  // An opaque brand panel guarantees white-text AA contrast; a feathered edge
  // joins it to the photograph. No claim about unmeasured photographic contrast.
  const side=text_zone==='right'?'right':'left';const panel=Math.round(w*.40);let font=Math.round(Math.min(w*.048,h*.14));
  function wrap(text,maxChars){const lines=[];let line='';for(const word of text.trim().split(/\s+/).filter(Boolean)){if((line+' '+word).trim().length>maxChars&&line){lines.push(line);line=word;}else line=(line+' '+word).trim();}if(line)lines.push(line);return lines;}
  let lines,smallLines;
  for(;font>=18;font--){const maxChars=Math.floor((panel-w*.07)/(font*.62));lines=wrap(headline,maxChars);smallLines=wrap(subline,Math.floor(maxChars/.46));if(lines.every(s=>s.length<=maxChars)&&lines.length<=4&&h*.27+lines.length*font*1.12+font*.7+smallLines.length*font*.65<h*.70)break;}
  if(font<18)throw new Error('Use shorter words so the headline stays easy to read.');
  if(subline.length>90)throw new Error('Keep the small line under 90 characters.');
  const x=side==='right'?w-panel:0;const tx=x+w*.035;
  const fontfile=path.resolve(__dirname,'../../assets/fonts/Inter.ttf');
  async function lettering(text,size,top,bold=false,left=tx){const rendered=await sharp({text:{text:`<span foreground="white">${xml(text)}</span>`,font:`Inter ${bold?'Bold ':''}${size}`,fontfile,width:Math.round(panel-w*.07),height:Math.ceil(size*1.22),rgba:true,wrap:'none'}}).png().toBuffer();layers.push({input:rendered,left:Math.round(left),top:Math.round(top)});}
  if(headline||subline){const fade=w*.10;const gx=side==='left'?panel:w-panel-fade;
    layers.push({input:Buffer.from(`<svg width="${w}" height="${h}"><defs><linearGradient id="shade" x1="${side==='left'?'0':'1'}" x2="${side==='left'?'1':'0'}"><stop offset="0" stop-color="${b.blue}"/><stop offset="1" stop-color="${b.blue}" stop-opacity="0"/></linearGradient></defs><rect x="${x}" width="${panel}" height="${h}" fill="${b.blue}"/><rect x="${gx}" width="${fade}" height="${h}" fill="url(#shade)"/></svg>`),left:0,top:0});
    for(let i=0;i<lines.length;i++)await lettering(lines[i],font,h*.27-font*.8+i*font*1.12,true);
    for(let i=0;i<smallLines.length;i++)await lettering(smallLines[i],Math.round(font*.46),h*.27+lines.length*font*1.12+font*.7+i*font*.65);
  }
  if(brand==='homelistingai') {const width=Math.round(Math.min(panel*.28,h*.13));const logo=await sharp(logoPath).resize({width,height:Math.round(h*.13),fit:'inside'}).png().toBuffer({resolveWithObject:true});layers.push({input:logo.data,left:Math.round(tx),top:Math.round(h*.78)});if(headline||subline)await lettering('HomeListingAI',Math.round(Math.min(w*.018,h*.04)),h*.82,true,tx+logo.info.width+w*.018);}
  if(requiresLending){const badge=await sharp(lendingAsset).resize({width:Math.round(w*.09),height:Math.round(h*.10),fit:'inside'}).png().toBuffer();layers.push({input:badge,left:Math.round(w*.87),top:Math.round(h*.82)});layers.push({input:Buffer.from(`<svg width="${w}" height="${h}"><rect x="${w*.65}" y="${h*.93}" width="${w*.35}" height="${h*.07}" fill="${b.blue}"/><text x="${w*.67}" y="${h*.977}" fill="white" font-size="${h*.025}">NMLS ${xml(nmls)}</text></svg>`),left:0,top:0});}
  const enc=encoding||(f.web?'webp':'jpeg');if(!['webp','avif','jpeg','png'].includes(enc))throw new Error('Choose WebP, AVIF, JPG or PNG.');
  const budget=f.web?250*1024:1024*1024;let data;
  for(const quality of [82,72,60,48,35]){let image=sharp(buffer,{limitInputPixels:24e6}).rotate().resize(w,h,{fit:'cover',position:'centre'}).composite(layers);data=await (enc==='png'?image.png({compressionLevel:9,palette:true}):image[enc]({quality})).toBuffer();if(data.length<=budget)break;}
  const meta=await sharp(data).metadata();const problems=[];
  if(meta.width!==w||meta.height!==h)problems.push('The saved picture has the wrong size.');
  if(data.length>budget)problems.push('The picture is too large. Choose a simpler scene.');
  const rgb=b.blue.match(/\w\w/g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);const contrast=1.05/(rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722+.05);
  if((headline||subline)&&contrast<4.5)problems.push('The text needs a darker background.');
  return {buffer:data,type:`image/${enc}`,extension:enc==='jpeg'?'jpg':enc,width:w,height:h,bytes:data.length,contrast,problems};
}
module.exports={ocr,readArtwork,inspectBackground,compose,validateCopy};
