const test=require('node:test');
const assert=require('node:assert/strict');
const createService=require('../funnelExecutionService');
function fixture(enrollments) {
  let sends=0;
  const db={from(name){let op='select',patch,id;const q={select(){return q;},eq(col,value){if(col==='id')id=value;return q;},lte(){return q;},limit(){return q;},update(value){op='update';patch=value;return q;},insert(){op='insert';return q;},then(resolve){if(op==='update')Object.assign(enrollments.find(e=>e.id===id)||{},patch);return Promise.resolve({data:op==='select'&&name==='funnel_enrollments'?enrollments:[],error:null}).then(resolve);}};return q;}};
  const service=createService({supabaseAdmin:db,emailService:{sendEmail:async()=>{sends++;return {sent:true};}},smsService:{},voiceService:{}});
  return {service,sends:()=>sends};
}
function row(id,status='New') {return {id,current_step_index:0,leads:{id:'lead-'+id,status,name:'Buyer',email:'buyer@example.com'},agents:{id:'agent'},funnels:{steps:[{type:'email',subject:'Hello',content:'Test'}]}};}
test('unsubscribed buyer receives no further funnel messages',async()=>{
  const enrollment=row('one','Unsubscribed');const f=fixture([enrollment]);await f.service.processBatch();
  assert.equal(f.sends(),0);assert.equal(enrollment.status,'completed');
});
test('an orphan enrollment cannot prevent the next buyer being processed',async()=>{
  const broken={...row('broken'),leads:null};const healthy=row('healthy');const f=fixture([broken,healthy]);
  await f.service.processBatch();assert.equal(f.sends(),1);assert.equal(broken.status,'failed');
});


test('funnel hydration works with the real production step columns',async()=>{
  const {ensureFunnelStepsPayload}=require('../funnelEnrollmentService');
  const columns=new Set(['id','funnel_id','step_name','step_index','email_template_id','delay_days','action_type','content','created_at','subject','description','preview_text']);
  let selected, saved;
  const db={from(table){const q={select(value){selected=value;return q;},eq(){return q;},order:async()=>selected.split(',').some(c=>!columns.has(c))?{data:null,error:{message:'column does not exist'}}:{data:[{id:'step',step_name:'Follow up',action_type:'email',subject:'Hello',content:'Body',delay_days:2}]},update(value){saved=value;return q;},then(resolve){return Promise.resolve({error:null}).then(resolve);}};return q;}};
  const result=await ensureFunnelStepsPayload({supabaseAdmin:db,funnel:{id:'funnel',steps:[]}});
  assert.equal(result.steps.length,1);assert.equal(result.steps[0].delay_minutes,2880);assert.equal(saved.steps[0].subject,'Hello');
});
