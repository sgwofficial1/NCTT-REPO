import html from '../app/tracker.html?raw';
import {chatGPTSignOutPath} from '../app/chatgpt-auth';

export function trackerPage(request:Request){
  const content=html
    .replaceAll('__NCTT_SIGN_OUT_PATH__',chatGPTSignOutPath('/sign-out'))
    .replaceAll('__NCTT_SIGNED_IN__',request.headers.has('oai-authenticated-user-id')?'true':'false');
  return new Response(content,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'private, no-store'}});
}
