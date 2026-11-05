import {env} from 'cloudflare:workers';
import {sameOrigin} from '../../../lib/docs';

function reply(body: unknown, status = 200) {
  return Response.json(body, {status, headers: {'Cache-Control': 'private, no-store'}});
}

const kinds = ['Appointment', 'Task', 'Deadline'];
const statuses = ['Scheduled', 'Completed', 'In progress'];
const repeats = ['None', 'Daily', 'Weekly', 'Monthly'];
const reminders = ['None', 'At start', '15 minutes before', '1 hour before', '1 day before'];
const validId = (id: unknown) => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(id)
  && !['trs','cap','cmd','__proto__','constructor','prototype'].includes(id);
function validDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(T([01]\d|2[0-3]):[0-5]\d)?$/.test(value)) return false;
  const date = new Date(value.slice(0, 10) + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value.slice(0,10);
}
function validEvent(e: any, id: string) {
  if (!e || e.id !== id || e.linked || typeof e.title !== 'string' || !e.title.trim() || e.title.length > 180) return false;
  return validDate(e.start) && validDate(e.end) && e.end >= e.start
    && typeof e.allDay === 'boolean' && e.start.length === (e.allDay ? 10 : 16) && e.end.length === e.start.length
    && kinds.includes(e.kind) && statuses.includes(e.status) && repeats.includes(e.repeat) && reminders.includes(e.reminder)
    && (e.repeat === 'None' || (validDate(e.until) && e.until.length === 10 && e.until >= e.start.slice(0,10)))
    && typeof e.category === 'string' && typeof e.location === 'string' && typeof e.notes === 'string'
    && Array.isArray(e.subtasks) && e.subtasks.every((s: any) => s && typeof s.title === 'string' && typeof s.done === 'boolean');
}
export async function GET(request: Request) {
  const owner = request.headers.get('oai-authenticated-user-id');
  if (!owner) return reply({error:'Sign in to load your schedule.'}, 401);
  const {results} = await env.DB.prepare('SELECT event_id AS id, payload, revision FROM planner_events WHERE owner_id=?')
    .bind(owner).all<{id:string;payload:string|null;revision:number}>();
  return reply({items:results.map(row => ({id:row.id, event:row.payload && JSON.parse(row.payload), revision:row.revision}))});
}
export async function PUT(request: Request) {
  const owner = request.headers.get('oai-authenticated-user-id');
  if (!owner) return reply({error:'Sign in to save your schedule.'}, 401);
  try { sameOrigin(request); } catch { return reply({error:'Origin not allowed.'}, 403); }
  const raw = await request.text();
  if (raw.length > 128000) return reply({error:'This appointment is too large to save.'}, 413);
  let data;
  try { data = JSON.parse(raw); } catch { return reply({error:'Invalid appointment.'}, 400); }
  if (!data || !validId(data.id) || !Number.isSafeInteger(data.revision) || data.revision < 0 ||
      !(data.event === null ? data.revision > 0 : validEvent(data.event, data.id))) return reply({error:'Check your appointment details.'}, 400);
  const payload = data.event === null ? null : JSON.stringify(data.event);
  const query = data.revision === 0
    ? env.DB.prepare('INSERT INTO planner_events(owner_id,event_id,payload,revision) VALUES(?,?,?,1) ON CONFLICT DO NOTHING').bind(owner,data.id,payload)
    : env.DB.prepare('UPDATE planner_events SET payload=?,revision=revision+1 WHERE owner_id=? AND event_id=? AND revision=? AND payload IS NOT NULL').bind(payload,owner,data.id,data.revision);
  const result = await query.run();
  if (!result.meta.changes) {
    const current = await env.DB.prepare('SELECT payload,revision FROM planner_events WHERE owner_id=? AND event_id=?').bind(owner,data.id).first<{payload:string|null;revision:number}>();
    if (current && current.payload === payload) return reply({revision:current.revision});
    return reply({error:'This item changed elsewhere. Reload Schedule & Plan to see the latest version.'},409);
  }
  return reply({revision:data.revision+1});
}
