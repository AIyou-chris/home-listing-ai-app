'use strict';
// Explicitly invoked local review samples. Never run by the web server/scheduler.
// Uses the SAME direction, model, compositor and checks as Marketing Studio.
const path=require('node:path');const fs=require('node:fs/promises');const crypto=require('node:crypto');
require('dotenv').config({path:path.resolve(__dirname,'../.env'),quiet:true});
require('dotenv').config({path:path.resolve(__dirname,'../../.env'),quiet:true});
const OpenAI=require('openai');const {writePrompt}=require('../services/marketingImages/writer.cjs');const {FORMATS,SCENES,estimate}=require('../services/marketingImages/scenes.cjs');const {compose,inspectBackground,readArtwork}=require('../services/marketingImages/compositor.cjs');
const specs=[
 {title:'When an agent stops calling',format:'blog',recipeId:'scene-01',headline:'When the calls go quiet'},
 {title:'The Sunday evening buyer text',format:'blog',recipeId:'scene-04',headline:'The lead that arrives after dinner'},
 {title:'Find room for a warmer conversation',format:'linkedin',recipeId:'scene-16',headline:'A warmer lead starts with a question'},
 {title:'Work beside your agent partners',format:'linkedin',recipeId:'scene-18',headline:'Be the partner they remember'},
 {title:'A quieter invitation to reconnect',format:'email',recipeId:'scene-26',headline:'Room for one more conversation'},
 {title:'Talk to the House',format:'landing',recipeId:'scene-31',headline:'A house with answers'}
];
async function main(){
 if(!process.argv.includes('--generate'))throw Error('Pass --generate to explicitly authorize this paid local sample run.');
 const out=path.resolve(__dirname,'../../tmp/marketing-images');await fs.mkdir(out,{recursive:true});const openai=new OpenAI({apiKey:process.env.OPENAI_API_KEY});let manifest=[];
 try {manifest=JSON.parse(await fs.readFile(path.join(out,'samples.json'),'utf8'));}catch{ /* First local run. */ }
 for(let i=0;i<specs.length;i++){
  const spec=specs[i];if(manifest.filter(r=>r.sample===i).length===3)continue;
  const directions=await Promise.all([0,1,2].map(variant=>writePrompt({...spec,variant})));
  const groupId=manifest.find(r=>r.sample===i)?.group_id||crypto.randomUUID();
  // Explicitly request every composition separately; n=3 would repeat one prompt.
  for(let variant=0;variant<3;variant++){
   if(manifest.some(r=>r.sample===i&&r.variant===variant))continue;
   const direction=directions[variant];const receipt=path.join(out,`sample-${i}-${variant}.json`);let id,background;
   try{id=JSON.parse(await fs.readFile(receipt,'utf8')).id;background=await fs.readFile(path.join(out,id+'-background.jpg'));}catch{
    const result=await openai.images.generate({model:'gpt-image-1-mini',prompt:direction.prompt,size:FORMATS[spec.format].native,quality:'medium',output_format:'jpeg',n:1},{timeout:180000,maxRetries:0});
    const raw=result.data?.[0]?.b64_json;if(!raw)throw Error('No image returned');background=Buffer.from(raw,'base64');id=crypto.randomUUID();await fs.writeFile(path.join(out,id+'-background.jpg'),background);await fs.writeFile(receipt,JSON.stringify({id}));
   }
   const check=await inspectBackground(background,direction.text_zone,{readWords:b=>readArtwork(b,openai)});const rendered=await compose(background,{...direction,headline:spec.headline});await fs.writeFile(path.join(out,id+'.'+rendered.extension),rendered.buffer);
   manifest.push({id,sample:i,campaign_id:'33333333-3333-4333-8333-333333333333',group_id:groupId,...direction,prompt:direction.prompt,alt_text:direction.alt_text,title:spec.title,headline:spec.headline,approved:false,cost:estimate(spec.format,'medium',1),width:rendered.width,height:rendered.height,checks:{problems:[...check.problems,...rendered.problems],contrast:rendered.contrast,bytes:rendered.bytes,ocrPassed:check.ocrPassed,emptySpace:check.emptySpace},used_in:[],url:`/tmp/marketing-images/${id}.${rendered.extension}`,background_path:path.join(out,id+'-background.jpg')});
   await fs.writeFile(path.join(out,'samples.json'),JSON.stringify(manifest,null,2));
   console.log(`Sample ${i+1}, choice ${variant+1}: ${manifest.at(-1).checks.problems.length?'needs review':'automatic checks passed'}`);
  }
 }
 await fs.writeFile(path.join(out,'catalog.json'),JSON.stringify({recipes:SCENES,formats:FORMATS,costs:Object.fromEntries(Object.keys(FORMATS).map(f=>[f,{set:estimate(f),one:estimate(f,'medium',1),final:estimate(f,'high',1)}]))},null,2));
 console.log(`${manifest.length} private local drafts saved; none approved or published.`);
}
main().catch(error=>{console.error(`Sample run stopped: ${error.status||error.code||error.message}`);process.exitCode=1;});
