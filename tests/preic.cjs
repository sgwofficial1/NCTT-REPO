const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={state:{done:{ic:true,pre:true},notes:{ic:{text:'keep'}}},save(){},render(){},esc:s=>s,document:{getElementById:()=>null}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('public/preic.js','utf8')+';this.p=PreIC',ctx);
const p=ctx.p;p.hydrate(ctx.state);
assert.equal(ctx.state.done.preic,true);assert.equal(Object.values(ctx.state.preIC.steps).filter(Boolean).length,8);assert.equal(ctx.state.preIC.steps.mfl,false);
p.setStep('jst',false);assert.equal(ctx.state.done.preic,false);assert.equal(ctx.state.done.ic,true);assert.equal(ctx.state.done.pre,true);assert.equal(ctx.state.notes.ic.text,'keep');
p.setStep('mfl',true);assert.equal(ctx.state.done.preic,false);p.setStep('jst',true);assert.equal(ctx.state.done.preic,true);
p.setComplete(false);assert.equal(ctx.state.preIC.steps.mfl,true);assert.equal(ctx.state.done.preic,false);p.setComplete(true);assert.equal(ctx.state.done.preic,true);
const restored=JSON.parse(JSON.stringify(ctx.state));p.hydrate(restored);assert.equal(restored.preIC.steps.mfl,true);assert.equal(restored.done.preic,true);
const fresh={done:{ic:false}};p.hydrate(fresh);assert.equal(Object.values(fresh.preIC.steps).some(Boolean),false);
const partial={done:{ic:true},preIC:{steps:{jst:false}}};p.hydrate(partial);assert.equal(partial.done.preic,false);assert.equal(partial.preIC.steps.jst,false);
assert.match(p.html(),/8\/8 required/);assert.match(p.html(),/Do not sign until both/);console.log('PASS: required and optional completion, migration, persistence and independent counseling status.');

p.select('roob');assert.equal(ctx.state.preIC.selected,'roob');assert.match(p.html(),/id="preic-detail-title">Complete Reserve/);assert.equal(ctx.state.done.preic,true);
p.select('not-a-task');assert.equal(ctx.state.preIC.selected,'roob');
const withSelection=JSON.parse(JSON.stringify(ctx.state));p.hydrate(withSelection);assert.equal(withSelection.preIC.selected,'roob');
const invalidSelection={done:{ic:true},preIC:{selected:'invalid',steps:{jst:false}}};p.hydrate(invalidSelection);assert.equal(invalidSelection.preIC.selected,'dd2648');assert.equal(invalidSelection.preIC.steps.jst,false);
console.log('PASS: instruction selection, saved selection migration, invalid IDs and independent completion.');
