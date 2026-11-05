import {resources,sources} from '../../../lib/resource-search';
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Origin not allowed'},{status:403});
 try{
  const body=await request.text();
  if(body.length>1500)return Response.json({error:'Request too large'},{status:413});
  let data;
  try{data=JSON.parse(body)}catch{return Response.json({error:'Invalid search'},{status:400})}
  if(!data||typeof data!=='object'||Array.isArray(data)||!Object.hasOwn(sources,data.tab)||!['official','broader'].includes(data.mode))return Response.json({error:'Invalid search'},{status:400});
  const city=typeof data.city==='string'?data.city.trim().slice(0,100):'';
  return Response.json(await resources(data.tab,data.mode,city),{headers:{'cache-control':'private, no-store'}})
 }catch{return Response.json({error:'Resource refresh failed. Please retry or open source links directly.'},{status:502})}
}
