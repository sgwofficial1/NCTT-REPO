const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const modelSource=fs.readFileSync('public/account-model.js','utf8');
const source=fs.readFileSync('app/tracker.html','utf8');
const restoreSource=source.slice(source.indexOf('async function restore(input){'),source.indexOf('\nconst enc='));
const original={eas:'2027-03-15',done:{ic:true,budget:true},notes:{budget:{date:'',text:'Keep my saved note'}}};
const clone=value=>JSON.parse(JSON.stringify(value));
function harness({failSave=false,failHydrate=false,accept=true}={}){
 const storage=new Map([['plan',JSON.stringify(original)]]),alerts=[];
 let confirms=0;
 const ctx={state:clone(original),confirm(){confirms++;return accept},alert(message){alerts.push(message)},AccountPages:{hydrate(){if(failHydrate&&ctx.state.profile?.displayName==='Different profile')throw Error('Rendering unavailable')}},Calculators:{hydrate(){}},lock(){},render(){},save(){if(failSave)throw Error('Quota exceeded');storage.set('plan',JSON.stringify(ctx.state))}};
 vm.createContext(ctx);vm.runInContext(modelSource+';this.model=AccountModel;'+restoreSource,ctx);
 return {ctx,storage,alerts,confirms:()=>confirms};
}
function input(value){return {value:'selected.json',files:[{async text(){return typeof value==='string'?value:JSON.stringify(value)}}]}}
(async()=>{
 for(const change of [v=>{v.profile={transitionOffice:42}},v=>{v.profile={displayName:{bad:true}}},v=>{v.setupDraft={goals:42}},v=>{v.preferences={upcomingAppointments:'yes'}},v=>{v.planner={events:'not-an-array'}},v=>{v.planner={events:[{id:'custom',title:'Broken date',start:'not-a-date',end:'2026-11-02'}]}},v=>{v.vault={salt:1,iv:2,data:3}},v=>{v.eas='2026-02-30'}]){
  const h=harness(),candidate=clone(original);change(candidate);const file=input(candidate);await h.ctx.restore(file);
  assert.deepEqual(h.ctx.state,original);assert.equal(h.storage.get('plan'),JSON.stringify(original));assert.equal(h.confirms(),0);assert.equal(file.value,'');assert.equal(h.alerts.length,1);
 }
 for(const options of [{failSave:true},{failHydrate:true}]){
  const h=harness(options),candidate=clone(original);candidate.profile={displayName:'Different profile'};await h.ctx.restore(input(candidate));
  assert.deepEqual(h.ctx.state,original);assert.equal(h.storage.get('plan'),JSON.stringify(original));assert.equal(h.alerts.length,1);
 }
 const cancelled=harness({accept:false});await cancelled.ctx.restore(input({...original,eas:'2027-04-15'}));assert.deepEqual(cancelled.ctx.state,original);assert.equal(cancelled.alerts.length,0);
 const valid=harness();await valid.ctx.restore(input({...original,eas:'2027-04-15'}));assert.equal(valid.ctx.state.eas,'2027-04-15');assert.equal(valid.ctx.state.profile.displayName,'Stefan Watson');assert.equal(valid.ctx.state.done.budget,true);assert.equal(valid.alerts.length,0);assert.equal(JSON.parse(valid.storage.get('plan')).eas,'2027-04-15');
 const model=valid.ctx.model;const legacy={...clone(original),planner:{events:[{id:'cap',status:'Completed'}]}};assert.equal(model.prepareRestore(legacy).planner.events[0].status,'Completed');
 console.log('PASS: invalid backups rejected before replacement, valid legacy imports, cancelled imports, storage failure and UI failure preserve the saved plan.');
})().catch(error=>{console.error(error);process.exitCode=1});
