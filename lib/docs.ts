import {env} from 'cloudflare:workers';
export const MAX_FILE=20*1024*1024;
export const TYPES:Record<string,string>={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',txt:'text/plain',md:'text/markdown',csv:'text/csv',json:'application/json',rtf:'application/rtf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',doc:'application/msword',xls:'application/vnd.ms-excel',ppt:'application/vnd.ms-powerpoint'};
export function owner(request:Request){const id=request.headers.get('oai-authenticated-user-id');if(id)return id;if(import.meta.env.DEV)return 'docs-preview-test-user';throw new Error('AUTH')}
export function bindings(){if(!env.DB||!env.BUCKET)throw Error('Storage is not ready. Please retry shortly.');return {db:env.DB,bucket:env.BUCKET}}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw Error('ORIGIN')}
export function text(v:unknown,max=180){return typeof v==='string'?v.trim().slice(0,max):''}
export async function validFolder(db:D1Database,uid:string,id:string|null){if(id&&!await db.prepare('SELECT id FROM document_folders WHERE owner_id=? AND id=?').bind(uid,id).first())throw Error('Folder not found')}
export function fail(error:unknown){const m=error instanceof Error?error.message:'Request failed';return Response.json({error:m==='AUTH'?'Please sign in to access your documents.':m==='ORIGIN'?'Origin not allowed':m},{status:m==='AUTH'?401:m==='ORIGIN'?403:400,headers:{'cache-control':'private, no-store'}})}
export function isFormat(ext:string,b:Uint8Array){const ascii=(s:string,offset=0)=>[...s].every((c,i)=>b[offset+i]===c.charCodeAt(0));if(ext==='pdf')return ascii('%PDF-');if(ext==='png')return b[0]===137&&ascii('PNG',1);if(['jpg','jpeg'].includes(ext))return b[0]===255&&b[1]===216;if(ext==='webp')return ascii('RIFF')&&ascii('WEBP',8);if(['docx','xlsx','pptx'].includes(ext))return ascii('PK')&&b[2]===3&&b[3]===4;if(['doc','xls','ppt'].includes(ext))return [208,207,17,224,161,177,26,225].every((v,i)=>v===b[i]);if(ext==='rtf')return ascii('{\\rtf');return !b.slice(0,8192).includes(0)}

export const PREIC_TASKS=['dd2648','vmet','jst','itp','guide','roob'];
export function linkedTask(value:unknown){const key=text(value,40);if(key&&!PREIC_TASKS.includes(key))throw Error('Choose a valid checklist document item.');return key||null}
export async function preICFolder(db:D1Database,uid:string){
 let parentId:string|null=null;
 for(const name of ['TRP','Pre-Initial Counseling']){
  const existing=await db.prepare('SELECT id FROM document_folders WHERE owner_id=? AND name=? AND parent_id IS ? ORDER BY created_at,id LIMIT 1').bind(uid,name,parentId).first<{id:string}>();
  if(existing){parentId=existing.id;continue}
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([uid,parentId,name])));
  const id='auto-'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  await db.prepare('INSERT INTO document_folders(id,owner_id,name,parent_id,created_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,uid,name,parentId,new Date().toISOString()).run();parentId=id;
 }
 return parentId;
}
