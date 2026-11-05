const AccountPages = (() => {
  const coreViews = ['Overview', 'My checklist', 'Schedule & Plan', 'Accounts & vault', 'Docs', 'Resources'];
  const views = [...coreViews, 'Welcome / Setup', 'Settings'];
  let draft = null, baseline = '', currentView = null, dirty = false, savedMessage = '';
  const e = value => esc(value);
  const iconPaths = {
    College: '<path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M6 11v6c4 3 8 3 12 0v-6M21 9v8"/>',
    SkillBridge: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12h18"/>',
    Employment: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-5a6 6 0 0 1 12 0v5M17 4a3 3 0 0 1 0 6M21 21v-5a5 5 0 0 0-4-5"/>',
    'Explore options': '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 7-5 1 3-7 5-1Z"/>',
    'VA benefits': '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="M12 8v8M8 12h8"/>'
  };
  function goalIcon(goal) {return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[goal] || iconPaths['Explore options']}</svg>`}
  function initials(name) {return String(name || 'Your profile').trim().split(/\s+/).slice(0, 2).map(v => v[0]).join('').toUpperCase()}
  function dateLabel(value) {return AccountModel.validDate(value) ? new Date(value + 'T12:00:00').toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'}) : 'Choose a date'}
  function dateRange(start, end) {
    if (!AccountModel.validDate(start) || !AccountModel.validDate(end)) return 'Dates not set';
    if (start === end) return dateLabel(start);
    if (start.slice(0, 7) === end.slice(0, 7)) return new Date(start + 'T12:00:00').toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) + '–' + Number(end.slice(8)) + ', ' + start.slice(0, 4);
    return dateLabel(start) + ' – ' + dateLabel(end);
  }
  function profile() {return state.profile}
  function trsRange() {const p = AccountModel.read(state); return p.trsScheduled ? dateRange(p.trsStart, p.trsEnd) : 'Not scheduled'}
  function syncPlanTasks() {
    const p = AccountModel.read(state), task = tasks.find(t => t[0] === 'trs');
    if (task) task[2] = 'Attend TRS · ' + (p.trsScheduled ? dateRange(p.trsStart, p.trsEnd) : 'Dates to be scheduled');
  }
  function hydrate(existing = true) {
    AccountModel.normalize(state, existing);
    PreIC.hydrate(state);
    syncPlanTasks();
    draft = null; baseline = ''; dirty = false; currentView = null;
  }
  function menu() {
    const p = profile(), signOut = document.querySelector('.side-signout')?.getAttribute('href') || '/sign-out';
    return `<details class="a-profile-menu"><summary aria-label="Open profile menu"><span class="a-avatar">${e(initials(p.displayName))}</span><span class="a-profile-name">${e(p.displayName)}</span><span aria-hidden="true">⌄</span></summary><div class="a-profile-options"><button onclick="go('Settings')">Settings</button><button onclick="go('Welcome / Setup')">${state.setupComplete ? 'Edit setup' : 'Finish setup'}</button><a href="${e(signOut)}" target="_top" onclick="lock()">Sign out</a></div></details>`;
  }
  function syncShell() {
    const isAccount = ['Welcome / Setup', 'Settings'].includes(page);
    document.body.classList.toggle('account-view', isAccount);
    document.title = isAccount ? page + ' | NCTT' : 'NCTT | Your transition';
    document.getElementById('sidebar-transition-office').textContent = profile().transitionOffice.toUpperCase();
    const host = document.getElementById('profile-menu-host');
    if (host) host.innerHTML = isAccount ? '' : menu();
    const resume = document.getElementById('setup-resume');
    if (resume) resume.hidden = state.setupComplete && !state.setupPending;
  }
  function routeView() {
    if (location.pathname === '/setup') return 'Welcome / Setup';
    if (location.pathname === '/settings') return 'Settings';
    const value = new URLSearchParams(location.search).get('view');
    return views.includes(value) ? value : 'Overview';
  }
  function pushRoute(next) {
    const path = next === 'Welcome / Setup' ? '/setup' : next === 'Settings' ? '/settings' : next === 'Overview' ? '/tracker' : '/tracker?view=' + encodeURIComponent(next);
    if (location.pathname + location.search !== path) history.pushState({}, '', path);
  }
  function beforeLeave(next) {
    if (next === page) return true;
    if (dirty && !confirm('Discard your unsaved changes?')) return false;
    draft = null; dirty = false; currentView = null; savedMessage = '';
    return true;
  }
  function field(name, label, value, options = {}) {
    const id = 'a-' + name;
    return `<label class="a-field" for="${id}"><span>${label}</span><input id="${id}" name="${name}" type="${options.type || 'text'}" value="${e(value)}" ${options.required ? 'required' : ''} ${options.readonly ? 'readonly' : ''} ${options.maxlength ? `maxlength="${options.maxlength}"` : ''}></label>`;
  }
  function select(name, label, value, options) {
    return `<div class="a-field"><label for="a-${name}">${label}</label><select id="a-${name}" name="${name}">${options.map(option => {const [v, text] = Array.isArray(option) ? option : [option, option]; return `<option value="${e(v)}" ${v === value ? 'selected' : ''}>${e(text)}</option>`}).join('')}</select></div>`;
  }
  function goalsHTML(compact = false) {
    const options = compact ? AccountModel.goals : AccountModel.goals.filter(g => g !== 'VA benefits' || draft.goals.includes(g));
    return `<div class="a-goals ${compact ? 'a-goals-compact' : ''}">${options.map(g => `<label class="a-goal"><input type="checkbox" name="goals" value="${e(g)}" ${draft.goals.includes(g) ? 'checked' : ''}>${compact ? '' : goalIcon(g)}<span>${e(g)}</span><span class="a-goal-check" aria-hidden="true">✓</span></label>`).join('')}</div>`;
  }
  function preview(value) {
    const row = (title, detail, done, scheduled = false) => `<div class="a-timeline-row"><span class="a-timeline-dot ${done ? 'complete' : scheduled ? 'scheduled' : ''}">${done ? '✓' : scheduled ? '▦' : ''}</span><div><strong>${e(title)}</strong><small>${e(detail)}</small></div></div>`;
    return `<div class="a-preview-title"><h2>Your starting plan</h2><span class="a-pill">Preview</span></div><div class="a-timeline">${row('Initial counseling', value.initialCounseling ? 'Complete' : 'To do', value.initialCounseling)}${row('Pre-separation counseling', value.preSeparation ? 'Complete' : 'To do', value.preSeparation)}${row('Transition Readiness Seminar', value.trsScheduled ? dateRange(value.trsStart, value.trsEnd) : 'To be scheduled', false, value.trsScheduled)}${row('EAS · ' + dateLabel(value.eas), value.transitionType === 'Retiring' ? 'Your retirement date' : 'Your separation date', false)}</div><div class="a-preview-focus"><h2>Your focus</h2><div class="a-focus-chips">${value.goals.length ? value.goals.map(g => `<span>${goalIcon(g)}${e(g)}</span>`).join('') : '<p>Choose a goal to personalize your plan.</p>'}</div></div><p class="a-preview-note">ⓘ You can change these details later in Settings.</p>`;
  }
  function setupHTML() {
    return `<section class="a-page"><div class="a-page-heading"><h1>Welcome / Setup</h1><div class="a-heading-actions"><button class="primary" onclick="AccountPages.saveLater()">▣ <span>Save & finish later</span></button>${menu()}</div></div><div class="a-setup-intro"><h2>Make this plan yours.</h2><p>A few details to get your next chapter organized.</p></div><form id="setup-form" class="a-setup-layout"><div class="a-setup-fields"><section class="a-card"><h2>1. Your transition</h2><div class="a-fields-two">${field('eas', 'EAS date', draft.eas, {type: 'date', required: true})}${select('transitionType', 'Transition type', draft.transitionType, ['Separating', 'Retiring'])}${field('serviceBranch', 'Service branch', 'Marine Corps', {readonly: true})}${field('transitionOffice', 'Transition office', draft.transitionOffice, {required: true, maxlength: 120})}</div></section><section class="a-card"><div class="a-section-title"><h2>2. Your goals</h2><span>Choose more than one.</span></div>${goalsHTML()}</section><section class="a-card"><h2>3. Already completed</h2><label class="a-milestone"><input type="checkbox" name="initialCounseling" ${draft.initialCounseling ? 'checked' : ''}><span>Initial counseling</span><span class="a-complete-pill">Complete</span></label><label class="a-milestone"><input type="checkbox" name="preSeparation" ${draft.preSeparation ? 'checked' : ''}><span>Pre-separation counseling</span><span class="a-complete-pill">Complete</span></label><div class="a-trs-row"><label><input type="checkbox" name="trsScheduled" ${draft.trsScheduled ? 'checked' : ''}><span>TRS scheduled</span></label><div class="a-trs-dates">${field('trsStart', 'Start date', draft.trsStart, {type: 'date'})}${field('trsEnd', 'End date', draft.trsEnd, {type: 'date'})}</div></div></section><button type="button" class="a-back" onclick="go('Overview')">← Back to overview</button></div><div class="a-setup-summary"><section class="a-card a-plan-preview" id="setup-preview">${preview(draft)}</section><p id="account-error" class="a-error" role="alert"></p><button class="primary a-create-plan" type="submit">${state.setupComplete ? 'Update my transition plan' : 'Create my transition plan'} <span aria-hidden="true">→</span></button><p class="a-save-caption" id="account-save-caption" role="status">${e(savedMessage)}</p></div></form></section>`;
  }
  function switchRow(name, title, description) {
    return `<label class="a-switch-row" for="a-${name}"><span><strong>${title}</strong><small>${description}</small></span><span class="a-switch-control"><input id="a-${name}" name="${name}" type="checkbox" role="switch" ${draft.preferences[name] ? 'checked' : ''}><span class="a-switch-track" aria-hidden="true"></span><span class="a-switch-value">${draft.preferences[name] ? 'On' : 'Off'}</span></span></label>`;
  }
  function settingsHTML() {
    return `<section class="a-page"><div class="a-page-heading a-settings-heading"><div><h1>Settings</h1><p>Keep your plan and preferences up to date.</p></div><div class="a-settings-actions">${menu()}<button class="primary" form="settings-form" type="submit">Save changes</button></div></div><form id="settings-form"><div class="a-settings-grid"><section class="a-card"><h2>Profile</h2><p class="a-card-description">Your personal information and sign-in method.</p><div class="a-profile-fields"><span class="a-avatar a-avatar-large" id="settings-avatar">${e(initials(draft.displayName))}</span>${field('displayName', 'Display name', draft.displayName, {required: true, maxlength: 80})}</div><div class="a-signin-row"><span>Sign-in</span><div><span class="a-connected"><span aria-hidden="true">${NCTT_SIGNED_IN ? '✓' : '↗'}</span>${NCTT_SIGNED_IN ? 'Connected with ChatGPT' : 'ChatGPT sign-in'}</span><small>Manage your sign-in through ChatGPT.</small></div></div></section><section class="a-card"><h2>Transition plan</h2><p class="a-card-description">Your expected transition details and goals.</p><div class="a-plan-fields">${field('eas', 'EAS date', draft.eas, {type: 'date', required: true})}${field('transitionOffice', 'Transition office', draft.transitionOffice, {required: true, maxlength: 120})}${select('transitionType', 'Transition type', draft.transitionType, ['Separating', 'Retiring'])}<div class="a-field"><span>Goals</span>${goalsHTML(true)}</div></div><details class="a-extra-details"><summary>Additional plan details</summary><div class="a-fields-two">${select('rank', 'SkillBridge rank category', draft.rank, [['', 'Not confirmed'], ['120', 'E1–E5'], ['90', 'E6–E7 / WO–CWO3 / O1–O4'], ['90go', 'E8–E9 / CWO4–CWO5 / O5+']])}${select('tier', 'TRP tier', draft.tier, ['Not confirmed', 'Tier 1', 'Tier 2', 'Tier 3'])}</div><a href="/setup" onclick="event.preventDefault();go('Welcome / Setup')">Edit counseling and TRS details →</a></details></section><section class="a-card"><h2>Reminders</h2><p class="a-card-description">Choose what appears in your reminder panel.</p>${switchRow('upcomingAppointments', 'Upcoming appointments', 'Your scheduled appointments.')}${switchRow('taskDeadlines', 'Task deadlines', 'Tasks and deadlines with reminders set.')}${switchRow('overdueTasks', 'Overdue tasks', 'Unfinished tasks after their due date.')}<div class="a-reminder-default">${select('defaultReminder', 'Default reminder', draft.preferences.defaultReminder, AccountModel.reminderOptions)}</div><p class="a-fine-print">Reminders appear in Schedule & Plan while NCTT is open. Your default applies to new items.</p></section><section class="a-card"><h2>Data & backups</h2><p class="a-card-description">Manage your data and create a backup.</p><div class="a-storage-row"><img src="/sidebar-icons/documents.png" alt=""><div><strong>Documents</strong><small>Your uploaded files and folders.</small></div><span class="a-storage-badge online">Saved online</span></div><div class="a-storage-row"><img src="/sidebar-icons/schedule-plan.png" alt=""><div><strong>Personal calendar items</strong><small>Your scheduled tasks and appointments.</small></div><span class="a-storage-badge">${NCTT_SIGNED_IN ? 'Saved online' : 'This browser'}</span></div><div class="a-storage-row"><img src="/sidebar-icons/checklist.png" alt=""><div><strong>Plan &amp; scenarios</strong><small>Your checklist and saved scenarios.</small></div><span class="a-storage-badge">This browser</span></div><div class="a-storage-row"><img src="/sidebar-icons/password-vault.png" alt=""><div><strong>Password vault</strong><small>Your encrypted saved accounts.</small></div><span class="a-storage-badge">Encrypted · This browser</span></div><div class="a-backup-buttons"><button type="button" onclick="backup()">↥ &nbsp; Export backup</button><button type="button" onclick="AccountPages.chooseRestore()">↻ &nbsp; Restore backup</button><input id="account-backup-file" class="hidden" type="file" accept=".json,application/json" aria-label="Choose a backup file to restore" onchange="restore(this)"></div><p class="a-fine-print">Back up browser data before changing devices. Documents stay online and are not included in this backup.</p></section></div><p id="account-error" class="a-error" role="alert"></p><div class="a-save-bar"><div><span class="a-save-dot" id="account-save-dot"></span><span><strong id="account-save-title">${e(savedMessage || 'All changes saved')}</strong><small id="account-save-detail">Your plan is saved in this browser.</small></span></div><button class="primary" type="submit">Save changes</button></div></form></section>`;
  }
  function collect() {
    const form = document.getElementById(page === 'Settings' ? 'settings-form' : 'setup-form');
    const data = new FormData(form), raw = {...draft, goals: data.getAll('goals'), preferences: {...draft.preferences}};
    for (const key of ['displayName', 'eas', 'transitionOffice', 'transitionType', 'rank', 'tier', 'trsStart', 'trsEnd']) {
      if (data.has(key)) raw[key] = String(data.get(key));
    }
    if (page === 'Welcome / Setup') {
      raw.initialCounseling = data.has('initialCounseling'); raw.preSeparation = data.has('preSeparation'); raw.trsScheduled = data.has('trsScheduled');
    } else {
      for (const key of ['upcomingAppointments', 'taskDeadlines', 'overdueTasks']) raw.preferences[key] = data.has(key);
      raw.preferences.defaultReminder = data.get('defaultReminder');
    }
    return raw;
  }
  function updateDraft() {
    draft = collect(); dirty = JSON.stringify(draft) !== baseline;
    document.getElementById('account-error').textContent = '';
    if (page === 'Welcome / Setup') {
      document.getElementById('setup-preview').innerHTML = preview(draft);
      for (const name of ['trsStart', 'trsEnd']) document.getElementById('a-' + name).disabled = !draft.trsScheduled;
    } else {
      document.getElementById('settings-avatar').textContent = initials(draft.displayName);
      document.getElementById('account-save-title').textContent = dirty ? 'Unsaved changes' : 'All changes saved';
      document.getElementById('account-save-detail').textContent = dirty ? 'Save your changes before leaving this page.' : 'Your plan is saved in this browser.';
      document.getElementById('account-save-dot').classList.toggle('dirty', dirty);
      for (const control of document.querySelectorAll('.a-switch-control')) control.querySelector('.a-switch-value').textContent = control.querySelector('input').checked ? 'On' : 'Off';
    }
  }
  function renderPage(view) {
    if (currentView !== view || !draft) {
      draft = view === 'Welcome / Setup' && state.setupDraft ? {...AccountModel.read(state), ...state.setupDraft} : AccountModel.read(state);
      baseline = JSON.stringify(draft); currentView = view; dirty = false;
    }
    document.getElementById('view').innerHTML = view === 'Settings' ? settingsHTML() : setupHTML();
    const form = document.getElementById(view === 'Settings' ? 'settings-form' : 'setup-form');
    form.addEventListener('input', updateDraft); form.addEventListener('change', updateDraft);
    form.addEventListener('submit', ev => {ev.preventDefault(); submit()});
    if (view === 'Welcome / Setup') for (const name of ['trsStart', 'trsEnd']) document.getElementById('a-' + name).disabled = !draft.trsScheduled;
  }
  function submit() {
    const form = document.getElementById(page === 'Settings' ? 'settings-form' : 'setup-form');
    if (!form.reportValidity()) return;
    const raw = collect(), error = AccountModel.validate(raw);
    if (error) {document.getElementById('account-error').textContent = error; return}
    const previous = JSON.stringify(state), setup = page === 'Welcome / Setup';
    try {
      AccountModel.apply(state, raw, setup); save(); syncPlanTasks(); dirty = false; draft = null; currentView = null;
      savedMessage = setup ? 'Your transition plan is ready.' : 'Changes saved';
      if (setup) go('Overview'); else render();
    } catch (error) {
      state = JSON.parse(previous);
      document.getElementById('account-error').textContent = 'Your changes could not be saved. Check available browser storage and try again.';
    }
  }
  function saveLater() {
    state.setupDraft = collect(); state.setupPending = true;
    try {save(); dirty = false; draft = null; currentView = null; go('Overview')} catch {document.getElementById('account-error').textContent = 'Your draft could not be saved. Please try again.'}
  }
  function chooseRestore() {
    if (dirty && !confirm('Restoring a backup will replace this browser’s plan and your unsaved changes. Continue to choose a file?')) return;
    document.getElementById('account-backup-file').click();
  }
  function startup() {
    hydrate(!!storedPlan); save();
    page = routeView();
    const params = new URLSearchParams(location.search), category = params.get('category');
    if (cats.includes(category)) filter = category;
    if (!storedPlan && location.pathname === '/tracker' && !params.has('view')) {page = 'Welcome / Setup'; history.replaceState({}, '', '/setup')}
    render();
    addEventListener('beforeunload', event => {if (dirty) {event.preventDefault(); event.returnValue = ''}});
    addEventListener('popstate', () => {const next = routeView(); if (!beforeLeave(next)) {pushRoute(page); return} page = next; const category = new URLSearchParams(location.search).get('category'); if (cats.includes(category)) filter = category; render()});
  }
  return {menu, syncShell, routeView, pushRoute, beforeLeave, renderPage, profile, trsRange, dateLabel, dateRange, hydrate, startup, submit, saveLater, chooseRestore};
})();
