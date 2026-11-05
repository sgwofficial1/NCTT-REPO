/* Plan updates merge into the existing browser state; documents stay in online storage. */
const AccountModel = (() => {
  const goals = ['College', 'SkillBridge', 'Employment', 'Explore options', 'VA benefits'];
  const reminderOptions = ['None', 'At start', '15 minutes before', '1 hour before', '1 day before'];
  const defaults = {
    displayName: 'Stefan Watson', serviceBranch: 'Marine Corps', transitionOffice: 'New River Air Station',
    transitionType: 'Separating', goals: ['College', 'SkillBridge'],
    trsScheduled: true, trsStart: '2026-11-02', trsEnd: '2026-11-06'
  };
  const preferenceDefaults = {upcomingAppointments: true, taskDeadlines: true, overdueTasks: true, defaultReminder: '1 day before'};

  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(value + 'T12:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
  }
  function normalize(target, existing = true) {
    target.profile = {...defaults, ...target.profile};
    target.profile.goals = Array.isArray(target.profile.goals) ? target.profile.goals.filter(g => goals.includes(g)) : [...defaults.goals];
    target.preferences = {...preferenceDefaults, ...target.preferences};
    for (const key of ['upcomingAppointments', 'taskDeadlines', 'overdueTasks']) {
      if (typeof target.preferences[key] !== 'boolean') target.preferences[key] = true;
    }
    if (!reminderOptions.includes(target.preferences.defaultReminder)) target.preferences.defaultReminder = preferenceDefaults.defaultReminder;
    target.done ??= {};
    target.notes ??= {};
    if (typeof target.setupComplete !== 'boolean') target.setupComplete = existing;
    return target;
  }
  function read(target) {
    const p = {...defaults, ...target.profile};
    const trs = target.planner?.events?.find(e => e.id === 'trs');
    return {
      ...p, goals: [...p.goals], eas: target.eas, rank: target.rank || '', tier: target.tier || 'Not confirmed',
      trsStart: trs?.start?.slice(0, 10) || p.trsStart, trsEnd: trs?.end?.slice(0, 10) || p.trsEnd,
      initialCounseling: !!target.done?.ic, preSeparation: !!target.done?.pre,
      preferences: {...preferenceDefaults, ...target.preferences}
    };
  }
  function validate(raw) {
    if (!validDate(raw.eas)) return 'Choose a valid EAS date.';
    if (typeof raw.displayName !== 'string' || !raw.displayName.trim()) return 'Enter your display name in Settings.';
    if (typeof raw.transitionOffice !== 'string' || !raw.transitionOffice.trim()) return 'Enter your transition office.';
    if (!['Separating', 'Retiring'].includes(raw.transitionType)) return 'Choose a transition type.';
    if (!Array.isArray(raw.goals) || !raw.goals.some(g => goals.includes(g))) return 'Choose at least one goal.';
    if (raw.trsScheduled && (!validDate(raw.trsStart) || !validDate(raw.trsEnd))) return 'Choose the TRS start and end dates.';
    if (raw.trsScheduled && raw.trsEnd < raw.trsStart) return 'TRS must end on or after its start date.';
    if (!reminderOptions.includes(raw.preferences?.defaultReminder)) return 'Choose a default reminder.';
    return '';
  }
  function prepareRestore(value) {
    const record = item => item !== null && typeof item === 'object' && !Array.isArray(item);
    const fail = () => {throw new Error('Choose a valid Next Chapter backup.')};
    const strings = (object, keys) => keys.every(key => object[key] === undefined || typeof object[key] === 'string');
    const booleans = (object, keys) => keys.every(key => object[key] === undefined || typeof object[key] === 'boolean');
    const preferences = object => record(object) && booleans(object, ['upcomingAppointments', 'taskDeadlines', 'overdueTasks']) && (object.defaultReminder === undefined || reminderOptions.includes(object.defaultReminder));
    const goalList = list => Array.isArray(list) && list.every(goal => goals.includes(goal));
    const eventDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?$/.test(value) && validDate(value.slice(0,10)) && !Number.isNaN(new Date(value.length === 10 ? value + 'T12:00:00' : value).getTime());
    if (!record(value) || !validDate(value.eas) || !record(value.done) || !record(value.notes)) fail();
    if (!Object.values(value.done).every(done => typeof done === 'boolean')) fail();
    if (!Object.values(value.notes).every(note => record(note) && strings(note, ['date', 'text']))) fail();
    if (!strings(value, ['rank', 'tier']) || !booleans(value, ['setupComplete', 'setupPending'])) fail();
    if (value.profile !== undefined) {
      const p = value.profile;
      if (!record(p) || !strings(p, ['displayName', 'serviceBranch', 'transitionOffice', 'transitionType', 'trsStart', 'trsEnd']) || !booleans(p, ['trsScheduled']) || (p.goals !== undefined && !goalList(p.goals))) fail();
    }
    if (value.preferences !== undefined && !preferences(value.preferences)) fail();
    if (value.setupDraft !== undefined) {
      const d = value.setupDraft;
      if (!record(d) || !strings(d, ['displayName', 'serviceBranch', 'transitionOffice', 'transitionType', 'eas', 'rank', 'tier', 'trsStart', 'trsEnd']) || !booleans(d, ['initialCounseling', 'preSeparation', 'trsScheduled']) || (d.goals !== undefined && !goalList(d.goals)) || (d.preferences !== undefined && !preferences(d.preferences))) fail();
    }
    if (value.planner !== undefined) {
      const p = value.planner;
      if (!record(p) || (p.events !== undefined && (!Array.isArray(p.events) || !p.events.every(event => record(event) && typeof event.id === 'string' && strings(event, ['start', 'end', 'title', 'category', 'kind', 'notes', 'location', 'repeat', 'until', 'reminder', 'status']) && booleans(event, ['allDay', 'linked']) && (event.subtasks === undefined || (Array.isArray(event.subtasks) && event.subtasks.every(task => record(task) && typeof task.title === 'string' && typeof task.done === 'boolean'))))))) fail();
      if (p.completed !== undefined && !record(p.completed) || p.dismissed !== undefined && !record(p.dismissed)) fail();
      for (const event of p.events || []) {
        if (event.start !== undefined && !eventDate(event.start) || event.end !== undefined && !eventDate(event.end)) fail();
        if (event.start && event.end && event.end < event.start) fail();
        if (!['trs','cap','cmd'].includes(event.id) && (!event.start || !event.end || !event.title)) fail();
      }
    }
    if (value.vault !== undefined && value.vault !== null && (!record(value.vault) || !['salt', 'iv', 'data'].every(key => typeof value.vault[key] === 'string'))) fail();
    const candidate = JSON.parse(JSON.stringify(value));
    normalize(candidate, true);
    if (validate(read(candidate))) fail();
    if (candidate.setupDraft) {
      candidate.setupDraft = {...read(candidate), ...candidate.setupDraft, preferences: {...candidate.preferences, ...candidate.setupDraft.preferences}};
    }
    return candidate;
  }
  function apply(target, raw, setup = false) {
    const error = validate(raw);
    if (error) throw new Error(error);
    const previous = read(target);
    target.eas = raw.eas;
    target.rank = ['', '120', '90', '90go'].includes(raw.rank) ? raw.rank : '';
    target.tier = ['Not confirmed', 'Tier 1', 'Tier 2', 'Tier 3'].includes(raw.tier) ? raw.tier : 'Not confirmed';
    target.profile = {
      ...target.profile, displayName: raw.displayName.trim().slice(0, 80), serviceBranch: 'Marine Corps',
      transitionOffice: raw.transitionOffice.trim().slice(0, 120), transitionType: raw.transitionType,
      goals: [...new Set(raw.goals.filter(g => goals.includes(g)))], trsScheduled: !!raw.trsScheduled,
      trsStart: raw.trsScheduled ? raw.trsStart : '', trsEnd: raw.trsScheduled ? raw.trsEnd : ''
    };
    target.preferences = {...preferenceDefaults, ...raw.preferences};
    if (setup) {
      target.done.ic = !!raw.initialCounseling;
      target.done.pre = !!raw.preSeparation;
      target.setupComplete = true;
      delete target.setupDraft;
      delete target.setupPending;
    }
    const customTRS = target.planner?.events?.find(e => e.id === 'trs');
    if (customTRS && raw.trsScheduled && (raw.trsStart !== previous.trsStart || raw.trsEnd !== previous.trsEnd)) {
      customTRS.start = raw.trsStart + (customTRS.allDay ? '' : customTRS.start.slice(10));
      customTRS.end = raw.trsEnd + (customTRS.allDay ? '' : customTRS.end.slice(10));
    }
    return target;
  }
  function reminderMatches(event, now, preferences = preferenceDefaults) {
    if (event.done || !event.reminder || event.reminder === 'None') return false;
    const start = new Date(event.start + (event.allDay ? 'T09:00' : ''));
    const end = new Date(event.end + (event.allDay ? 'T23:59' : ''));
    if (now > end) return event.kind !== 'Appointment' && preferences.overdueTasks;
    if (event.kind === 'Appointment' ? !preferences.upcomingAppointments : !preferences.taskDeadlines) return false;
    const minutes = {'At start': 0, '15 minutes before': 15, '1 hour before': 60, '1 day before': 1440}[event.reminder];
    return minutes !== undefined && now >= start.getTime() - minutes * 60000 && now <= end;
  }
  return {goals, reminderOptions, defaults, preferenceDefaults, normalize, read, validate, apply, validDate, reminderMatches, prepareRestore};
})();
