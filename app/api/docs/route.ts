import {bindings,owner,sameOrigin,validFolder,text,fail,TYPES,MAX_FILE,isFormat,linkedTask,preICFolder} from '../../../lib/docs';
const headers={'cache-control':'private, no-store'};
const folderTree=`WITH RECURSIVE tree(id) AS (
 SELECT id FROM document_folders WHERE id=? AND owner_id=?
 UNION SELECT f.id FROM document_folders f JOIN tree t ON f.parent_id=t.id WHERE f.owner_id=?
)`;

export async function DELETE(request:Request){
 try{
  sameOrigin(request);
  const uid=owner(request),{db,bucket}=bindings();
  const body=await request.text();
  if(body.length>100000)throw Error('Request too large');
  const data=JSON.parse(body),id=text(data.id),type=data.type;
  if(!id||!['file','folder'].includes(type))throw Error('Choose a file or folder to delete.');
  if(type==='file'){
   const record=await db.prepare('SELECT object_key FROM documents WHERE id=? AND owner_id=?').bind(id,uid).first<{object_key:string}>();
   if(!record)throw Error('Document not found');
   await bucket.delete(record.object_key);
   await db.prepare('DELETE FROM documents WHERE id=? AND owner_id=?').bind(id,uid).run();
   return Response.json({deleted:true,files:1,folders:0},{headers});
  }
  await validFolder(db,uid,id);
  const [folderRows,fileRows]=await Promise.all([
   db.prepare(folderTree+' SELECT id FROM tree').bind(id,uid,uid).all<{id:string}>(),
   db.prepare(folderTree+' SELECT id,object_key FROM documents WHERE owner_id=? AND folder_id IN (SELECT id FROM tree)').bind(id,uid,uid,uid).all<{id:string,object_key:string}>()
  ]);
  const folderIds=folderRows.results.map(f=>f.id),fileIds=fileRows.results.map(f=>f.id);
  const matches=(expected:unknown,actual:string[])=>Array.isArray(expected)&&expected.length===actual.length&&expected.every(v=>typeof v==='string')&&[...new Set(expected)].sort().join(',')===[...actual].sort().join(',');
  if(!matches(data.folderIds,folderIds)||!matches(data.fileIds,fileIds))return Response.json({error:'Folder contents changed. Refresh Docs and review the deletion again.'},{status:409,headers});
  const keys=fileRows.results.map(f=>f.object_key);
  for(let i=0;i<keys.length;i+=1000)await bucket.delete(keys.slice(i,i+1000));
  await db.batch([
   db.prepare('DELETE FROM documents WHERE owner_id=? AND id IN (SELECT value FROM json_each(?))').bind(uid,JSON.stringify(fileIds)),
   db.prepare('DELETE FROM document_folders WHERE owner_id=? AND id IN (SELECT value FROM json_each(?))').bind(uid,JSON.stringify(folderIds))
  ]);
  return Response.json({deleted:true,files:fileIds.length,folders:folderIds.length},{headers});
 }catch(e){return fail(e)}
}
export async function GET(request:Request){try{let uid=owner(request),{db}=bindings();let [folders,docs]=await Promise.all([db.prepare('SELECT id,name,parent_id AS parentId,created_at AS createdAt FROM document_folders WHERE owner_id=? ORDER BY name COLLATE NOCASE LIMIT 1000').bind(uid).all(),db.prepare('SELECT id,folder_id AS folderId,name,category,linked_task AS linkedTask,extension,mime,size,created_at AS createdAt FROM documents WHERE owner_id=? ORDER BY created_at DESC LIMIT 1000').bind(uid).all()]);return Response.json({folders:folders.results,docs:docs.results,maxFileSize:MAX_FILE},{headers})}catch(e){return fail(e)}}
export async function POST(request:Request){try{sameOrigin(request);let uid=owner(request),{db,bucket}=bindings();if(request.headers.get('content-type')?.includes('multipart/form-data')){if(Number(request.headers.get('content-length')||0)>MAX_FILE+65536)return Response.json({error:'Maximum file size is 20 MB.'},{status:413});let form=await request.formData(),file=form.get('file');if(!(file instanceof File)||!file.size)throw Error('Choose a non-empty document.');if(file.size>MAX_FILE)return Response.json({error:'Maximum file size is 20 MB.'},{status:413});let name=text(file.name,200).replace(/[\x00-\x1f/\\]/g,'_'),extension=name.split('.').pop()?.toLowerCase()||'',mime=TYPES[extension];if(!mime)throw Error('Unsupported format. Use PDF, images, text, CSV, JSON, RTF, Word, Excel or PowerPoint.');let task=linkedTask(form.get('linkedTask')),folderId=text(form.get('folderId'))||null;await validFolder(db,uid,folderId);let count=await db.prepare('SELECT COUNT(*) AS n FROM documents WHERE owner_id=?').bind(uid).first<{n:number}>();if((count?.n||0)>=1000)throw Error('Document limit reached (1,000).');let bytes=new Uint8Array(await file.arrayBuffer());if(!isFormat(extension,bytes))throw Error('This file’s contents do not match its format.');if(task)folderId=await preICFolder(db,uid);let id=crypto.randomUUID(),objectKey='docs/'+uid+'/'+id,category=task?'TRP':text(form.get('category'),64)||'Uncategorized',createdAt=new Date().toISOString();await bucket.put(objectKey,bytes,{httpMetadata:{contentType:mime}});try{await db.prepare('INSERT INTO documents (id,owner_id,folder_id,name,category,extension,mime,size,object_key,created_at,linked_task) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(id,uid,folderId,name,category,extension,mime,file.size,objectKey,createdAt,task).run()}catch(e){await bucket.delete(objectKey);throw e}return Response.json({id,name,folderId,category,linkedTask:task,extension,mime,size:file.size,createdAt},{status:201,headers})}
 let body=await request.text();if(body.length>2048)throw Error('Request too large');let data=JSON.parse(body),name=text(data.name,100),parentId=text(data.parentId)||null;if(data.action!=='folder'||!name)throw Error('Enter a folder name.');await validFolder(db,uid,parentId);let id=crypto.randomUUID(),createdAt=new Date().toISOString();await db.prepare('INSERT INTO document_folders(id,owner_id,name,parent_id,created_at) VALUES(?,?,?,?,?)').bind(id,uid,name,parentId,createdAt).run();return Response.json({id,name,parentId,createdAt},{status:201,headers})}catch(e){return fail(e)}}
export async function PATCH(request:Request){try{sameOrigin(request);let uid=owner(request),{db}=bindings();let body=await request.text();if(body.length>2048)throw Error('Request too large');let data=JSON.parse(body),id=text(data.id),name=text(data.name,200);if(!name)throw Error('Enter a document name.');let record=await db.prepare('SELECT id,extension FROM documents WHERE id=? AND owner_id=?').bind(id,uid).first<{id:string,extension:string}>();if(!record)throw Error('Document not found');if(name.split('.').pop()?.toLowerCase()!==record.extension)throw Error('Keep the original file extension when renaming.');let task=linkedTask(data.linkedTask),folderId=text(data.folderId)||null;await validFolder(db,uid,folderId);await db.prepare('UPDATE documents SET name=?,category=?,folder_id=?,linked_task=? WHERE id=? AND owner_id=?').bind(name,text(data.category,64)||'Uncategorized',folderId,task,id,uid).run();return Response.json({saved:true},{headers})}catch(e){return fail(e)}}
