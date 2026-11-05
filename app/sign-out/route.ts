import {chatGPTSignOutPath} from '../chatgpt-auth';
import {authPage} from '../../lib/auth-pages';

export function GET(request:Request){
 // Never show a successful sign-out while the platform still supplies identity.
 if(request.headers.get('oai-authenticated-user-id')){
  return authPage('confirm-sign-out',chatGPTSignOutPath('/sign-out'));
 }
 return authPage('signed-out','/sign-in');
}
