const {transformSync}=require('esbuild'),fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),{DatabaseSync}=require('node:sqlite');
const sql=new DatabaseSync(':memory:');
sql.exec('CREATE TABLE document_folders(id TEXT PRIMARY KEY, owner_id TEXT, parent_id TEXT, name TEXT);CREATE TABLE documents(id TEXT PRIMARY KEY,owner_id TEXT,folder_id TEXT,object_key TEXT);');
const objects=new Map();let storageFails=false;
const bucket={async delete(keys){if(storageFails)throw Error('Storage unavailable');for(const key of Array.isArray(keys)?keys:[keys])objects.delete(key)}};
const db={prepare(query){return {bind(...args){return {async first(){return sql.prepare(query).get(...args)||null},async all(){return {results:sql.prepare(query).all(...args)}},async run(){return sql.prepare(query).run(...args)},query,args}}}},async batch(statements){sql.exec('BEGIN');try{const result=statements.map(s=>sql.prepare(s.query).run(...s.args));sql.exec('COMMIT');return result}catch(e){sql.exec('ROLLBACK');throw e}}};
let context={module:{exports:{}},Response,URL,env:{DB:db,BUCKET:bucket}};context.exports=context.module.exports;vm.createContext(context);
let source=fs.readFileSync('lib/docs.ts','utf8').replace("import {env} from 'cloudflare:workers';",'');
vm.runInContext(transformSync(source,{loader:'ts',format:'cjs',define:{'import.meta.env.DEV':'false'}}).code,context);
const helpers=context.module.exports;
context={module:{exports:{}},Response,helpers};context.exports=context.module.exports;vm.createContext(context);
source=fs.readFileSync('app/api/docs/route.ts','utf8').replace(/^import .*?;\n/,'const {bindings,owner,sameOrigin,validFolder,text,fail,TYPES,MAX_FILE,isFormat}=helpers;\n');
vm.runInContext(transformSync(source,{loader:'ts',format:'cjs'}).code,context);
const route=context.module.exports;
function folder(id,parent=null,owner='alice'){sql.prepare('INSERT INTO document_folders VALUES(?,?,?,?)').run(id,owner,parent,id)}
function file(id,parent=null,owner='alice'){sql.prepare('INSERT INTO documents VALUES(?,?,?,?)').run(id,owner,parent,id+'-object');objects.set(id+'-object',id)}
async function remove(data,owner='alice',origin='https://site.test'){return route.DELETE(new Request('https://site.test/api/docs',{method:'DELETE',headers:{...(owner?{'oai-authenticated-user-id':owner}:{}),origin,'content-type':'application/json'},body:JSON.stringify(data)}))}
function count(table,id){return sql.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE id=?`).get(id).n}
(async()=>{
 folder('parent');folder('child','parent');folder('grandchild','child');folder('keep');folder('foreign-child','parent','bob');
 file('root-file','parent');file('deep-file','grandchild');file('keep-file','keep');file('foreign-file','child','bob');file('single');
 assert.equal((await remove({type:'file',id:'single'},null)).status,401);
 assert.equal((await remove({type:'file',id:'single'},'alice','https://evil.test')).status,403);
 assert.equal((await remove({type:'file',id:'foreign-file'})).status,400);assert.equal(objects.has('foreign-file-object'),true);
 assert.equal((await remove({type:'file',id:'single'})).status,200);assert.equal(count('documents','single'),0);assert.equal(objects.has('single-object'),false);
 const target={type:'folder',id:'parent',folderIds:['parent','child','grandchild'],fileIds:['root-file','deep-file']};
 assert.equal((await remove({...target,fileIds:['root-file']})).status,409);assert.equal(objects.has('root-file-object'),true);
 storageFails=true;assert.equal((await remove(target)).status,400);assert.equal(count('documents','deep-file'),1);assert.equal(count('document_folders','parent'),1);storageFails=false;
 const result=await remove(target);assert.equal(result.status,200);assert.deepEqual(await result.json(),{deleted:true,files:2,folders:3});
 for(const id of target.folderIds)assert.equal(count('document_folders',id),0);
 for(const id of target.fileIds){assert.equal(count('documents',id),0);assert.equal(objects.has(id+'-object'),false)}
 for(const id of ['keep-file','foreign-file']){assert.equal(count('documents',id),1);assert.equal(objects.has(id+'-object'),true)}
 assert.equal(count('document_folders','foreign-child'),1);assert.equal(count('document_folders','keep'),1);
 folder('empty');assert.equal((await remove({type:'folder',id:'empty',folderIds:['empty'],fileIds:[]})).status,200);
 assert.equal((await remove({type:'folder',id:'keep'},'bob')).status,400);
 console.log('PASS: file/empty/nested folder deletion, original storage removal, owner isolation, authentication, origin checks, changed-content conflict and storage failure preservation.');
})().catch(e=>{console.error(e);process.exitCode=1});
