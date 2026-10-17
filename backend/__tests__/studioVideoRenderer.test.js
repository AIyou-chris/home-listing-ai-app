const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');const {execFile}=require('node:child_process');const {promisify}=require('node:util');
const renderer=require('../services/studioVideoRenderer');const run=promisify(execFile);
test('audio decoder rejects playlists and oversized data without fetching external media',async()=>{
  if(!await renderer.available())return;
  await assert.rejects(renderer.normalizeAudio(Buffer.from('#EXTM3U\nhttps://example.com/audio.mp3\n')));
  await assert.rejects(renderer.normalizeAudio(Buffer.alloc(8*1024*1024+1)),/smaller/);
});
test('voice export retains the full recording and outputs playable H264/AAC; silent export has no audio',async t=>{
  if(!await renderer.available()){t.skip('FFmpeg not installed');return;}
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'hlai-render-test-'));
  try {
    const voice=await renderer.normalizeAudio(renderer.musicWav('calm',16));
    const campaign={brief:{videoFormat:'landscape',videoDuration:'15',narration:'saved',music:'upbeat',captionSize:'large',videoStyle:'dark'},outputs:{title:'A safe draft',videoScript:'One sentence. Another sentence.'}};
    const filename=path.join(dir,'voiced.mp4');await fs.writeFile(filename,await renderer.render(campaign,null,{voice,aiVoice:true}));
    const probe=async file=>JSON.parse((await run(process.env.FFPROBE_BIN||'ffprobe',['-v','error','-show_entries','stream=codec_name,width,height:format=duration','-of','json',file])).stdout);
    const voiced=await probe(filename);assert.ok(Number(voiced.format.duration)>=17);assert.deepEqual(voiced.streams.map(s=>s.codec_name),['h264','aac']);assert.equal(voiced.streams[0].width,960);
    const silent=path.join(dir,'silent.mp4');await fs.writeFile(silent,await renderer.render({...campaign,brief:{...campaign.brief,narration:'none',music:'none'}}));assert.deepEqual((await probe(silent)).streams.map(s=>s.codec_name),['h264']);
    const svg=renderer.cardSvg({title:'Title',lines:['Captions'],width:540,height:960,videoStyle:'dark',aiVoice:true}).toString();assert.match(svg,/AI-generated voice/);assert.match(svg,/#0f172a/);
  } finally {await fs.rm(dir,{recursive:true,force:true});}
});

test('caption changes prefer nearby voice pauses while retaining the complete ordered timeline',()=>{
 const scenes=[['First sentence here.'],['Second sentence here.'],['Third sentence here.']];
 assert.deepEqual(renderer.captionTimeline(scenes,9,[2.7,6.3]),[2.7,6.3,9]);
 assert.deepEqual(renderer.captionTimeline(scenes,9,[.1,8.9]),[3,6,9]);
});

test('very short caption cards keep increasing timestamps after pause adjustment',()=>{
 const scenes=Array.from({length:30},()=>['A short caption']);const boundaries=renderer.captionTimeline(scenes,12,[.7,1.5,2.1,3.2]);
 assert.equal(boundaries.at(-1),12);assert.ok(boundaries.every((time,i)=>i===0||time>boundaries[i-1]));
});

test('picture layout keeps a finished picture whole and makes a playable video', { skip: false }, async (t) => {
  const renderer = require('../services/studioVideoRenderer');
  if (!(await renderer.available())) return t.skip('ffmpeg not available here');
  const sharp = require('sharp');
  const photo = await sharp({ create: { width: 1080, height: 1080, channels: 3, background: { r: 30, g: 40, b: 120 } } }).composite([{input:Buffer.from('<svg width="1080" height="1080"><rect x="100" y="100" width="880" height="880" fill="none" stroke="white" stroke-width="50"/><circle cx="540" cy="540" r="200" fill="red"/></svg>')}]).jpeg().toBuffer();
  const mp4 = await renderer.render({ brief: { videoFormat: 'vertical', videoDuration: '15', layout: 'picture', endCard: 'none' }, outputs: { title: 'T', videoScript: 'One line. Another line.' } }, photo);
  assert.ok(mp4.length > 2000);
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'hlai-motion-test-'));
  try {
    const file=path.join(dir,'moving.mp4');await fs.writeFile(file,mp4);
    const frame=async seconds=>{const {stdout}=await run(process.env.FFMPEG_BIN||'ffmpeg',['-hide_banner','-loglevel','error','-ss',String(seconds),'-i',file,'-frames:v','1','-f','image2pipe','-vcodec','png','pipe:1'],{encoding:'buffer',maxBuffer:2e6});return sharp(stdout).greyscale().raw().toBuffer();};
    const first=await frame(1),later=await frame(10);let difference=0;for(let i=0;i<first.length;i++)difference+=Math.abs(first[i]-later[i]);
    assert.ok(difference/first.length>1,'The finished picture must visibly move between frames');
  } finally {await fs.rm(dir,{recursive:true,force:true});}
});

test('upbeat music has distinct percussion rather than the calm pad with a quiet melody',()=>{
 const highFrequencyEnergy=bytes=>{let energy=0;for(let i=46;i<bytes.length;i+=2){const change=bytes.readInt16LE(i)-bytes.readInt16LE(i-2);energy+=change*change;}return energy;};
 const calm=renderer.musicWav('calm',4),upbeat=renderer.musicWav('upbeat',4);
 assert.ok(highFrequencyEnergy(upbeat)>highFrequencyEnergy(calm)*4,'Upbeat needs audible percussion transients');
});
