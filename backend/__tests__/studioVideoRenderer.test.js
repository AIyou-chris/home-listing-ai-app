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
