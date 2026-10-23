'use strict';
const PREFIX='https://homelistingai.com/api/public/marketing-images/';
const imageId=url=>typeof url==='string'&&url.startsWith(PREFIX)&&/^[0-9a-f-]{36}$/i.test(url.slice(PREFIX.length))?url.slice(PREFIX.length):null;
async function publishedImage(db,id,now=new Date().toISOString()) {
 if(!/^[0-9a-f-]{36}$/i.test(id||''))return null;
 const post=await db.from('blog_posts').select('id').eq('featured_image',PREFIX+id).eq('status','published').lte('published_at',now).limit(1).maybeSingle();if(post.error||!post.data)return null;
 const image=await db.from('admin_marketing_images').select('path,checks,approved').eq('id',id).eq('approved',true).maybeSingle();if(image.error||!image.data||!Array.isArray(image.data.checks?.problems)||image.data.checks.problems.length)return null;
 const blob=await db.storage.from('admin-marketing').download(image.data.path);if(blob.error)return null;
 const type=image.data.path.endsWith('.webp')?'image/webp':image.data.path.endsWith('.avif')?'image/avif':image.data.path.endsWith('.png')?'image/png':'image/jpeg';return {buffer:Buffer.from(await blob.data.arrayBuffer()),type};
}
async function validateBlogImage(db,post,owner){
  const id=imageId(post.featured_image);if(!id){if(String(post.featured_image||'').includes('/api/public/marketing-images/'))throw Error('Choose a checked picture from the library.');return null;}
  const r=await db.from('admin_marketing_images').select('*').eq('id',id).eq('owner_id',owner).maybeSingle();
  const image=r.data;if(r.error||!image?.approved||image.checks?.problems?.length||!image.review||!['real','idea','brand','honest'].every(k=>image.review[k]===true))throw Error('Review this library picture and click “Use this” before publishing.');
  const recent=await db.from('blog_posts').select('id,featured_image,published_at').eq('status','published').order('published_at',{ascending:false}).limit(2);
  if(recent.error)throw Error('Could not check the last blog hero. Try again.');
  const last=recent.data?.find(p=>p.id!==post.id);if(last?.featured_image===post.featured_image)throw Error('Choose a different hero from the previous blog post.');
  const lastId=imageId(last?.featured_image);if(lastId&&image.background_fingerprint){const old=await db.from('admin_marketing_images').select('background_fingerprint').eq('id',lastId).maybeSingle();if(old.error)throw Error('Could not check the previous hero. Try again.');if(old.data?.background_fingerprint===image.background_fingerprint)throw Error('Choose a different photo from the previous blog hero, even if its size or words change.');}
  return image;
}
async function recordBlogUse(db,post){const id=imageId(post.featured_image);if(!id)return;const r=await db.from('admin_marketing_images').select('used_in').eq('id',id).maybeSingle();if(r.error||!r.data)return;const used=[...(r.data.used_in||[]).filter(u=>u.blog_id!==post.id),{blog_id:post.id,slug:post.slug,use:'blog',status:'published',at:post.published_at}];await db.from('admin_marketing_images').update({used_in:used,updated_at:new Date().toISOString()}).eq('id',id);}
async function performance(db,owner){
 const images=await db.from('admin_marketing_images').select('id,recipe_id,mood,text_zone,used_in').eq('owner_id',owner).eq('approved',true).limit(200);
 if(images.error)throw Error('The picture library needs its database update.');
 const posts=await db.from('blog_posts').select('slug,featured_image,published_at').eq('status','published').limit(500);
 if(posts.error)throw Error('Published article results are unavailable.');
 const ids=(images.data||[]).map(i=>i.id);if(!ids.length)return [];
 const events=await db.from('blog_events').select('marketing_image_id,event').in('marketing_image_id',ids).limit(10000);if(events.error)throw Error('Article tracking results are unavailable.');
 const recipes=new Map();
 for(const image of images.data||[]){const matched=(posts.data||[]).filter(p=>imageId(p.featured_image)===image.id);if(!matched.length)continue;const row=recipes.get(image.recipe_id)||{recipe_id:image.recipe_id,mood:image.mood,text_zone:image.text_zone,views:0,clicks:0,engagement:0,articles:0};const tracked=(events.data||[]).filter(e=>e.marketing_image_id===image.id);row.views+=tracked.filter(e=>e.event==='article_view').length;row.clicks+=tracked.filter(e=>e.event==='cta_click').length;row.engagement+=tracked.filter(e=>e.event==='scroll_75').length;row.articles+=matched.length;recipes.set(image.recipe_id,row);}
 return [...recipes.values()].map(r=>({...r,ctr:r.views?r.clicks/r.views:null})).sort((a,b)=>(b.ctr||0)-(a.ctr||0)||b.views-a.views);
}
module.exports={PREFIX,imageId,validateBlogImage,recordBlogUse,performance,publishedImage};
