const PlannerAccount = (() => {
  const revisions = new Map();
  let phase = 'idle';
  let notice = '';
  let writing = false;
  const isPersonal = event => !['trs', 'cap', 'cmd'].includes(event.id);
  async function request(options) {
    const response = await fetch('/api/planner', {credentials:'same-origin', cache:'no-store', ...options});
    if (!response.headers.get('content-type')?.includes('application/json')) throw Error('Your account schedule is unavailable. Reopen the tracker and try again.');
    const data = await response.json();
    if (!response.ok) throw Object.assign(Error(data.error || 'Could not reach your account schedule.'), {status:response.status});
    return data;
  }
  async function write(id, event, revision) {
    return request({method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id,event,revision})});
  }
  async function load() {
    if (phase === 'loading' || writing) return;
    phase = 'loading';
    if (page === 'Schedule & Plan') renderPlanner();
    try {
      const local = (state.planner?.events || []).filter(isPersonal);
      let {items} = await request();
      const known = new Set(items.map(row => row.id));
      const missing = local.filter(event => !known.has(event.id));
      for (const event of missing) {
        try { await write(event.id,event,0); } catch (error) { if (error.status !== 409) throw error; }
      }
      if (missing.length) ({items} = await request());
      revisions.clear();
      for (const item of items) revisions.set(item.id,item.revision);
      state.planner ??= {events:[],completed:{},dismissed:{}};
      const linked = (state.planner.events || []).filter(event => !isPersonal(event));
      state.planner.events = linked.concat(items.filter(row => row.event).map(row => row.event));
      save();
      phase = 'ready';
      notice = 'Personal calendar items saved to your account.';
    } catch (error) {
      phase = 'error';
      notice = 'Could not sync your schedule. ' + error.message;
    }
    if (page === 'Schedule & Plan') renderPlanner();
  }
  async function persist(id,event) {
    if (!NCTT_SIGNED_IN) return true;
    if (writing) return false;
    if (phase !== 'ready') { show('Reload your account schedule before saving.'); return false; }
    writing = true;
    show('Saving to your account…');
    try {
      const result = await write(id,event,revisions.get(id) || 0);
      revisions.set(id,result.revision);
      notice = event ? 'Saved to your account.' : 'Deleted from your account.';
      return true;
    } catch (error) {
      show('Change not confirmed. ' + error.message);
      return false;
    } finally { writing = false; }
  }
  function show(message) {
    notice = message;
    for (const id of ['p-error','planner-save-status']) {
      const target = document.getElementById(id);
      if (target) target.textContent = message;
    }
  }
  function shell() {
    if (!NCTT_SIGNED_IN) return '';
    if (phase === 'idle') queueMicrotask(load);
    if (phase === 'loading' || phase === 'idle') return '<p role="status">Loading your account schedule…</p>';
    return '';
  }
  function status() {
    if (!NCTT_SIGNED_IN) return '<p class="p-caption">This calendar is stored in this browser.</p>';
    return '<p class="p-caption" role="status"><span id="planner-save-status">' + esc(notice) + '</span> <button type="button" onclick="PlannerAccount.load()">Reload schedule</button></p>';
  }
  return {load,persist,shell,status};
})();
