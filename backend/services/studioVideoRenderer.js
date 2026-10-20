'use strict';
const { spokenScript } = require('./videoScriptText');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const sharp = require('sharp');
const {videoOptions}=require('./studioVideoOptions');
const run = promisify(execFile);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function wrap(text, width) {
  const words = String(text).trim().split(/\s+/); const lines = []; let line = '';
  for (let word of words) {
    // Long words must also fit the card; keep every character.
    while (word.length > width) { if (line) { lines.push(line); line=''; } lines.push(word.slice(0,width)); word=word.slice(width); }
    if ((line + ' ' + word).trim().length > width) { lines.push(line); line = word; } else line = (line + ' ' + word).trim();
  }
  if (line) lines.push(line); return lines;
}
function captionScenes(script, width, maxLines) {
  const scenes=[]; let current=[];
  for(const sentence of script.trim().split(/(?<=[.!?])\s+/u)) {
    const lines=wrap(sentence,width);
    if(current.length && current.length+lines.length>maxLines) {scenes.push(current);current=[];}
    while(lines.length>maxLines) scenes.push(lines.splice(0,maxLines));
    current.push(...lines);
  }
  if(current.length)scenes.push(current);return scenes;
}
function captionTimeline(scenes,seconds,pauses=[]) {
  const weights=scenes.map(lines=>Math.max(8,lines.join(' ').split(/\s+/).length));const total=weights.reduce((sum,value)=>sum+value,0);
  const boundaries=[];let elapsed=0;
  for(let i=0;i<scenes.length;i++) {
    elapsed+=seconds*weights[i]/total;
    const previous=boundaries.at(-1)||0;
    const close=pauses.filter(time=>Math.abs(time-elapsed)<=.8&&time>previous+.5&&time<seconds-(scenes.length-i-1)*.5).sort((a,b)=>Math.abs(a-elapsed)-Math.abs(b-elapsed));
    boundaries.push(i===scenes.length-1?seconds:Math.min(seconds-(scenes.length-i-1)/15,Math.max(previous+1/15,close[0]??elapsed)));
  }
  return boundaries;
}
async function voicePauses(bytes,speed,dir) {
  const file=path.join(dir,'timing.mp3');await fs.writeFile(file,bytes);
  const {stderr}=await run(process.env.FFMPEG_BIN||'ffmpeg',['-nostdin','-hide_banner','-i',file,'-vn','-af','silencedetect=noise=-35dB:d=0.12','-f','null','-'],{timeout:10000,maxBuffer:1024*1024});
  return [...stderr.matchAll(/silence_end: ([0-9.]+)/g)].map(match=>Number(match[1])/speed);
}
function cardSvg({ title, lines, width, height, photo = false, captionSize='normal', videoStyle='blue', aiVoice=false, captionOpacity=1 }) {
  const vertical = height > width; const margin = 48; const font = captionSize==='large' ? (vertical?34:30) : (vertical ? 28 : 25);
  const headings = wrap(title, vertical ? 28 : 48).slice(0,3);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="${videoStyle==='dark'?'#0f172a':'#172554'}"/><stop offset="1" stop-color="${videoStyle==='dark'?'#334155':'#4338ca'}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#bg)" fill-opacity="${photo ? .65 : 1}"/><rect x="${margin}" y="${vertical?190:130}" width="${width-margin*2}" height="${vertical?height-360:height-235}" rx="22" fill="${photo ? '#172554' : '#ffffff'}" fill-opacity="${photo ? .85 : .08}"/><text x="${margin}" y="65" fill="#bfdbfe" font-family="sans-serif" font-size="22" font-weight="700">HomeListingAI</text>${headings.map((line,i)=>`<text x="${margin}" y="${vertical?120+i*28:103+i*26}" fill="white" font-family="sans-serif" font-size="${vertical?26:22}" font-weight="700">${escape(line)}</text>`).join('')}${lines.map((line,i)=>`<text x="${margin+20}" y="${(vertical ? 490-lines.length*(font+16)/2+font : 315-lines.length*(font+16)/2+font)+i*(font+16)}" fill="white" fill-opacity="${captionOpacity}" font-family="sans-serif" font-size="${font}">${escape(line)}</text>`).join('')}<text x="${margin}" y="${height-58}" fill="#bfdbfe" font-family="sans-serif" font-size="19">homelistingai.com/for-loan-officers</text>${aiVoice?`<text x="${margin}" y="${height-27}" fill="#bfdbfe" font-family="sans-serif" font-size="16">AI-generated voice</text>`:''}</svg>`);
}
// The free branded picture for posts: big headline, brand on top, trial line and link at the bottom.
// "launch" is the 30-day campaign look: black background, white headline with the last line in fire-engine red, orange button.
function pictureSvg({ title, width = 1080, height = 1080, style = 'brand' }) {
  const launch = style === 'launch';
  const margin = 80;
  const headings = wrap(String(title || 'Warm leads. Agent partnerships.'), launch ? 18 : 17).slice(0, 5);
  // Never leave one short word alone on the last line: pull a word down from the line above.
  if (headings.length > 1) {
    const last = headings[headings.length - 1]; const prev = headings[headings.length - 2].split(' ');
    if (!last.includes(' ') && last.length <= 8 && prev.length > 2) { headings[headings.length - 1] = `${prev.pop()} ${last}`; headings[headings.length - 2] = prev.join(' '); }
  }
  const longest = Math.max(...headings.map((h) => h.length));
  const size = headings.length > 3 ? 78 : longest > 16 ? 80 : 92;
  const top = 250;
  const defs = launch
    ? '<linearGradient id="bg" x2="0" y2="1"><stop stop-color="#08090D"/><stop offset="1" stop-color="#1A1D24"/></linearGradient>'
    : '<linearGradient id="bg" x2="1" y2="1"><stop stop-color="#172554"/><stop offset="1" stop-color="#4338ca"/></linearGradient>';
  const accent = launch ? '#FF7A18' : '#93c5fd';
  const line = (text, i) => {
    const red = launch && i === headings.length - 1 && headings.length > 1;
    return `<text x="${margin}" y="${top + i * (size + 22) + size}" fill="${red ? '#ED1C24' : '#ffffff'}" font-family="sans-serif" font-size="${size}" font-weight="800">${escape(text)}</text>`;
  };
  const pill = launch ? '#FF7A18' : '#ffffff';
  const pillText = launch ? '#08090D' : '#172554';
  const cta = launch ? 'Claim your founding price' : 'Free 7-day trial';
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs>${defs}</defs><rect width="100%" height="100%" fill="url(#bg)"/><rect x="${margin}" y="${margin}" width="12" height="64" rx="6" fill="${accent}"/><text x="${margin + 36}" y="${margin + 46}" fill="#ffffff" font-family="sans-serif" font-size="44" font-weight="800">HomeListingAI</text>${headings.map(line).join('')}<rect x="${margin}" y="${height - 250}" width="${launch ? 640 : 560}" height="84" rx="42" fill="${pill}"/><text x="${margin + (launch ? 320 : 280)}" y="${height - 195}" text-anchor="middle" fill="${pillText}" font-family="sans-serif" font-size="34" font-weight="800">${cta}</text><text x="${margin}" y="${height - 110}" fill="${launch ? '#ffb066' : '#bfdbfe'}" font-family="sans-serif" font-size="34" font-weight="600">homelistingai.com${launch ? '/lo-signup' : '/for-loan-officers'}</text></svg>`);
}
async function picture(campaign) {
  return sharp(pictureSvg({ title: campaign.brief?.cardHeadline || campaign.outputs.title, style: campaign.brief?.cardStyle })).png().toBuffer();
}
function backgroundSvg(width,height,style) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="background" x2="1" y2="1"><stop stop-color="${style==='dark'?'#0f172a':'#172554'}"/><stop offset="1" stop-color="${style==='dark'?'#334155':'#4338ca'}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#background)"/><circle cx="${width*.3}" cy="${height*.2}" r="${width*.4}" fill="#60a5fa" opacity=".15"/><circle cx="${width*.9}" cy="${height*.75}" r="${width*.5}" fill="#818cf8" opacity=".2"/></svg>`);
}
async function closingCard(width,height,aiVoice) {
  const vertical=height>width, center=width/2, y=vertical?350:260;
  const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#172554"/><stop offset="1" stop-color="#4338ca"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#bg)"/><rect x="${center-110}" y="${y-245}" width="220" height="220" rx="36" fill="white"/><text x="${center}" y="${y+35}" text-anchor="middle" fill="white" font-family="sans-serif" font-size="${vertical?38:34}" font-weight="700">HomeListingAI</text><text x="${center}" y="${y+92}" text-anchor="middle" fill="#bfdbfe" font-family="sans-serif" font-size="${vertical?22:20}">Warm leads. Agent partnerships.</text><rect x="${center-172}" y="${y+130}" width="344" height="68" rx="20" fill="white"/><text x="${center}" y="${y+174}" text-anchor="middle" fill="#172554" font-family="sans-serif" font-size="27" font-weight="700">See a WOW Link</text><text x="${center}" y="${y+238}" text-anchor="middle" fill="#bfdbfe" font-family="sans-serif" font-size="${vertical?20:22}">homelistingai.com/for-loan-officers</text>${aiVoice?`<text x="${center}" y="${height-25}" text-anchor="middle" fill="#bfdbfe" font-family="sans-serif" font-size="16">AI-generated voice</text>`:''}</svg>`);
  const logo=await sharp(path.join(__dirname,'../../public/newlogo.png')).resize(188,188,{fit:'contain',background:'#ffffff'}).png().toBuffer();
  return sharp(svg).composite([{input:logo,left:Math.round(center-94),top:y-229}]).png().toBuffer();
}
async function normalizePhoto(buffer) {
  const image=sharp(buffer,{limitInputPixels:24000000,animated:false});
  const meta=await image.metadata();
  if (!['jpeg','png','webp'].includes(meta.format) || !meta.width || !meta.height) throw Error('Choose a JPG, PNG or WebP picture.');
  return image.rotate().resize(1600,1600,{fit:'inside',withoutEnlargement:true}).jpeg({quality:85}).toBuffer();
}
async function available() {
  try { await run(process.env.FFMPEG_BIN || 'ffmpeg',['-version'],{timeout:5000,maxBuffer:1024*1024}); return true; } catch { return false; }
}
async function normalizeAudio(buffer) {
  if(!buffer?.length || buffer.length>8*1024*1024)throw Error('Choose an audio file smaller than 8 MB.');
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'hlai-audio-'));
  try {
    const input=path.join(dir,'input');const output=path.join(dir,'audio.mp3');await fs.writeFile(input,buffer);
    // Restrict demuxing to local file/pipe input: an uploaded playlist cannot fetch URLs.
    await run(process.env.FFMPEG_BIN||'ffmpeg',['-nostdin','-y','-hide_banner','-loglevel','error','-protocol_whitelist','file,pipe','-format_whitelist','mp3,wav,mov,matroska,webm,ogg,aac,flac','-i',input,'-map','0:a:0','-vn','-t','91','-af','loudnorm=I=-18:TP=-2:LRA=7','-ar','24000','-ac','1','-c:a','libmp3lame','-b:a','96k','-map_metadata','-1',output],{timeout:30000,maxBuffer:1024*1024});
    const bytes=await fs.readFile(output);const duration=await audioDuration(bytes);
    if(!Number.isFinite(duration)||duration<.2||duration>90)throw Error('Use an audio clip between one second and 90 seconds.');
    return bytes;
  } finally {await fs.rm(dir,{recursive:true,force:true});}
}
async function audioDuration(buffer) {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'hlai-probe-'));
  try {
    const input=path.join(dir,'audio.mp3');await fs.writeFile(input,buffer);
    const {stdout}=await run(process.env.FFPROBE_BIN||'ffprobe',['-v','error','-protocol_whitelist','file,pipe','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',input],{timeout:5000,maxBuffer:16384});
    const duration=Number(stdout.trim());if(!Number.isFinite(duration)||duration<=0)throw Error('Could not read audio length.');return duration;
  } finally {await fs.rm(dir,{recursive:true,force:true});}
}
// Original, synthesized instrumental beds. No samples, downloads or licensed songs.
function musicWav(style, seconds) {
  const rate=24000, length=Math.ceil(seconds*rate);const buffer=Buffer.alloc(44+length*2);
  buffer.write('RIFF',0);buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*2,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(length*2,40);
  const chords=[[261.63,329.63,392],[220,261.63,329.63],[174.61,220,261.63],[196,246.94,293.66]];
  for(let i=0;i<length;i++) {
    const t=i/rate, chord=chords[Math.floor(t/4)%4], local=t%4;
    const pad=chord.reduce((sum,f)=>sum+Math.sin(2*Math.PI*f*t),0)/3*Math.min(1,local*3,(4-local)*3)*.15;
    let beat=0;
    if(style==='upbeat') {
      const pulse=t%.5, halfBeat=t%.25, noise=(Math.sin(i*127.1)*43758.5453)%1;
      const kick=Math.sin(2*Math.PI*(55*pulse+1.6*(1-Math.exp(-pulse*35))))*Math.exp(-pulse*18)*.28;
      const snare=Math.floor(t*2)%2===1?noise*Math.exp(-pulse*32)*.16:0;
      const hat=noise*Math.exp(-halfBeat*75)*.07;
      const melody=Math.sin(2*Math.PI*chord[Math.floor(t*4)%3]*t)*Math.exp(-halfBeat*14)*.07;
      beat=kick+snare+hat+melody;
    }
    const fade=Math.min(1,t,seconds-t);buffer.writeInt16LE(Math.round(((style==='upbeat'?pad*.45:pad)+beat)*fade*32767),44+i*2);
  }
  return buffer;
}
async function render(campaign, photo, audio={}) {
  const options=videoOptions(campaign.brief);
  // An animated explainer is drawn in code from the business settings: no picture, voice or captions are used.
  if(options.layout==='explainer')return require('./explainerVideo').render(options.explainer,{music:options.music!=='none'});
  const vertical=campaign.brief.videoFormat==='vertical'; const width=vertical?540:960; const height=vertical?960:540;
  const large=options.captionSize==='large';
  const scenes=captionScenes(spokenScript(campaign.outputs.videoScript),vertical?(large?23:27):(large?43:52),vertical?(large?6:7):(large?4:5));
  if (!scenes.length || scenes.length>30) throw Error('Shorten the video script before rendering.');
  const voice=options.narration==='saved'?audio.voice:null;
  const speed=Number(options.voiceSpeed);
  const spoken=voice?await audioDuration(voice)/speed:0;
  const closing=options.endCard==='wow'?3:0;
  const duration=Math.max(Number(campaign.brief.videoDuration),Math.ceil(spoken+Math.max(1,closing)));
  if(duration>90)throw Error('Your voice is too long at this speed. Shorten it or use a faster voice speed.');
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'hlai-studio-'));
  try {
    // Animate only the background. The text layer remains at its original size/position.
    const background=path.join(dir,'background.png');
    if(photo&&options.layout==='picture') {
      // Leave room around finished artwork so the stronger zoom keeps its headline and logo in view.
      const fill=await sharp(photo).resize(width*2,height*2,{fit:'cover'}).blur(30).modulate({brightness:.7}).png().toBuffer();
      const whole=await sharp(photo).resize(Math.round(width*1.7),Math.round(height*1.7),{fit:'inside'}).png().toBuffer();
      await sharp(fill).composite([{input:whole,gravity:'centre'}]).png().toFile(background);
    } else {
      const bg=photo?sharp(photo).resize(width*2,height*2,{fit:'cover'}):sharp(backgroundSvg(width*2,height*2,options.videoStyle));
      await bg.png().toFile(background);
    }
    const fps=15, timeline=spoken?Math.max(spoken,Math.min(duration-closing,scenes.length*.4)):duration-closing;
    // Free pause detection nudges estimated card boundaries into natural speech pauses.
    const pauses=voice?await voicePauses(voice,speed,dir):[];
    const boundaries=captionTimeline(scenes,timeline,pauses);
    const graphics=[];let lastFrame=0;
    if(options.layout==='picture') {
      // No caption cards: one clear frame so only the picture moves.
      const clear=path.join(dir,'clear.png');
      await sharp({create:{width,height,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).png().toFile(clear);
      graphics.push({file:clear,frames:Math.max(1,Math.round((duration-closing)*fps))});
    }
    for(let i=0;options.layout!=='picture'&&i<scenes.length;i++) {
      const endFrame=i===scenes.length-1?Math.round((duration-closing)*fps):Math.round(boundaries[i]*fps);
      const frames=endFrame-lastFrame;lastFrame=endFrame;
      const fade=options.transition==='fade'?Math.min(3,Math.floor(frames/4)):0;
      const write=async(opacity,count,suffix)=>{
        if(count<=0)return;
        const file=path.join(dir,`scene-${i}-${suffix}.png`);
        await sharp(cardSvg({title:campaign.outputs.title,lines:scenes[i],width,height,photo:true,...options,aiVoice:Boolean(voice&&audio.aiVoice),captionOpacity:opacity})).png().toFile(file);
        graphics.push({file,frames:count});
      };
      for(let f=1;f<=fade;f++)await write(f/(fade+1),1,`in-${f}`);
      await write(1,frames-fade*2,'hold');
      for(let f=fade;f>=1;f--)await write(f/(fade+1),1,`out-${f}`);
    }
    if(closing) {
      const file=path.join(dir,'closing.png');const bytes=await closingCard(width,height,Boolean(voice&&audio.aiVoice));await fs.writeFile(file,bytes);
      const fade=options.transition==='fade'?3:0;
      for(let f=1;f<=fade;f++) {const faded=path.join(dir,`closing-${f}.png`);await sharp(bytes).ensureAlpha().linear([1,1,1,f/(fade+1)],[0,0,0,0]).png().toFile(faded);graphics.push({file:faded,frames:1});}
      graphics.push({file,frames:closing*fps-fade});
    }
    // Explicit image frame rate makes short fade frames and total duration frame-accurate.
    await fs.writeFile(path.join(dir,'frames.txt'),graphics.map(g=>`file '${g.file}'\noption framerate ${fps}\nduration ${g.frames/fps}\n`).join('')+`file '${graphics.at(-1).file}'\noption framerate ${fps}\n`);
    const out=path.join(dir,'video.mp4');
    const args=['-nostdin','-y','-hide_banner','-loglevel','error','-filter_complex_threads','1','-loop','1','-framerate',String(fps),'-i',background,'-f','concat','-safe','0','-i',path.join(dir,'frames.txt')];
    const zoom=options.motion==='gentle'?`zoompan=z='1.00+0.14*min(on/${Math.max(1,(duration-closing)*fps-1)},1)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=${width}x${height}:fps=${fps}`:`scale=${width}:${height}`;
    const filters=[`[0:v]${zoom},setsar=1[background]`,`[1:v]fps=${fps},format=rgba[graphics]`,`[background][graphics]overlay=shortest=1:format=auto,format=yuv420p[finished]`];
    const tracks=[];let index=2;
    if(voice) {const file=path.join(dir,'voice.mp3');await fs.writeFile(file,voice);args.push('-i',file);filters.push(`[${index++}:a]atempo=${speed},apad,atrim=duration=${duration}[voice]`);tracks.push('[voice]');}
    if(options.music!=='none') {
      const bytes=options.music==='upload'?audio.music:musicWav(options.music,duration);
      if(!bytes)throw Error('Upload your music before rendering.');
      const file=path.join(dir,options.music==='upload'?'music.mp3':'music.wav');await fs.writeFile(file,bytes);args.push('-stream_loop','-1','-i',file);
      const volume=options.musicVolume==='medium'?.5:.22;
      filters.push(`[${index++}:a]volume=${volume},atrim=duration=${duration},afade=t=in:st=0:d=1,afade=t=out:st=${duration-1}:d=1[music]`);tracks.push('[music]');
    }
    if(tracks.length) {filters.push(`${tracks.join('')}amix=inputs=${tracks.length}:duration=longest:normalize=0,alimiter=limit=0.95[audio]`);args.push('-c:a','aac','-b:a','128k');} else args.push('-an');
    args.push('-filter_complex',filters.join(';'),'-map','[finished]');
    if(tracks.length)args.push('-map','[audio]');
    args.push('-t',String(duration),'-c:v','libx264','-threads','1','-preset','veryfast','-crf','24','-movflags','+faststart',out);
    await run(process.env.FFMPEG_BIN || 'ffmpeg',args,{timeout:180000,maxBuffer:1024*1024});
    return await fs.readFile(out);
  } finally { await fs.rm(dir,{recursive:true,force:true}); }
}
module.exports={render,picture,normalizePhoto,normalizeAudio,audioDuration,musicWav,available,wrap,captionScenes,captionTimeline,cardSvg,closingCard};
