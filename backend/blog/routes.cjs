'use strict';
const path=require('node:path'),fs=require('node:fs/promises');const {createBlogService}=require('./service.cjs');const render=require('./render.cjs');const {pillars}=require('./plan.json');
function mountBlog(app,{db,openai,verifyAdmin,leadLimiter,env=process.env,service:createService,runSchedule=true}){
 const service=createService||createBlogService({db,openai,env});
 const handle=action=>async(req,res)=>{try{await action(req,res);}catch(e){res.status(e.status||503).json({error:e.status?e.message:'Blog unavailable. Please try again.',errors:e.errors||[]});}};
 const html=(res,value,preview=false)=>{res.set('Content-Security-Policy',"default-src 'self'; img-src 'self' https: data:; script-src 'self' 'unsafe-inline'; style-src 'self'; frame-ancestors 'self'; form-action 'self'; base-uri 'none'; object-src 'none'");res.set('Cache-Control',preview?'no-store':'public, max-age=0, must-revalidate');if(preview)res.set('X-Robots-Tag','noindex, nofollow');res.type('html').send(value);};
 app.get('/blog/assets/:file',handle(async(req,res)=>{if(!/^(blog\.(css|js)|[a-z-]+\.webp)$/.test(req.params.file))return res.sendStatus(404);res.set('Cache-Control','public, max-age=3600');res.sendFile(path.join(__dirname,'assets',req.params.file));}));
 app.get('/blog/indexnow-key.txt',(req,res)=>env.INDEXNOW_KEY?res.type('text').send(env.INDEXNOW_KEY):res.sendStatus(404));
 app.get('/blog/rss.xml',handle(async(_req,res)=>res.type('application/rss+xml').send(render.rss(await service.publicPosts()))));
 app.get('/blog/author/chris-potter',(_req,res)=>html(res,render.author()));
 app.get('/blog/topic/:pillar',handle(async(req,res)=>{if(!pillars.some(p=>p.slug===req.params.pillar))return res.sendStatus(404);html(res,render.index(await service.publicPosts(),req.params.pillar));}));
 app.get('/blog',handle(async(_req,res)=>html(res,render.index(await service.publicPosts()))));
 app.get('/blog/:slug',handle(async(req,res)=>{const posts=await service.publicPosts(),post=posts.find(p=>p.slug===req.params.slug);if(!post)return res.status(404).type('html').send(render.shell({title:'Article not found',noindex:true,body:'<main id="main" class="reading"><h1>This article is not available.</h1><a href="/blog">Read the field notes</a></main>'}));html(res,render.article(post,posts));}));
 app.get('/tools/cost-per-closed-loan',(_req,res)=>html(res,render.calculator()));
 app.get('/sitemap.xml',handle(async(_req,res)=>{let base='';try{base=await fs.readFile(path.join(__dirname,'../../public/sitemap.xml'),'utf8');}catch{}res.type('application/xml').send(render.sitemap(await service.publicPosts(),base));}));
 app.get('/api/admin/blog/posts/:id/preview',verifyAdmin,handle(async(req,res)=>html(res,service.preview?await service.preview(req.user.id,req.params.id):render.article(await service.get(req.params.id),await service.all(),{preview:true}),true)));
 app.post('/api/admin/blog/seed',verifyAdmin,handle(async(_req,res)=>res.json(await service.seed())));
 app.post('/api/admin/blog/posts/:id/write',verifyAdmin,handle(async(req,res)=>res.json(await service.generate(req.user.id,{id:req.params.id}))));
 app.get('/api/admin/blog/calendar',verifyAdmin,handle(async(_req,res)=>res.json({rhythm:{launch:'Weeks 1–4: 2–3 articles/week, five hubs and five referral spokes',ongoing:'Months 2–3: two spokes/week; one in five for agents',refresh:'Refresh two oldest posts monthly',quarterly:'Review Search Console queries ranking 8–20',social:'Two social drafts per day; separate from article publishing'},posts:(await service.all()).filter(p=>p.scheduled_at)})));
 app.post('/api/public/blog/events',leadLimiter,handle(async(req,res)=>{await service.recordEvent(req.body||{});res.json({ok:true});}));
 app.post('/api/public/blog/lead',leadLimiter,handle(async(req,res)=>res.json(await service.lead(req.body||{}))));
 app.get('/api/public/blog/download/:token',leadLimiter,handle(async(req,res)=>{res.set('Cache-Control','no-store');res.set('Content-Disposition','attachment; filename="loan-officer-worksheet.pdf"');res.type('application/pdf').send(service.download(req.params.token));}));
 if(runSchedule&&String(env.BLOG_SCHEDULER||'').toLowerCase()==='true'){const timer=setInterval(()=>service.publishDue().catch(e=>console.warn('[Blog schedule]',e.message)),60000);timer.unref();}
 return service;
}
module.exports={mountBlog};
