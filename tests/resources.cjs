const {transformSync}=require('esbuild'),fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let calls=[],fail=false;
const context={module:{exports:{}},Response,URL,sources:{Finances:[],Housing:[],College:[]},async resources(...args){calls.push(args);if(fail)throw Error('External service unavailable');return {pages:[],results:[],query:'test'}}};context.exports=context.module.exports;vm.createContext(context);
const source=fs.readFileSync('app/api/resources/route.ts','utf8').replace(/^import .*;\n/gm,'');vm.runInContext(transformSync(source,{loader:'ts',format:'cjs'}).code,context);
const route=context.module.exports,request=(body,origin='https://site.test')=>new Request('https://site.test/api/resources',{method:'POST',headers:{origin,'content-type':'application/json'},body:typeof body==='string'?body:JSON.stringify(body)});
(async()=>{
 for(const body of ['{',null,[],{},42,{tab:'https://untrusted.invalid',mode:'official'},{tab:'Finances',mode:'anything'}])assert.equal((await route.POST(request(body))).status,400);
 assert.equal(calls.length,0,'invalid inputs must not trigger external searches');
 assert.equal((await route.POST(request({tab:'Finances',mode:'official'},'https://other.test'))).status,403);
 assert.equal((await route.POST(request('x'.repeat(1501)))).status,413);
 const response=await route.POST(request({tab:'Finances',mode:'official',city:'  New River  ',income:1234,password:'dummy-value-never-forwarded'}));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.deepEqual(JSON.parse(JSON.stringify(calls[0])),['Finances','official','New River']);
 await route.POST(request({tab:'Housing',mode:'broader',city:'x'.repeat(120)}));assert.equal(calls[1][2].length,100);
 fail=true;assert.equal((await route.POST(request({tab:'College',mode:'official'}))).status,502);
 console.log('PASS: resource request validation, origin enforcement, payload limits, private caching, bounded location inputs, no forwarding of budget/password fields, and upstream failure handling.');
})().catch(error=>{console.error(error);process.exitCode=1});
