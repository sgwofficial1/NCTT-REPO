const assert = require('node:assert/strict');
const {DatabaseSync} = require('node:sqlite');
const fs = require('node:fs');
const vm = require('node:vm');
const {transformSync} = require('esbuild');

const sql = new DatabaseSync(':memory:');
for (const name of fs.readdirSync('drizzle').filter(name => name.endsWith('.sql')).sort()) {
  sql.exec(fs.readFileSync('drizzle/' + name, 'utf8').replaceAll('--> statement-breakpoint',''));
}
const db = {prepare(query) {
  return {bind(...args) {
    const statement = sql.prepare(query);
    return {
      run: () => ({meta:statement.run(...args)}),
      first: () => statement.get(...args),
      all: () => ({results:statement.all(...args)}),
    };
  }};
}};
const server = {module:{exports:{}}, Response, URL, env:{DB:db}, sameOrigin(request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) throw Error('Origin');
}};
server.exports = server.module.exports;
const source = fs.readFileSync('app/api/planner/route.ts','utf8').replace(/^import .*?;$/gm,'');
vm.runInNewContext(transformSync(source,{loader:'ts',format:'cjs'}).code,server);
const api = server.module.exports;
const clientCode = fs.readFileSync('public/planner-account.js','utf8');
const plannerCode = fs.readFileSync('public/planner.js','utf8');
function session(owner, events=[]) {
  const ctx = {NCTT_SIGNED_IN:true, page:'Overview', state:{eas:'2027-03-15',done:{},planner:{events}},
    setInterval(){}, document:{getElementById(){return null}}, save(){}, esc:String, FormData,
    fetch(path,options={}) {
      const request = new Request('https://tracker.test'+path, {...options, headers:{
        ...options.headers,origin:'https://tracker.test',...(owner ? {'oai-authenticated-user-id':owner} : {})
      }});
      return api[options.method || 'GET'](request);
    }};
  vm.runInNewContext(clientCode+'\n'+plannerCode+';this.account=PlannerAccount;this.planner=Planner;',ctx);
  return ctx;
}
(async () => {
  const old = {id:'event-existing',title:'Practice appointment',kind:'Appointment',status:'Scheduled',category:'Personal',
    allDay:false,start:'2026-11-09T09:00',end:'2026-11-09T09:30',notes:'',location:'',repeat:'None',reminder:'None',subtasks:[]};
  const first = session('alice',[old]);
  await first.account.load();
  const fresh = session('alice');
  await fresh.account.load();
  assert.equal(fresh.state.planner.events[0].title,old.title);
  const created = {...old,id:'event-second',title:'Another appointment'};
  assert.equal(await fresh.account.persist(created.id,created),true);
  const afterLogin = session('alice');
  await afterLogin.account.load();
  assert.equal(afterLogin.planner.test.expand(afterLogin.planner.test.baseEvents(),'2026-11-09','2026-11-09').length,2);
  const changed = {...old,title:'Rescheduled'};
  assert.equal(await afterLogin.account.persist(old.id,changed),true);
  assert.equal(await first.account.persist(old.id,{...old,title:'Old tab'}),false);
  assert.equal(await afterLogin.account.persist(old.id,null),true);
  const stale = session('alice',[old]);
  await stale.account.load();
  assert.deepEqual(Array.from(stale.state.planner.events,e=>e.id),[created.id]);
  const other = session('bob');
  await other.account.load();
  assert.equal(other.state.planner.events.length,0);
  assert.equal((await session('').fetch('/api/planner')).status,401);
  console.log('PASS: existing appointment recovery, account save and fresh-session calendar load, owner isolation, conflicting edits and delete persistence.');
})().catch(e=>{console.error(e);process.exitCode=1});
