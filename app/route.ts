import html from './landing.html?raw';
export function GET(){return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'private, no-store'}})}
