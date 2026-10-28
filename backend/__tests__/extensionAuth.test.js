'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../../chrome-extension/background.js'),'utf8');
function fixture(session) {
  let listener;const calls=[];
  const chrome={runtime:{onInstalled:{addListener(){}},onMessage:{addListener(fn){listener=fn;}}},
    tabs:{query:async()=>[{id:1,url:'https://homelistingai.com/dashboard'}]},
    scripting:{executeScript:async()=>[{result:session}]},
    storage:{local:{get:async()=>({apiBaseUrl:'https://homelistingai.com',userId:'owner'}),set:async()=>{}}}};
  vm.runInNewContext(code,{chrome,console,fetch:async(url,options)=>{calls.push({url,options});return{ok:true,json:async()=>({success:true})};}});
  return{calls,send:msg=>new Promise(resolve=>listener(msg,{},resolve))};
}
test('extension sends a fresh bearer token from its open app tab instead of trusting an owner header',async()=>{
  const f=fixture({userId:'owner',accessToken:'SESSION-ONLY',expiresAt:Date.now()/1000+300});
  const result=await f.send({type:'HLAI_FETCH_LINKEDIN_ASSISTANT',payload:{threadText:'Hello'}});
  assert.equal(result.ok,true);assert.equal(f.calls[0].options.headers.Authorization,'Bearer SESSION-ONLY');assert.equal(f.calls[0].options.headers['x-user-id'],undefined);
});
test('expired or other-account sessions are never sent to the API',async()=>{
  for(const session of [{userId:'other',accessToken:'wrong',expiresAt:Date.now()/1000+300},{userId:'owner',accessToken:'old',expiresAt:1}]){
    const f=fixture(session);const result=await f.send({type:'HLAI_FETCH_LINKEDIN_ASSISTANT'});assert.equal(result.ok,false);assert.equal(f.calls.length,0);
  }
});
