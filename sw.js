const CACHE='skillhub-20261005-restore-v2';
const SHELL=[
  './',
  './index.html',
  './styles-v844.css?v=20260930_v844',
  './app-v844.js?v=20261005_restore_live_v1',
  './hotfix-sync-20261005.js?v=2',
  './manifest.webmanifest?v=20260930_v844',
  './icon-192-v718.png',
  './icon-512-v718.png',
  './master-line-icon.png',
  './skillhub_users_template.xlsx',
  './skillhub_cases_template.xlsx',
  './knowledge/index/reglament.json',
  './knowledge/index/handbook.json',
  './knowledge/rendered/reglament-light/page-001.webp',
  './knowledge/rendered/reglament-dark/page-001.webp',
  './knowledge/rendered/handbook-light/page-001.webp',
  './knowledge/rendered/handbook-dark/page-001.webp'
];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('skillhub-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.hostname.includes('supabase.co'))return;
  const fresh=u.pathname.endsWith('/app-v844.js')||u.pathname.endsWith('/hotfix-sync-20261005.js')||u.pathname.endsWith('/styles-v844.css')||u.pathname.endsWith('/index.html')||u.pathname.endsWith('/');
  e.respondWith(fetch(e.request,{cache:fresh?'reload':'no-store'}).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request).then(c=>c||caches.match('./index.html'))));
});
