const CACHE='skillhub-20260928-v8-41';
const SHELL=[
  './',
  './index.html',
  './styles-v841.css?v=20260928_v841',
  './app-v841.js?v=20260928_v841',
  './manifest.webmanifest?v=20260926_prerelease_v825',
  './icon-192-v718.png',
  './icon-512-v718.png',
  './master-line-icon.png',
  './skillhub_users_template.xlsx',
  './skillhub_cases_template.xlsx'
];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('skillhub-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.hostname.includes('supabase.co'))return;
  const fresh=u.pathname.endsWith('/app-v841.js')||u.pathname.endsWith('/styles-v841.css')||u.pathname.endsWith('/index.html')||u.pathname.endsWith('/');
  e.respondWith(fetch(e.request,{cache:fresh?'reload':'no-store'}).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request).then(c=>c||caches.match('./index.html'))));
});
