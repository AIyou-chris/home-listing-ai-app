'use strict';
const crypto=require('node:crypto'),fs=require('node:fs/promises'),path=require('node:path');
const {checks,sanitize,slugify,plain,writerPrompt,COMPLIANCE}=require('./rules.cjs');
const render=require('./render.cjs');const {submitUrl}=require('./indexnow.cjs');const plan=require('./plan.json');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fields=['title','slug','content','excerpt','featured_image','featured_image_alt','status','seo_title','seo_description','seo_keywords','short_answer','faq','pillar','role','target_keyword','search_intent','hub_slug','related_slugs','planned_links','author','compliance_note','scheduled_at','lead_magnet'];
class BlogError extends Error{constructor(status,message,errors=[]){super(message);this.status=status;this.errors=errors;}}
const requireId=id=>{if(!UUID.test(id||''))throw new BlogError(400,'Invalid article ID.');return id;};
function result(r){if(r.error)throw new BlogError(r.error.code==='23505'?409:503,r.error.code==='23505'?'That slug already exists. Choose another.':'Article storage is unavailable.');return r.data;}
function pdf(lines){
 // Small, dependency-free text PDF. Data is escaped; no HTML, scripts or external fetches.
 const rows=lines.flatMap(line=>String(line).replace(/[^\x20-\x7e]/g,'-').match(/.{1,82}(?:\s|$)|.{1,82}/g)||['']).slice(0,46);
 const escape=s=>s.replace(/[\\()]/g,'\\$&');
 const stream='BT /F1 11 Tf 50 790 Td 15 TL '+rows.map((line,i)=>(i?'T* ':'')+'('+escape(line)+') Tj').join('\n')+' ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length '+Buffer.byteLength(stream)+' >>\nstream\n'+stream+'\nendstream'];
 let data='%PDF-1.4\n',offsets=[0];objects.forEach((object,i)=>{offsets.push(Buffer.byteLength(data));data+=(i+1)+' 0 obj\n'+object+'\nendobj\n';});const xref=Buffer.byteLength(data);data+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';return Buffer.from(data);
}
const WORKSHEETS={
 'agent-partner-pitch':['Agent Partner Pitch Script','HomeListingAI - Chris Potter','', 'First message:','Hi [name], I noticed [specific listing detail]. I can help answer the financing questions buyers ask after a showing. Would a short, approved buyer-question checklist be useful before your next open house? No referral commitment needed.','', 'Before you send:','1. Replace the bracketed details with a real listing observation.','2. Ask permission before sending attachments or demonstrations.','3. Offer a small useful next step, not a promise or referral trade.','4. Let the agent choose whether to continue.','5. Ask your compliance team to review any shared marketing plan.','', 'Follow-up:','Hi [name], did that checklist fit the questions you are hearing? Happy to adjust it for your next listing. If this is not useful right now, I will leave it there.','', 'No payments, gifts or services in exchange for referrals.','This is not legal advice - check with your compliance team.'],
 'respa-checklist':['Co-Marketing Review Checklist','HomeListingAI - Chris Potter','This is a review aid, not a legal determination.','', '1. Describe the actual advertising or service being purchased.','2. Never condition a payment, gift or benefit on referrals.','3. Document reasonable market value for actual services.','4. Allocate shared costs in proportion to actual use and benefit.','5. Do not automatically assume a 50/50 split is appropriate.','6. Keep invoices, deliverables and your allocation rationale.','7. Obtain your company compliance review before committing.','8. Recheck when the scope or parties change.','', 'Official reference: consumerfinance.gov, Regulation X 1024.14.','This is not legal advice - check with your compliance team.']
};
function createBlogService({db,openai,env=process.env,fetchImpl=fetch,now=()=>new Date().toISOString()}){
 const downloadSecret=env.BLOG_DOWNLOAD_SECRET || (env.SUPABASE_SERVICE_ROLE_KEY ? crypto.createHmac('sha256',env.SUPABASE_SERVICE_ROLE_KEY).update('hlai-blog-download-v1').digest('hex') : null);
 const table=()=>{if(!db)throw new BlogError(503,'Article storage is unavailable.');return db.from('blog_posts');};
 let scheduling=false;
 async function get(id){const p=result(await table().select('*').eq('id',requireId(id)).maybeSingle());if(!p)throw new BlogError(404,'Article not found.');return p;}
 async function all(){return result(await table().select('*').order('published_at',{ascending:false,nullsFirst:false}).limit(500))||[];}
 async function publicPosts(){return result(await table().select('*').eq('status','published').lte('published_at',now()).order('published_at',{ascending:false}).limit(500))||[];}
 async function ping(post){
  if(post.status!=='published')return {indexNow:'not_published'};
  if(!env.INDEXNOW_KEY)return {indexNow:'missing_key',sitemap:render.SITE+'/sitemap.xml'};
  const response=await submitUrl(render.SITE+'/blog/'+post.slug,{key:env.INDEXNOW_KEY,host:'homelistingai.com',fetchImpl,keyLocation:render.SITE+'/blog/indexnow-key.txt',urls:[render.SITE+'/blog/'+post.slug,render.SITE+'/sitemap.xml']});return {indexNow:response.ok?'accepted':response.status?'status_'+response.status:'failed',sitemap:render.SITE+'/sitemap.xml'};
 }
 async function socialDrafts(post){
  if(!post.author_id)return;
  const url=render.SITE+'/blog/'+post.slug,summary=post.excerpt||plain(post.content).slice(0,250),quoteCards=(post.short_answer||summary).split(/(?<=[.!?])\s+/).concat([post.title,summary]).slice(0,3);
  const outputs={title:post.title,blog:summary,emailSubject:post.title.slice(0,180),email:summary+'\n\n'+url,linkedin:summary+'\n\n'+url,facebook:summary+'\n\n'+url,instagram:summary,bluesky:(summary.slice(0,Math.max(0,290-url.length))+'\n'+url).slice(0,300),videoScript:summary,imagePrompt:post.featured_image_alt||post.title};
  const r=await db.from('admin_marketing_campaigns').upsert({id:crypto.randomUUID(),owner_id:post.author_id,blog_post_id:post.id,brief:{kind:'campaign',idea:'Share article: '+post.title,goal:'Build agent partnerships',tone:'Helpful and confident',audience:'Loan officers and real estate agents',pictureMode:'describe',pictureDescription:post.featured_image_alt||post.title,photoName:'',videoFormat:'vertical',videoDuration:'30',plannedAt:'',articleSlug:post.slug,quoteCards},outputs,status:'draft'},{onConflict:'blog_post_id',ignoreDuplicates:true});
  if(r.error)throw new BlogError(503,'Article saved, but sharing drafts need another try.');
 }
 async function linkOlderPosts(post){
  // Add contextual incoming links without overwriting another editor's changes.
  const candidates=(await publicPosts()).filter(p=>p.id!==post.id&&p.published_at<=post.published_at);const older=[...candidates.filter(p=>p.pillar===post.pillar).reverse(),...candidates.filter(p=>!p.pillar).reverse()].slice(0,2);
  for(const p of older){if((p.related_slugs||[]).includes(post.slug)||String(p.content||'').includes('/blog/'+post.slug))continue;
   const note='<p>'+COMPLIANCE+'</p>';const content=sanitize(p.content||'').replace(p.compliance_note?note:'__no_note__','')+'<p>For a practical next step, read <a href="/blog/'+post.slug+'">'+render.esc(post.title)+'</a>.</p>'+(p.compliance_note?note:'');
   result(await table().update({content,related_slugs:[post.slug,...(p.related_slugs||[])],updated_at:now()}).eq('id',p.id).eq('updated_at',p.updated_at));
  }
 }
 async function afterPublish(post){const distribution=await ping(post);try{await socialDrafts(post);distribution.sharing='ready';}catch{distribution.sharing='retry_needed';}try{await linkOlderPosts(post);distribution.links='updated';}catch{distribution.links='retry_needed';}return distribution;}
 async function save(owner,body){
  if(!UUID.test(owner||''))throw new BlogError(401,'Sign in as an admin.');
  const existing=body.id?await get(body.id):null;if(existing&&body.updated_at!==existing.updated_at)throw new BlogError(409,'This article changed. Reload before saving.');
  const patch={};for(const key of fields)if(body[key]!==undefined)patch[key]=body[key];
  const p={...(existing||{}),...patch};p.slug=slugify(p.slug||p.title);
  if(!p.title||p.title.length>200||!p.slug||p.slug.length>180||String(p.content||'').length>120000)throw new BlogError(400,'Check the title, slug and article length.');
  if(!['brief','draft','scheduled','published','archived'].includes(p.status||'draft'))throw new BlogError(400,'Choose a valid article status.');
  if(!['hub','spoke','tool'].includes(p.role||'spoke')||p.pillar&&!plan.pillars.some(x=>x.slug===p.pillar))throw new BlogError(400,'Choose a valid topic and article type.');
  if(p.faq&&!Array.isArray(p.faq)||p.related_slugs&&!Array.isArray(p.related_slugs))throw new BlogError(400,'Check the article links and FAQ.');
  const review=checks(p);if(['published','scheduled'].includes(p.status)&&!review.ok)throw new BlogError(422,'Fix these items before publishing.',review.errors);
  if(p.status==='scheduled'&&(!p.scheduled_at||!Number.isFinite(Date.parse(p.scheduled_at))||Date.parse(p.scheduled_at)<=Date.parse(now())))throw new BlogError(400,'Choose a future date and time.');
  Object.assign(patch,{slug:p.slug,status:p.status||'draft',content:review.content,review_errors:review.errors,reading_minutes:review.reading_minutes,author:'Chris Potter',author_id:existing?.author_id||owner,updated_at:now(),published_at:p.status==='published'?(existing?.published_at||now()):null});
  if(existing)patch.updated_at=new Date(Math.max(Date.parse(now()),Date.parse(existing.updated_at)+1)).toISOString();
  const q=existing?table().update(patch).eq('id',existing.id).eq('updated_at',existing.updated_at):table().insert(patch);
  const post=result(await q.select('*').maybeSingle());if(!post)throw new BlogError(409,'Article changed. Reload before saving.');
  let distribution=null;if(post.status==='published')distribution=await afterPublish(post);
  return {post,review,distribution};
 }
 async function generate(owner,body){
  const existing=body.id?await get(body.id):null;
  if(existing?.status==='published')throw new BlogError(409,'Save a reviewed draft before replacing a live article.');
  if(existing?.generation_attempts>=3)throw new BlogError(409,'This brief has used its three writing attempts. Edit it by hand.');
  if(existing?.generation_started_at&&Date.parse(now())-Date.parse(existing.generation_started_at)<180000)throw new BlogError(409,'This article is still being written.');
  if(!openai)throw new BlogError(503,'AI writing is not configured.');
  if(existing){const claimed=result(await table().update({generation_attempts:existing.generation_attempts+1,generation_started_at:now()}).eq('id',existing.id).eq('updated_at',existing.updated_at).eq('generation_attempts',existing.generation_attempts).select('id').maybeSingle());if(!claimed)throw new BlogError(409,'Another writer already started this brief.');}
  const brief=existing||{title:String(body.idea||'').slice(0,4000),role:'spoke',pillar:'lo-marketing',compliance_note:true,related_slugs:[]};
  if(!brief.title)throw new BlogError(400,'Choose a brief or enter an idea.');
  try{const c=await openai.chat.completions.create({model:'gpt-4.1-mini',response_format:{type:'json_object'},max_tokens:14000,temperature:.5,messages:[{role:'system',content:writerPrompt(brief)},{role:'user',content:'Write the complete draft.'}]},{timeout:180000,maxRetries:0});if(c.choices[0].finish_reason!=='stop')throw Error('incomplete');
   const raw=JSON.parse(c.choices[0].message.content),post={...brief,...raw,slug:existing?.slug||slugify(raw.title),status:'draft',featured_image:brief.featured_image||'/blog/assets/'+brief.pillar+'.webp',featured_image_alt:brief.featured_image_alt||raw.title,author:'Chris Potter'};
   if(existing){const saved=await save(owner,{...post,id:existing.id,updated_at:existing.updated_at});await table().update({generation_started_at:null}).eq('id',existing.id);return saved;}
   return {post,review:checks(post)};
  }catch(error){if(existing)await table().update({generation_started_at:null}).eq('id',existing.id);if(error instanceof BlogError)throw error;throw new BlogError(502,'Writing did not finish. Your brief is saved; try again or edit it.');}
 }
 async function publishDue(){if(scheduling)return;scheduling=true;try{const due=result(await table().select('*').eq('status','scheduled').lte('scheduled_at',now()).limit(20))||[];for(const p of due){const review=checks(p);if(!review.ok){await table().update({status:'draft',review_errors:review.errors,updated_at:now()}).eq('id',p.id).eq('status','scheduled').eq('updated_at',p.updated_at);continue;}const published=result(await table().update({status:'published',published_at:now(),updated_at:now()}).eq('id',p.id).eq('status','scheduled').eq('updated_at',p.updated_at).select('*').maybeSingle());if(published)await afterPublish(published);}}finally{scheduling=false;}}
 async function recordEvent(body){if(!['article_view','scroll_75','cta_click','lead_magnet_signup','trial_start'].includes(body.event)||typeof body.slug!=='string'||body.slug.length>180)throw new BlogError(400,'Invalid event.');const p=result(await table().select('id').eq('slug',body.slug).eq('status','published').maybeSingle());if(!p&&body.slug!=='cost-per-closed-loan')throw new BlogError(404,'Article unavailable.');result(await db.from('blog_events').insert({slug:body.slug,event:body.event}));}
 function downloadToken(body){if(!downloadSecret)throw new BlogError(503,'Download signing needs to be configured.');const data=Buffer.from(JSON.stringify({...body,expires:Date.parse(now())+15*60000})).toString('base64url');return data+'.'+crypto.createHmac('sha256',downloadSecret).update(data).digest('base64url');}
 function download(token){if(!downloadSecret)throw new BlogError(503,'Download signing is unavailable.');const [data,signature]=String(token).split('.'),expected=crypto.createHmac('sha256',downloadSecret).update(data||'').digest('base64url');if(!signature||signature.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))throw new BlogError(403,'This download link is invalid.');let value;try{value=JSON.parse(Buffer.from(data,'base64url').toString());}catch{throw new BlogError(403,'This download link is invalid.');}if(value.expires<Date.parse(now()))throw new BlogError(403,'Your link expired. Request the worksheet again.');let lines=WORKSHEETS[value.magnet];if(value.magnet==='cost-per-closed-loan'){const c=value.calculator||{};lines=['Cost-per-Closed-Loan Worksheet','HomeListingAI - Chris Potter','Use the same period for every input.','Marketing spend: $'+(c.spend||0),'Other acquisition costs: $'+(c.other||0),'Funded loans: '+(c.closed||0),'Cost per closed loan: '+(c.closed?'$'+((c.spend+c.other)/c.closed).toFixed(2):'not defined with zero funded loans'),'This is acquisition cost, not profit or a promised return.'];}if(!lines)throw new BlogError(400,'Invalid worksheet.');return pdf(lines);}
 async function lead(body){
  if(body.website)throw new BlogError(400,'Request unavailable.');
  if(body.consent!==true||typeof body.name!=='string'||!body.name.trim()||body.name.length>100||typeof body.email!=='string'||body.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))throw new BlogError(400,'Add your name, email and download consent.');
  if(!['agent-partner-pitch','respa-checklist','cost-per-closed-loan'].includes(body.magnet))throw new BlogError(400,'Choose a valid worksheet.');
  if(body.slug!=='cost-per-closed-loan'){const post=result(await table().select('id').eq('slug',String(body.slug).slice(0,180)).eq('status','published').maybeSingle());if(!post)throw new BlogError(404,'Article unavailable.');}
  let calculator=null;if(body.magnet==='cost-per-closed-loan'){const c=body.calculator||{spend:0,other:0,closed:0};if(![c.spend,c.other,c.closed].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100000000)||!Number.isInteger(c.closed))throw new BlogError(400,'Check your calculator numbers.');calculator=c;}
  const token=downloadToken({magnet:body.magnet,calculator});
  const settings=result(await db.from('blog_settings').select('lead_owner_id').eq('id',1).maybeSingle());if(!settings?.lead_owner_id)throw new BlogError(503,'Lead inbox needs to be configured.');
  result(await db.from('leads').insert({user_id:settings.lead_owner_id,name:body.name.trim(),email:body.email.trim().toLowerCase(),source:'blog',status:'New',source_type:'blog',source_key:String(body.slug).slice(0,180),source_meta:{article_slug:body.slug,magnet:body.magnet,download_consent:true,consent_at:now(),newsletter_consent:false},consent_sms:false}));
  return {download:'/api/public/blog/download/'+token};
 }
 async function seed(){const posts=await all(),known=new Set(posts.map(p=>p.slug));let count=0;for(const brief of plan.posts){if(known.has(brief.slug))continue;let p={...brief,content:'',excerpt:'Editorial brief: '+brief.title,featured_image:'/blog/assets/'+brief.pillar+'.webp',featured_image_alt:brief.title};try{p={...p,...JSON.parse(await fs.readFile(path.join(__dirname,'content',brief.slug+'.json'),'utf8'))};}catch{}const review=p.content?checks(p):null;if(review&&!review.ok)throw new BlogError(422,'Seed article needs review: '+p.slug,review.errors);delete p.planned_links_dummy;if(review){p.content=review.content;p.reading_minutes=review.reading_minutes;}const inserted=await table().upsert({...p,published_at:null,updated_at:now()},{onConflict:'slug',ignoreDuplicates:true});result(inserted);count++;}return {added:count};}
 return {get,all,publicPosts,save,generate,publishDue,ping,afterPublish,lead,download,recordEvent,seed};
}
module.exports={createBlogService,BlogError,pdf,WORKSHEETS};
