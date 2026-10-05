'use strict';
const crypto=require('node:crypto');
const {StudioError}=require('../adminMarketingStudio');
const {SCENES,FORMATS,estimate}=require('./scenes.cjs');
const {writePrompt}=require('./writer.cjs');
const {inspectBackground,compose,readArtwork,validateCopy}=require('./compositor.cjs');
const BUCKET='admin-marketing';const TABLE='admin_marketing_images';
const {performance}=require('./blog.cjs');
function createImageWorkflow({db,openai,jev,campaign,clearApproval,claim,finish,fail,pictureHash,inspect=inspectBackground}) {
  const result=res=>{if(res.error)throw new StudioError(503,'The picture library needs its database update. Your campaign is safe.');return res.data;};
  const table=()=>db.from(TABLE);
  async function library(owner) {
    await campaignAccess(owner);const rows=result(await table().select('*').eq('owner_id',owner).order('created_at',{ascending:false}).limit(200));
    return Promise.all(rows.map(async row=>{const signed=row.path?result(await db.storage.from(BUCKET).createSignedUrl(row.path,3600)):null;const {background_path,path,...safe}=row;return {...safe,url:signed?.signedUrl||null};}));
  }
  async function campaignAccess(owner){if(!/^[0-9a-f-]{36}$/i.test(owner||''))throw new StudioError(401,'Sign in as an admin first.');if(!db)throw new StudioError(503,'Your picture library is unavailable.');}
  async function image(owner,id){await campaignAccess(owner);if(!/^[0-9a-f-]{36}$/i.test(id||''))throw new StudioError(400,'Choose a saved picture.');const row=result(await table().select('*').eq('owner_id',owner).eq('id',id).maybeSingle());if(!row)throw new StudioError(404,'Picture not found.');return row;}
  async function bytes(path){return Buffer.from(await result(await db.storage.from(BUCKET).download(path)).arrayBuffer());}
  async function upload(owner,rowId,buffer,type,extension){const path=`${owner}/library/${rowId}.${extension}`;result(await db.storage.from(BUCKET).upload(path,buffer,{contentType:type,upsert:false}));return path;}
  async function saveOption(owner,campaignRow,direction,background,settings,groupId,cost,cachedOcr) {
    const sharp=require('sharp');const f=FORMATS[direction.format];
    const cropped=await sharp(background,{limitInputPixels:24e6}).rotate().resize(f.width,f.height,{fit:'cover',position:'centre'}).jpeg().toBuffer();
    const check=await inspect(cropped,direction.text_zone,{readWords:typeof cachedOcr==='boolean'?async()=>cachedOcr?[]:['Needs a new word check']:bytes=>readArtwork(bytes,openai)});
    const rendered=await compose(background,{...settings,...direction,headline:settings.headline||'',subline:settings.subline||''});
    const id=crypto.randomUUID();let paths=[];
    try {const backgroundPath=await upload(owner,`${id}-background`,background,'image/jpeg','jpg');paths.push(backgroundPath);const path=await upload(owner,id,rendered.buffer,rendered.type,rendered.extension);paths.push(path);
      result(await table().insert({id,owner_id:owner,campaign_id:campaignRow.id,group_id:groupId,brand:direction.brand,format:direction.format,prompt:direction.prompt,recipe_id:direction.recipe_id,mood:direction.mood,text_zone:direction.text_zone,variant:direction.variant,alt_text:direction.alt_text,cost,width:rendered.width,height:rendered.height,path,background_path:backgroundPath,background_fingerprint:crypto.createHash('sha256').update(background).digest('hex'),source_hash:pictureHash(campaignRow),settings:{headline:settings.headline||'',subline:settings.subline||'',encoding:settings.encoding||null},checks:{problems:[...check.problems,...rendered.problems],contrast:rendered.contrast,bytes:rendered.bytes,ocrPassed:check.ocrPassed,emptySpace:check.emptySpace},approved:false,used_in:[]}));
    }catch(error){if(paths.length)await db.storage.from(BUCKET).remove(paths);throw error;}
  }
  const jobs=new Map();
  return {
    library,
    async review(owner,id,body={}) {
      const selected=await image(owner,id);if(selected.checks.problems.length)throw new StudioError(400,selected.checks.problems[0]);
      if(!['real','idea','brand','honest'].every(key=>body.review?.[key]===true))throw new StudioError(400,'Check the four review boxes before using this picture.');
      result(await table().update({approved:true,review:body.review,updated_at:new Date().toISOString()}).eq('owner_id',owner).eq('id',selected.id));return {ok:true};
    },
    async samples(owner) {
      await campaignAccess(owner);const fs=require('node:fs/promises'),path=require('node:path');const dir=path.resolve(__dirname,'../../assets/marketing-images-review');
      const rows=JSON.parse(await fs.readFile(path.join(dir,'samples.json'),'utf8'));const known=result(await table().select('sample_key').eq('owner_id',owner).limit(200));if(known.length>182)throw new StudioError(429,'Your library is full.');
      let added=0;const groups=new Map();
      for(const sample of rows){if(known.some(r=>r.sample_key===sample.id))continue;const id=crypto.randomUUID();if(!groups.has(sample.group_id))groups.set(sample.group_id,crypto.randomUUID());let paths=[];
        try{const extension=sample.url.split('.').at(-1);const sourceBackground=await fs.readFile(path.join(dir,sample.id+'-background.jpg'));const backgroundPath=await upload(owner,`${id}-background`,sourceBackground,'image/jpeg','jpg');paths.push(backgroundPath);const finishedPath=await upload(owner,id,await fs.readFile(path.join(dir,`${sample.id}.${extension}`)),`image/${extension==='jpg'?'jpeg':extension}`,extension);paths.push(finishedPath);
          result(await table().insert({id,owner_id:owner,campaign_id:null,sample_key:sample.id,group_id:groups.get(sample.group_id),brand:sample.brand,format:sample.format,prompt:sample.prompt,recipe_id:sample.recipe_id,mood:sample.mood,text_zone:sample.text_zone,variant:sample.variant,alt_text:sample.alt_text,cost:sample.cost,width:sample.width,height:sample.height,path:finishedPath,background_path:backgroundPath,source_hash:'sample',background_fingerprint:crypto.createHash('sha256').update(sourceBackground).digest('hex'),settings:{headline:sample.headline,subline:'',sample:true},checks:sample.checks,approved:false,used_in:[]}));added++;
        }catch(e){if(paths.length)await db.storage.from(BUCKET).remove(paths);throw e;}
      }
      return {added};
    },
    async performance(owner){await campaignAccess(owner);return performance(db,owner);},
    async catalog(owner){await campaignAccess(owner);return {recipes:SCENES,formats:FORMATS,costs:Object.fromEntries(Object.keys(FORMATS).map(f=>[f,{set:estimate(f),one:estimate(f,'medium',1),final:estimate(f,'high',1)}]))};},
    async options(owner,id,body={}) {
      const row=await campaign(owner,id);if(body.version!==row.updated_at)throw new StudioError(409,'Save your latest edits first.');
      if(jobs.has(`${owner}:${id}`))throw new StudioError(409,'Your picture choices are still being made. Please wait.');
      if(row.brief.pictureMode==='own')throw new StudioError(400,'You chose your own photo. Upload it instead of paying for AI.');
      const photo=result(await db.from('admin_marketing_media').select('source').eq('owner_id',owner).eq('campaign_id',id).eq('kind','image').maybeSingle());
      if(photo?.source==='upload')throw new StudioError(400,'Your uploaded photo takes priority. No AI picture charge was made.');
      if(!openai)throw new StudioError(503,'AI pictures are not enabled. Upload a photo or use a free picture.');
      const format=body.format||'blog';if(typeof format!=='string'||!Object.hasOwn(FORMATS,format))throw new StudioError(400,'Choose a picture size.');
      if(body.encoding&&!['webp','avif','jpeg','png'].includes(body.encoding))throw new StudioError(400,'Choose WebP, AVIF, JPG or PNG.');
      if(body.final!==undefined&&typeof body.final!=='boolean')throw new StudioError(400,'Choose draft or final quality.');
      if(body.requiresLending)throw new StudioError(400,'This ad needs your official lender badge and verified NMLS number first.');
      if(typeof body.headline!=='string'||body.headline.length>120||body.headline.split(/\s+/).filter(Boolean).length>8)throw new StudioError(400,'Use a headline of eight words or fewer.');
      if(typeof body.subline!=='string'||body.subline.length>90)throw new StudioError(400,'Keep the small line under 90 characters.');
      try{validateCopy(body.headline,body.subline);}catch(e){throw new StudioError(400,e.message);}
      if(body.recipeId&&!SCENES.some(r=>r.id===body.recipeId))throw new StudioError(400,'Choose a saved scene recipe.');
      if(body.tweak&&typeof body.tweak!=='string')throw new StudioError(400,'Describe your tweak in a few words.');
      const {safeDirection}=require('./direction.cjs');
      if(body.tweak)safeDirection(body.tweak);
      if(row.brief.pictureMode==='describe')safeDirection(row.brief.pictureDescription);
      // Verify library migration BEFORE any billable call or approval change.
      const all=result(await table().select('id').eq('owner_id',owner).limit(200));
      if(all.length>197)throw new StudioError(429,'Your picture library is full. No AI charge was made.');
      let previous;
      if(body.imageId){previous=await image(owner,body.imageId);if(previous.campaign_id!==id)throw new StudioError(400,'Tweak a picture from this campaign.');if(previous.source_hash!==pictureHash(row))throw new StudioError(409,'The campaign changed. Make new picture choices first.');}
      if(body.final&&(!previous?.approved||previous.checks.problems.length))throw new StudioError(400,'Use a checked picture before making its high-quality final.');
      const nextRow=await clearApproval(owner,row);const claimed=await claim(owner,nextRow,'image','ai',pictureHash(row));
      const groupId=crypto.randomUUID();const count=previous?1:3;const quality=body.final?'high':'medium';
      let winners=[];try{winners=(await performance(db,owner)).filter(r=>r.views>=20).slice(0,3).map(r=>r.recipe_id);}catch{/* New libraries have no engagement yet. */}
      const job=async()=>{try {
        for(let variant=0;variant<count;variant++) {
          const direction=previous?{prompt:previous.prompt,alt_text:previous.alt_text,text_zone:previous.text_zone,recipe_id:previous.recipe_id,mood:previous.mood,variant:previous.variant,brand:previous.brand,format:previous.format}:await writePrompt({title:row.outputs.title,angle:row.brief.idea,persona:row.brief.audience,description:row.brief.pictureMode==='describe'?row.brief.pictureDescription:'',recipeId:body.recipeId,format,brand:'homelistingai',variant,winners},{openai,jev});
          if(previous&&/move.*\b(left|right)\b/i.test(body.tweak||'')){const move=body.tweak.match(/move.*\b(left|right)\b/i)[1].toLowerCase();direction.text_zone=move==='left'?'right':'left';direction.prompt=direction.prompt.replace(/One subject on the (left|right) third; the (left|right) forty percent remains empty/i,`One subject on the ${move} third; the ${direction.text_zone} forty percent remains empty`);}
          let generated;
          if(previous){const {toFile}=require('openai');const reference=await toFile(await bytes(previous.background_path),'background.jpg',{type:'image/jpeg'});const {heroImagePrompt,safeDirection}=require('./direction.cjs');const tweak=safeDirection(body.tweak||'Keep the same idea and composition; refine natural photographic detail');direction.prompt=heroImagePrompt('',`${direction.prompt.split('\n\n')[0]}. ${tweak}`,previous.brand);generated=await openai.images.edit({model:'gpt-image-1-mini',image:reference,prompt:direction.prompt,size:FORMATS[previous.format].native,quality,output_format:'jpeg',n:1},{timeout:180000,maxRetries:0});}
          else generated=await openai.images.generate({model:'gpt-image-1-mini',prompt:direction.prompt,size:FORMATS[format].native,quality,output_format:'jpeg',n:1},{timeout:180000,maxRetries:0});
          const data=generated.data?.[0]?.b64_json;if(!data)throw new Error('No image returned');
          await saveOption(owner,row,direction,Buffer.from(data,'base64'),previous?{...previous.settings,...body}:body,groupId,estimate(direction.format,quality,1));
        }
        await fail(owner,claimed,new StudioError(400,'Your choices are ready. Check one and click “Use this.”'));
      }catch(error){await fail(owner,claimed,error);}finally{jobs.delete(`${owner}:${id}`);}};
      jobs.set(`${owner}:${id}`,groupId);job().catch(()=>{});
      return {groupId,estimatedCost:estimate(previous?.format||format,quality,count),version:nextRow.updated_at};
    },
    async choose(owner,id,body={}) {
      const row=await campaign(owner,id);if(body.version!==row.updated_at)throw new StudioError(409,'Save or reload your latest edits first.');
      const selected=await image(owner,body.imageId);
      if(selected.checks.problems.length)throw new StudioError(400,selected.checks.problems[0]);
      if(!['real','idea','brand','honest'].every(key=>body.review?.[key]===true))throw new StudioError(400,'Check the four review boxes before using this picture.');
      // Reuse only approved library items; new candidates stay with their campaign.
      if(selected.campaign_id!==id&&!selected.approved)throw new StudioError(400,'Review this picture in its original campaign first.');
      if(selected.campaign_id===id&&selected.source_hash!==pictureHash(row))throw new StudioError(409,'The campaign changed. Make a new picture to match it.');
      await clearApproval(owner,row);const claimed=await claim(owner,row,'image','ai',pictureHash(row),false);
      try{await finish(owner,claimed,await bytes(selected.path),`image/${selected.path.split('.').at(-1)==='jpg'?'jpeg':selected.path.split('.').at(-1)}`);
        result(await table().update({approved:true,review:body.review,used_in:[...selected.used_in.filter(u=>u.campaign_id!==id),{campaign_id:id,use:body.use||'campaign',at:new Date().toISOString()}],updated_at:new Date().toISOString()}).eq('owner_id',owner).eq('id',selected.id));
      }catch(e){await fail(owner,claimed,e);throw e;}
      return {ok:true};
    },
    async layout(owner,id,body={}) {
      const row=await campaign(owner,id);if(body.version!==row.updated_at)throw new StudioError(409,'Save your latest edits first.');
      const selected=await image(owner,body.imageId);
      if(selected.campaign_id!==id&&!selected.approved)throw new StudioError(400,'Review this picture in its original campaign first.');
      const direction={...selected,format:body.format||selected.format};
      const data=await bytes(selected.background_path);
      const all=result(await table().select('id').eq('owner_id',owner).limit(200));if(all.length>=200)throw new StudioError(429,'Your picture library is full.');
      await saveOption(owner,row,direction,data,body,crypto.randomUUID(),0,selected.checks.ocrPassed);
      return {ok:true};
    }
  };
}
module.exports={createImageWorkflow};
