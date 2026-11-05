const fs=require('fs'),vm=require('vm'),assert=require('assert');
const context={state:{eas:'2027-03-15',done:{},notes:{}},cats:[],esc:String,save(){},setInterval(){},document:{getElementById(){return null}}};vm.createContext(context);vm.runInContext(fs.readFileSync('public/planner.js','utf8')+';this.test=Planner.test',context);const t=context.test;
assert.equal(t.shift('2027-03-15',-120),'2026-11-15');assert.equal(t.shift('2027-03-15',-90),'2026-12-15');assert.equal(t.monthShift('2027-01-31',1),'2027-02-28');
let e={id:'test',title:'Planning',start:'2026-10-28T09:00',end:'2026-10-28T10:00',allDay:false,repeat:'Weekly',until:'2026-11-11',status:'Scheduled'};
let out=t.expand([e],'2026-10-01','2026-12-01');assert.deepEqual(Array.from(out,x=>x.start),['2026-10-28T09:00','2026-11-04T09:00','2026-11-11T09:00']);context.state.planner.completed[out[0].key]=true;out=t.expand([e],'2026-10-01','2026-12-01');assert.equal(out[0].done,true);assert.equal(out[1].done,false);
assert.equal(t.expand([{...e,repeat:'None',start:'2026-11-02',end:'2026-11-06',allDay:true}],'2026-11-04','2026-11-04').length,1);
context.state.planner.events=[{id:'cap',status:'Completed'}];context.state.done.cap=false;assert.equal(t.baseEvents().find(e=>e.id==='cap').status,'Scheduled');context.state.done.cap=true;assert.equal(t.baseEvents().find(e=>e.id==='cap').status,'Completed');
const old=JSON.stringify(context.state);t.expand([e],'2026-10-01','2026-12-01');assert.equal(JSON.stringify(context.state),old);console.log('PASS: milestone offsets, month-end arithmetic, recurrence bounds, multi-day overlap, per-occurrence completion and checklist sync.');
// Exercise removal in an isolated planner state; no browser or user data is changed.
context.renderPlanner=()=>{};context.confirm=()=>false;vm.runInContext('this.api=Planner',context);
context.state.planner.events.push({...e,id:'qa-remove'},{...e,id:'qa-keep'});
context.api.pick('qa-remove');context.api.remove();assert.ok(context.state.planner.events.some(e=>e.id==='qa-remove'));
context.confirm=()=>true;context.api.remove();assert.ok(!context.state.planner.events.some(e=>e.id==='qa-remove'));assert.ok(context.state.planner.events.some(e=>e.id==='qa-keep'));
console.log('PASS: cancelled planner removal preserves items; confirmed removal targets only the selected item.');
