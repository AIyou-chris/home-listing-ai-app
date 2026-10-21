const test=require('node:test');const assert=require('node:assert/strict');
const {createMediaService,hash}=require('../services/adminMarketingMedia');
const {wrap,captionScenes,cardSvg,normalizePhoto}=require('../services/studioVideoRenderer');
const OWNER='11111111-1111-4111-8111-111111111111',OTHER='22222222-2222-4222-8222-222222222222',ID='33333333-3333-4333-8333-333333333333';
const outputs=Object.fromEntries(['title','blog','emailSubject','email','linkedin','facebook','instagram','bluesky','videoScript','imagePrompt'].map(x=>[x,'Safe draft']));
function setup(opts={}){
 const campaigns=[{id:ID,owner_id:OWNER,status:'draft',updated_at:'2026-10-04T00:00:00Z',outputs,brief:{videoFormat:'vertical',videoDuration:'15'}}];const media=[];const files=new Map();let calls=0;let rejectUpload=false;let release;let voiceCalls=0;
 class Query{constructor(name){this.name=name;this.filters=[];this.mode='select';}select(){return this;}eq(k,v){this.filters.push(row=>row[k]===v);return this;}maybeSingle(){this.one=true;return this;}single(){this.one=true;return this;}insert(v){this.mode='insert';this.value=v;return this;}update(v){this.mode='update';this.value=v;return this;}delete(){this.mode='delete';return this;}then(resolve,reject){try{const rows=this.name==='admin_marketing_campaigns'?campaigns:media;let found=rows.filter(r=>this.filters.every(f=>f(r)));if(this.mode==='insert'){if(rows.some(r=>r.campaign_id===this.value.campaign_id&&r.kind===this.value.kind))return Promise.resolve({error:{code:'23505'}}).then(resolve,reject);rows.push(structuredClone(this.value));found=[rows.at(-1)];}if(this.mode==='delete')found.forEach(r=>rows.splice(rows.indexOf(r),1));if(this.mode==='update')found.forEach(r=>Object.assign(r,structuredClone(this.value)));return Promise.resolve({data:structuredClone(this.one?found[0]||null:found),error:null}).then(resolve,reject);}catch(e){return Promise.reject(e).then(resolve,reject);}} }
 const db={from:name=>new Query(name),storage:{from:()=>({upload:async(path,bytes)=>{if(rejectUpload)return {error:{message:'offline'}};files.set(path,bytes);return {data:{path},error:null};},remove:async paths=>{paths.forEach(p=>files.delete(p));return {data:[],error:null};},createSignedUrl:async path=>({data:{signedUrl:'https://private.example/'+path},error:null}),download:async path=>({data:new Blob([files.get(path)]),error:null})})}};
 const video={available:async()=>true,picture:async()=>Buffer.from('picture'),normalizePhoto:async()=>Buffer.from('normalized'),normalizeAudio:async bytes=>{if(bytes.toString()==='bad')throw Error('bad audio');return Buffer.from('normalized audio');},render:async()=>{calls++;await new Promise(resolve=>{release=resolve;});return Buffer.from('mp4');}};
 const openai={audio:{speech:{create:async()=>{voiceCalls++;return new Response('spoken script');}}},images:{generate:async()=>({data:[{b64_json:Buffer.from('ai').toString('base64')}]})}};
 return {service:createMediaService({db,video:opts.video||video,openai}),campaigns,media,files,calls:()=>calls,voiceCalls:()=>voiceCalls,release:()=>release(),rejectUpload:()=>{rejectUpload=true;}};
}
const body={version:'2026-10-04T00:00:00Z'};
test('media ownership, saved edits and input validation are enforced',async()=>{const t=setup();await assert.rejects(t.service.picture(OTHER,ID,body),/not found/);await assert.rejects(t.service.picture(OWNER,ID,{version:'old'}),/latest edits/);await assert.rejects(t.service.picture(OWNER,ID,{...body,data:'data:text/html;base64,WA=='}),/Choose/);assert.equal(t.files.size,0);});
test('private pictures replace old files and content edits mark templates stale',async()=>{const t=setup();await t.service.picture(OWNER,ID,body);const [a]=await t.service.list(OWNER,ID);assert.equal(a.stale,false);assert.match(a.url,/private/);await t.service.picture(OWNER,ID,body);assert.equal(t.files.size,1);t.campaigns[0].outputs={...outputs,title:'Changed title'};assert.equal((await t.service.list(OWNER,ID))[0].stale,true);await assert.rejects(t.service.render(OWNER,ID,body),/Refresh your picture/);});
test('duplicate rendering is rejected; changing picture invalidates a finished video',async()=>{const t=setup();await t.service.picture(OWNER,ID,body);await t.service.render(OWNER,ID,body);await assert.rejects(t.service.render(OWNER,ID,body),/being made/);assert.equal(t.calls(),1);t.release();await new Promise(r=>setTimeout(r,10));let items=await t.service.list(OWNER,ID);assert.equal(items.find(m=>m.kind==='video').stale,false);await t.service.picture(OWNER,ID,body);items=await t.service.list(OWNER,ID);assert.equal(items.find(m=>m.kind==='video').stale,true);});
test('upload failures are visible and the legacy AI shortcut cannot skip review',async()=>{const t=setup();t.rejectUpload();await assert.rejects(t.service.picture(OWNER,ID,body),/confirm/);assert.equal(t.media[0].status,'failed');const u=setup();await assert.rejects(u.service.picture(OWNER,ID,{...body,ai:true}),/Make three choices/);assert.equal(u.files.size,0);});
test('rendered captions preserve words and escape hostile SVG; photo decoder rejects arbitrary bytes',async()=>{assert.equal(wrap('one two three four',8).join(' '),'one two three four');assert.deepEqual(captionScenes('First short sentence. Second short sentence.',24,1),[['First short sentence.'],['Second short sentence.']]);const svg=cardSvg({title:'<script>bad</script>',lines:['& " <'],width:540,height:960}).toString();assert.ok(!svg.includes('<script>'));assert.match(svg,/&lt;script&gt;/);await assert.rejects(normalizePhoto(Buffer.from('<svg onload="bad"/>')));assert.notEqual(hash({outputs,brief:{videoFormat:'vertical',videoDuration:'15'}}),hash({outputs,brief:{videoFormat:'vertical',videoDuration:'30'}}));});
test('replacing media clears approval, and outdated media cannot be approved',async()=>{const t=setup();t.campaigns[0].status='approved';await t.service.picture(OWNER,ID,body);assert.equal(t.campaigns[0].status,'draft');await t.service.reviewable(OWNER,ID);t.campaigns[0].outputs={...outputs,imagePrompt:'A different picture'};await assert.rejects(t.service.reviewable(OWNER,ID),/outdated/);});

test('audio ownership and invalid uploads prevent paid voice calls',async()=>{const t=setup();await assert.rejects(t.service.audio(OTHER,ID,{...body,ai:true}),/not found/);await assert.rejects(t.service.audio(OWNER,ID,{...body,data:'data:audio/mpeg;base64,YmFk'}),/readable/);await assert.rejects(t.service.audio(OWNER,ID,{...body,kind:'music',ai:true}),/file first/);t.campaigns[0].outputs={...outputs,videoScript:'word '.repeat(201)};await assert.rejects(t.service.audio(OWNER,ID,{...body,ai:true}),/200 words/);assert.equal(t.voiceCalls(),0);});
test('voice budget survives uploads and script changes invalidate voice',async()=>{const t=setup();for(let i=0;i<3;i++){await t.service.audio(OWNER,ID,{...body,ai:true});await new Promise(r=>setTimeout(r,10));}assert.equal(t.voiceCalls(),3);await assert.rejects(t.service.audio(OWNER,ID,{...body,ai:true}),/three AI voice/);await t.service.audio(OWNER,ID,{...body,data:'data:audio/mpeg;base64,eA=='});assert.equal(t.media[0].ai_attempts,3);assert.equal(t.files.size,1);t.campaigns[0].outputs={...outputs,videoScript:'Different script'};assert.equal((await t.service.list(OWNER,ID))[0].stale,true);t.campaigns[0].brief.narration='saved';await assert.rejects(t.service.render(OWNER,ID,body),/voice choice changed/);t.campaigns[0].brief.narration='none';await t.service.reviewable(OWNER,ID);});
test('selected missing voice/music prevents rendering and approval',async()=>{const t=setup();t.campaigns[0].brief.narration='saved';await assert.rejects(t.service.render(OWNER,ID,body),/voice first/);await assert.rejects(t.service.reviewable(OWNER,ID),/Finish/);t.campaigns[0].brief.narration='none';t.campaigns[0].brief.music='upload';await assert.rejects(t.service.render(OWNER,ID,body),/music first/);});

test('a photo saved with a brief persists after generation and content edits without a paid call',async()=>{
 const t=setup();t.campaigns[0].status='brief';t.campaigns[0].outputs={};
 await t.service.picture(OWNER,ID,{...body,data:'data:image/png;base64,eA=='});
 assert.equal(t.files.size,1);assert.equal(t.campaigns[0].status,'brief');
 assert.equal((await t.service.list(OWNER,ID))[0].source,'upload');
 t.campaigns[0].status='draft';t.campaigns[0].outputs={...outputs,title:'Changed after generation'};
 const [saved]=await t.service.list(OWNER,ID);assert.equal(saved.stale,false);assert.match(saved.url,/private/);assert.equal(t.calls(),0);
});
test('briefs accept only real validated uploads, never template or paid creation',async()=>{
 const t=setup();t.campaigns[0].status='brief';t.campaigns[0].outputs={};
 await assert.rejects(t.service.picture(OWNER,ID,body),/drafts first/);
 await assert.rejects(t.service.picture(OTHER,ID,{...body,data:'data:image/png;base64,eA=='}),/not found/);
 await assert.rejects(t.service.picture(OWNER,ID,{...body,data:'data:text/html;base64,eA=='}),/Choose/);
 t.campaigns[0].status='generating';await assert.rejects(t.service.picture(OWNER,ID,{...body,data:'data:image/png;base64,eA=='}),/Wait for campaign/);
 assert.equal(t.files.size,0);
});
test('media deletion checks owner and version, removes only chosen file and clears approval',async()=>{
 const t=setup();await t.service.picture(OWNER,ID,{...body,data:'data:image/png;base64,eA=='});
 await assert.rejects(t.service.remove(OTHER,ID,'image',body.version),/not found/);
 await assert.rejects(t.service.remove(OWNER,ID,'image','old'),/changed/);
 await assert.rejects(t.service.remove(OWNER,ID,'unknown',body.version),/valid media/);
 t.campaigns[0].status='approved';assert.deepEqual(await t.service.remove(OWNER,ID,'image',body.version),[]);
 assert.equal(t.files.size,0);assert.equal(t.campaigns[0].status,'draft');
});
test('active media prevents file or whole-campaign deletion',async()=>{
 const t=setup();await t.service.picture(OWNER,ID,body);t.media[0].status='processing';
 await assert.rejects(t.service.remove(OWNER,ID,'image',body.version),/finish/);
 await assert.rejects(t.service.cleanup(OWNER,ID),/finish/);assert.equal(t.files.size,1);
});
test('deleted scripts prevent voice charges and rendering',async()=>{
 const t=setup();t.campaigns[0].outputs={...outputs,videoScript:''};
 await assert.rejects(t.service.audio(OWNER,ID,{...body,ai:true}),/video script/);
 await assert.rejects(t.service.render(OWNER,ID,body),/video script/);assert.equal(t.voiceCalls(),0);assert.equal(t.calls(),0);
});

test('actual photo decoder persists a valid PNG as a normalized JPEG',async()=>{
 const sharp=require('sharp');const png=await sharp({create:{width:4,height:4,channels:3,background:'#ffffff'}}).png().toBuffer();
 const jpeg=await normalizePhoto(png);const meta=await sharp(jpeg).metadata();assert.equal(meta.format,'jpeg');assert.equal(meta.width,4);assert.equal(meta.height,4);
});

test('an animated explainer goes through the real Studio path: no picture or voice needed, a real MP4 is saved, a missing choice is refused',async(t)=>{
 const real=require('../services/studioVideoRenderer');
 if(!await real.available())return t.skip('FFmpeg is not installed here');
 const x=setup({video:real});
 x.campaigns[0].brief={...x.campaigns[0].brief,layout:'explainer',explainer:'buyer-chat'};
 x.campaigns[0].outputs={...outputs,videoScript:'A buyer asks a question at night and the AI answers.'};
 await x.service.render(OWNER,ID,body);
 for(let i=0;i<120&&!x.media.find(m=>m.kind==='video'&&m.status==='ready');i++)await new Promise(r=>setTimeout(r,250));
 const video=x.media.find(m=>m.kind==='video');
 assert.equal(video.status,'ready',video.error||'video did not finish');
 const bytes=[...x.files.entries()].find(([k])=>/\.mp4$/.test(k))?.[1];
 assert.equal(Buffer.from(bytes).subarray(4,8).toString(),'ftyp');
 assert.ok(bytes.length>100000);
 // an explainer layout with no scene chosen is refused before anything is made
 const y=setup({video:real});
 y.campaigns[0].brief={...y.campaigns[0].brief,layout:'explainer'};
 y.campaigns[0].outputs={...outputs,videoScript:'Words.'};
 await assert.rejects(y.service.render(OWNER,ID,body),/Choose which animated explainer/);
});
