export type AuthPageState = 'sign-in' | 'signed-out' | 'confirm-sign-out';

const copy = {
 'sign-in': {
  title:'Sign in', heading:'Welcome back.',
  description:'Sign in to open your transition tracker.',
  button:'Continue with ChatGPT', icon:false,
 },
 'signed-out': {
  title:'Signed out', heading:'You’re signed out.',
  description:'Sign in again to return to your tracker.',
  button:'Sign in again', icon:true,
 },
 'confirm-sign-out': {
  title:'Sign out', heading:'Ready to sign out?',
  description:'Sign out of your NCTT session on this device.',
  button:'Sign out', icon:false,
 },
} as const;

function escapeAttribute(value:string){
 return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
}

export function authPage(state:AuthPageState,actionPath:string){
 const content=copy[state];
 const authNavigation=state!=='signed-out';
 const html=`<!doctype html>
<html lang="en">
<head>
 <meta charset="utf-8">
 <meta name="viewport" content="width=device-width,initial-scale=1">
 <meta name="theme-color" content="#073e2c">
 <meta name="robots" content="noindex,nofollow">
 <title>${content.title} — NCTT</title>
 <link rel="icon" type="image/png" sizes="any" href="/favicon.png?v=2">
 <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2">
 <link rel="stylesheet" href="/auth-pages.css">
</head>
<body>
 <a class="skip-link" href="#auth-main">Skip to content</a>
 <header class="auth-header">
  <a class="auth-brand" href="/" aria-label="NCTT home">
   <img src="/nctt-mark.png" alt="" width="82" height="82">
   <span class="auth-brand-words"><b>NCTT</b><span>NEXT CHAPTER<br>TRANSITION TRACKER</span></span>
  </a>
 </header>
 <main id="auth-main" class="auth-main">
  <section class="auth-card ${state==='signed-out'?'with-check':''}" aria-labelledby="auth-title">
   ${content.icon?'<span class="signed-out-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 5 5L20 7"/></svg></span>':''}
   <h1 id="auth-title">${content.heading}</h1>
   <p>${content.description}</p>
   <a class="auth-primary" href="${escapeAttribute(actionPath)}"${authNavigation?' target="_top"':''}>${content.button}</a>
   ${state==='sign-in'?'<a class="auth-home" href="https://nextchapter-transition-stefan.hemite.chatgpt.site/tracker" target="_blank" rel="noopener noreferrer">Open tracker in a new tab</a>':''}
   <a class="auth-home" href="/">Back to home</a>
  </section>
 </main>
</body>
</html>`;
 return new Response(html,{headers:{
  'content-type':'text/html; charset=utf-8',
  'cache-control':'private, no-store',
  'x-robots-tag':'noindex, nofollow',
 }});
}
