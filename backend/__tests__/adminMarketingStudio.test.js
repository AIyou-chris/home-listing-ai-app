const test = require('node:test');
const assert = require('node:assert/strict');
const { createStudioService, createStudioHandlers, validateBrief, validateOutputs, OUTPUT_LIMITS } = require('../services/adminMarketingStudio');
const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const ID = '33333333-3333-4333-8333-333333333333';
const brief = { kind:'campaign', idea:'A new tool for this new market', goal:'Build agent partnerships', tone:'Helpful and confident', audience:'Loan officers', pictureMode:'auto', pictureDescription:'', photoName:'', videoFormat:'vertical', videoDuration:'30', plannedAt:'' };
const outputs = Object.fromEntries(Object.keys(OUTPUT_LIMITS).map(key => [key, `Draft ${key}`]));
const brain = { tableReady:true, updatedAt:'2026-10-04T00:00:00.000Z', config:{ marketing:'New market, plain words', sources:[{ title:'Product facts',content:'WOW Links help demonstrate listing experiences' }] } };
function setup({ failAI = false, emptyBrain = false } = {}) {
  const rows = []; let calls = 0; let failWrites = false;
  class Query {
    constructor() { this.filters=[]; this.mode='select'; }
    select(_columns, options) { this.countOnly=options?.head; return this; }
    eq(key,value) { this.filters.push(row => row[key] === value); return this; }
    order() { return this; }
    limit() { return this; }
    insert(value) { this.mode='insert'; this.value=value; return this; }
    update(value) { this.mode='update'; this.value=value; return this; }
    delete() { this.mode='delete'; return this; }
    maybeSingle() { this.one=true; return this; }
    single() { this.one=true; return this; }
    then(resolve,reject) {
      try {
        if (failWrites && this.mode !== 'select') return Promise.resolve({data:null,error:{message:'offline'}}).then(resolve,reject);
        let matched=rows.filter(row=>this.filters.every(f=>f(row)));
        if(this.mode==='insert') {
          if(rows.some(row=>row.id===this.value.id)) return Promise.resolve({data:null,error:{code:'23505'}}).then(resolve,reject);
          const row={status:'brief',outputs:{},generation_attempts:0,...structuredClone(this.value)};rows.push(row);matched=[row];
        }
        if(this.mode==='update') matched.forEach(row=>Object.assign(row,structuredClone(this.value)));
        if(this.mode==='delete') matched.forEach(row=>rows.splice(rows.indexOf(row),1));
        return Promise.resolve({data:this.countOnly?null:structuredClone(this.one?matched[0]||null:matched),count:matched.length,error:null}).then(resolve,reject);
      } catch(e) { return Promise.reject(e).then(resolve,reject); }
    }
  }
  const db={from:()=>new Query()};
  const openai={chat:{completions:{create:async()=>{calls++;if(failAI)throw Error('provider error');return {choices:[{finish_reason:'stop',message:{content:JSON.stringify(outputs)}}]};}}}};
  const deps={db,openai,loadBrain:async()=>emptyBrain?{...brain,updatedAt:null,config:{sources:[]}}:brain};
  return {rows,service:createStudioService(deps),deps,calls:()=>calls,failWrites:()=>{failWrites=true;}};
}
test('server validates brief and channel limits, including Unicode Bluesky length',()=>{
  assert.throws(()=>validateBrief({...brief,idea:''}),/complete/);
  assert.throws(()=>validateBrief(null),/required/);
  assert.throws(()=>validateBrief({...brief,plannedAt:'not a date'}),/valid planning/);
  assert.equal(validateOutputs({...outputs,bluesky:'😀'.repeat(300)}).bluesky.length,600);
  assert.throws(()=>validateOutputs({...outputs,bluesky:'x'.repeat(301)}),/too long/);
  assert.throws(()=>validateOutputs({...outputs,blog:'Our assistant ensures no lead goes cold'}),/guaranteed-results/);
  assert.throws(()=>validateOutputs({...outputs,facebook:'We offer guaranteed approval'}),/guaranteed-results/);
});
test('ownership cannot be taken over with a guessed ID or client owner field',async()=>{
  const {service}=setup();await service.save(OWNER,ID,{brief});
  assert.deepEqual(await service.list(OTHER),[]);
  await assert.rejects(service.generate(OTHER,ID),/not found/);
  await assert.rejects(service.save(OTHER,ID,{brief,owner_id:OWNER}),/already exists/);
});
test('duplicate generation returns saved output without a second paid call; edits clear approval',async()=>{
  const t=setup();await t.service.save(OWNER,ID,{brief});
  const generated=await t.service.generate(OWNER,ID);
  assert.equal(generated.status,'draft');assert.equal(generated.brain_updated_at,brain.updatedAt);
  await t.service.generate(OWNER,ID);assert.equal(t.calls(),1);
  const approved=await t.service.approve(OWNER,ID,{version:generated.updated_at});assert.equal(approved.status,'approved');
  const edited=await t.service.edit(OWNER,ID,{version:approved.updated_at,outputs:{...outputs,facebook:'Edited draft'}});
  assert.equal(edited.status,'draft');assert.equal(edited.outputs.facebook,'Edited draft');
});
test('saved Brain facts and marketing direction are passed to AI behind platform guardrails',async()=>{
  const t=setup();let request;
  t.deps.openai.chat.completions.create=async body=>{request=body;return {choices:[{finish_reason:'stop',message:{content:JSON.stringify(outputs)}}]};};
  await t.service.save(OWNER,ID,{brief});await t.service.generate(OWNER,ID);
  assert.match(request.messages[0].content,/PLATFORM COMPLIANCE RULES/);
  assert.match(request.messages[0].content,/WOW Links help/);assert.match(request.messages[0].content,/New market, plain words/);
  assert.equal(request.response_format.json_schema.strict,true);
});
test('empty Brain prevents a charge, and provider failure preserves the saved brief',async()=>{
  const empty=setup({emptyBrain:true});await empty.service.save(OWNER,ID,{brief});
  await assert.rejects(empty.service.generate(OWNER,ID),/Business Brain/);assert.equal(empty.calls(),0);
  const t=setup({failAI:true});await t.service.save(OWNER,ID,{brief});
  await assert.rejects(t.service.generate(OWNER,ID),/brief is saved/);
  assert.equal(t.rows[0].status,'failed');assert.deepEqual(t.rows[0].brief,brief);
});
test('concurrent generation claims one row and rejects stale edits/approval',async()=>{
  const t=setup();const saved=await t.service.save(OWNER,ID,{brief});
  const results=await Promise.allSettled([t.service.generate(OWNER,ID),t.service.generate(OWNER,ID)]);
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(t.calls(),1);
  await assert.rejects(t.service.approve(OWNER,ID,{version:saved.updated_at}),/review/);
  await assert.rejects(t.service.save(OWNER,ID,{brief,version:saved.updated_at}),/another window/);
});
test('database failure never reports a successful save',async()=>{
  const t=setup();t.failWrites();await assert.rejects(t.service.save(OWNER,ID,{brief}),/confirm the saved/);
  assert.equal(t.rows.length,0);
});
test('handler rejects missing verified user even when client sends an owner ID',async()=>{
  const t=setup();const handlers=createStudioHandlers(t.deps);
  const res={statusCode:200,status(code){this.statusCode=code;return this;},json(body){this.body=body;}};
  await handlers.save({params:{id:ID},body:{brief,owner_id:OWNER}},res);
  assert.equal(res.statusCode,401);assert.equal(t.rows.length,0);
});

test('video settings validate choices and preserve every text output without an AI call',async()=>{const t=setup();await t.service.save(OWNER,ID,{brief});const row=await t.service.generate(OWNER,ID);const saved=await t.service.settings(OWNER,ID,{version:row.updated_at,videoFormat:'landscape',videoDuration:'15',videoOptions:{music:'calm',captionSize:'large',narration:'saved'}});assert.deepEqual(saved.outputs,outputs);assert.equal(saved.brief.music,'calm');assert.equal(t.calls(),1);await assert.rejects(t.service.settings(OWNER,ID,{version:saved.updated_at,videoFormat:'vertical',videoDuration:'30',videoOptions:{voiceSpeed:'9'}}),/valid voice/);});
