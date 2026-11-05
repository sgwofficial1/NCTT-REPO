const {transformSync}=require('esbuild'),fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
function compile(source,extra={}){const context={module:{exports:{}},Response,URL,...extra};context.exports=context.module.exports;vm.createContext(context);vm.runInContext(transformSync(source,{loader:'ts',format:'cjs'}).code,context);return context.module.exports}
const auth=compile(fs.readFileSync('app/chatgpt-auth.ts','utf8').replace(/^import .*;\n/gm,''));
const pages=compile(fs.readFileSync('lib/auth-pages.ts','utf8'));
function route(file){return compile('const {authPage}=pages;const {chatGPTSignInPath,chatGPTSignOutPath,safeRelativeReturnPath}=auth;\n'+fs.readFileSync(file,'utf8').replace(/^import .*;\n/gm,''),{pages,auth})}
const signIn=route('app/sign-in/route.ts'),signOut=route('app/sign-out/route.ts');
function action(html){return html.match(/class="auth-primary" href="([^"]+)"/)[1].replaceAll('&amp;','&')}
(async()=>{
 let response=signIn.GET(new Request('https://site.test/sign-in')),html=await response.text();
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');
 assert.equal(action(html),'/signin-with-chatgpt?return_to=%2Ftracker');assert.match(html,/target="_top"/);assert.match(html,/Welcome back\./);
 assert.match(html,/target="_blank" rel="noopener noreferrer">Open tracker in a new tab/);
 for (const [requested, expected] of [
  ['/tracker?view=Docs', '/tracker?view=Docs'], ['/sign-in/', '/tracker'],
  ['/sign-out', '/tracker'], ['/x/..//other.test', '/'], ['https://other.test', '/'],
 ]) {
  const url = new URL('https://site.test/sign-in');
  url.searchParams.set('return_to', requested);
  const result = signIn.GET(new Request(url, {headers:{'oai-authenticated-user-id':'verified-user'}}));
  assert.equal(result.status, 303);
  assert.equal(result.headers.get('location'), expected);
  assert.equal(result.headers.get('cache-control'), 'private, no-store');
 }
 for(const destination of ['https://evil.test/','//evil.test/','/\\evil.test/','/signin-with-chatgpt','/signout-with-chatgpt','/callback']){
  html=await signIn.GET(new Request('https://site.test/sign-in?return_to='+encodeURIComponent(destination))).text();
  assert.equal(action(html),'/signin-with-chatgpt?return_to=%2F',destination);
 }
 const destination='/tracker?view=Docs';html=await signIn.GET(new Request('https://site.test/sign-in?return_to='+encodeURIComponent(destination))).text();
 assert.equal(new URL(action(html),'https://site.test').searchParams.get('return_to'),destination);
 html=await signOut.GET(new Request('https://site.test/sign-out',{headers:{'oai-authenticated-user-id':'signed-in-user'}})).text();
 assert.match(html,/Ready to sign out\?/);assert.doesNotMatch(html,/You’re signed out\./);assert.match(html,/target="_top"/);
 assert.equal(action(html),'/signout-with-chatgpt?return_to=%2Fsign-out');
 html=await signOut.GET(new Request('https://site.test/sign-out')).text();assert.match(html,/You’re signed out\./);assert.equal(action(html),'/sign-in');
 assert.match(html,/href="\/favicon\.png\?v=2"/);assert.doesNotMatch(html,/favicon\.svg/);
 const escaped=await pages.authPage('sign-in','/signin-with-chatgpt?value="<test>&').text();assert.doesNotMatch(escaped,/value="<test>/);assert.match(escaped,/&quot;&lt;test&gt;&amp;/);
 console.log('PASS: platform auth paths, safe return destinations, top-level navigation, identity-aware sign-out, no-store responses and transparent-PNG references.');
})().catch(error=>{console.error(error);process.exitCode=1});
