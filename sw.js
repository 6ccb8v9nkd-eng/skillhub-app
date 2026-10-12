const CACHE='skillhub-20261012-live-core-v1';
const SHELL=[
  './',
  './index.html',
  './styles-v844.css?v=20260930_v844',
  './app-v844.js?v=20261005_restore_live_v1',
  './hotfix-sync-20261005.js?v=3',
  './hotfix-speed-20261009.js?v=1',
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

/* A single missing optional asset must never block a new service worker install. */
self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil((async()=>{
    const c=await caches.open(CACHE);
    await Promise.allSettled(SHELL.map(async url=>{
      const r=await fetch(url,{cache:'no-store'});
      if(r&&r.ok)await c.put(url,r.clone());
    }));
  })());
});

self.addEventListener('activate',e=>e.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(k=>k.startsWith('skillhub-')&&k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
));

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.hostname.includes('supabase.co'))return;

  const sameOrigin=u.origin===self.location.origin;
  const fresh=sameOrigin&&(
    e.request.mode==='navigate'||
    u.pathname.endsWith('/')||
    u.pathname.endsWith('/index.html')||
    u.pathname.endsWith('.js')||
    u.pathname.endsWith('.css')||
    u.pathname.endsWith('app-version.json')||
    u.pathname.endsWith('release-ready.json')
  );

  e.respondWith(
    fetch(e.request,{cache:fresh?'no-store':'default'})
      .then(r=>{
        if(r&&r.ok){
          const copy=r.clone();
          caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
        }
        return r;
      })
      .catch(async()=>{
        const cached=await caches.match(e.request);
        if(cached)return cached;
        if(e.request.mode==='navigate')return (await caches.match('./index.html'))||Response.error();
        return Response.error();
      })
  );
});
