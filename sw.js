const CACHE='skillhub-20261015-stable-ui-v3';
const SHELL=[
  './',
  './index.html',
  './styles-v844.css?v=20260930_v844',
  './app-v844.js?v=20261005_restore_live_v1',
  './hotfix-sync-20261005.js?v=3',
  './hotfix-speed-20261009.js?v=1',
  './hotfix-instant-start-20261015.js?v=20261015_1',
  './hotfix-instant-assignments-20261015.js?v=20261015_1',
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

async function networkFirst(request){
  try{
    const r=await fetch(request,{cache:'no-store'});
    if(r&&r.ok){const c=await caches.open(CACHE);c.put(request,r.clone()).catch(()=>{})}
    return r;
  }catch(_){
    const cached=await caches.match(request);
    if(cached)return cached;
    if(request.mode==='navigate')return (await caches.match('./index.html'))||Response.error();
    return Response.error();
  }
}

async function versionedStatic(request){
  const cached=await caches.match(request);
  if(cached){
    fetch(request,{cache:'no-store'}).then(async r=>{
      if(r&&r.ok){const c=await caches.open(CACHE);await c.put(request,r.clone())}
    }).catch(()=>{});
    return cached;
  }
  const r=await fetch(request,{cache:'no-store'});
  if(r&&r.ok){const c=await caches.open(CACHE);c.put(request,r.clone()).catch(()=>{})}
  return r;
}

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.hostname.includes('supabase.co'))return;
  const sameOrigin=u.origin===self.location.origin;
  if(!sameOrigin)return;

  const controlPlane=
    e.request.mode==='navigate'||
    u.pathname.endsWith('/')||
    u.pathname.endsWith('/index.html')||
    u.pathname.endsWith('app-version.json')||
    u.pathname.endsWith('release-ready.json')||
    u.pathname.endsWith('/sw.js');

  const isStatic=/\.(?:js|css|webp|png|svg|ico|woff2?)$/i.test(u.pathname);
  const hasVersion=u.searchParams.has('v');

  if(controlPlane){e.respondWith(networkFirst(e.request));return}
  if(isStatic&&hasVersion){e.respondWith(versionedStatic(e.request));return}

  e.respondWith((async()=>{
    const cached=await caches.match(e.request);
    if(cached)return cached;
    try{
      const r=await fetch(e.request);
      if(r&&r.ok){const c=await caches.open(CACHE);c.put(e.request,r.clone()).catch(()=>{})}
      return r;
    }catch(_){return Response.error()}
  })());
});
