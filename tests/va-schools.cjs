const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const {transformSync} = require('esbuild');
// Exercise the actual card for existing scenarios as well as new selections.
const ui = {esc: value => String(value ?? '')};
vm.runInNewContext(fs.readFileSync('public/va-schools.js','utf8')+';this.schools=VASchools',ui);
const field = (label,key) => '<input data-path="'+key+'" aria-label="'+label+'">';
for (const code of ['11002733','11999132']) {
  const card = ui.schools.card({va:{code,name:'School',type:'PUBLIC',programs:[]},gi:99999},1,{field});
  assert.ok(card.includes('institution/'+code+'#calculate-your-benefits'));
  assert.ok(card.includes('College.programs.1.vaTuitionResult'));
  assert.doesNotMatch(card,/99999|NCTT benefit estimate/);
}
assert.doesNotMatch(ui.schools.calculator({va:{code:'11002733',type:'FLIGHT'}},0,field),/#calculate-your-benefits/);
assert.doesNotMatch(ui.schools.calculator({},0,field),/institution\/undefined/);
let last;
const ctx={module:{exports:{}},Response,URL,URLSearchParams,AbortSignal,fetch:async url=>{
  last=String(url);return Response.json({data:[{attributes:{facilityCode:'11999132',name:'Sample school',type:'PUBLIC'}}],links:{next:null}});
}};
ctx.exports=ctx.module.exports;
vm.runInNewContext(transformSync(fs.readFileSync('app/api/va-schools/route.ts','utf8'),{loader:'ts',format:'cjs'}).code,ctx);
(async()=>{
  const get=query=>ctx.module.exports.GET(new Request('https://site.test/api/va-schools?'+query));
  assert.equal((await get('code=bad')).status,400);
  const result=await (await get('name=Baruch%20College')).json();
  assert.equal(result.items[0].code,'11999132');
  assert.equal(new URL(last).pathname,'/v1/gi/institutions/search');
  ctx.fetch=async()=>{throw Error('unavailable')};
  assert.equal((await get('name=Baruch')).status,502);
})().catch(error=>{console.error(error);process.exitCode=1});
