const CACHE='skillhub-20261001-v8-46';
const SHELL=[
  './',
  './index.html',
  './styles-v846.css?v=20261001_v846',
  './app-v846.js?v=20261001_v846',
  './manifest.webmanifest?v=20261001_v846',
  './icon-192-v718.png',
  './icon-512-v718.png',
  './master-line-icon.png',
  './skillhub_users_template.xlsx',
  './skillhub_cases_template.xlsx',
  './knowledge/previews/reglament-light.webp',
  './knowledge/previews/reglament-dark.webp',
  './knowledge/previews/handbook-light.webp',
  './knowledge/previews/handbook-dark.webp'
];
const KNOWLEDGE=[];
for(const [doc,count] of [['reglament',53],['handbook',49]]){
  for(const theme of ['light','dark']){
    for(let n=1;n<=count;n++) KNOWLEDGE.push(`./knowledge/rendered/${doc}-${theme}/page-${String(n).padStart(3,'0')}.webp`);
  }
}
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('skillhub-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
async function notifyProgress(doneCount,total,done=false){
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const c of clients)c.postMessage({type:'KNOWLEDGE_CACHE_PROGRESS',doneCount,total,done});
}
async function cacheKnowledge(){
  const cache=await caches.open(CACHE);let doneCount=0;const total=KNOWLEDGE.length;
  for(const path of KNOWLEDGE){
    try{
      const req=new Request(path,{cache:'reload'});
      if(!(await cache.match(req))){const r=await fetch(req);if(r.ok)await cache.put(req,r.clone())}
    }catch(e){}
    doneCount++;
    if(doneCount%8===0||doneCount===total)await notifyProgress(doneCount,total,doneCount===total);
  }
}
self.addEventListener('message',e=>{if(e.data?.type==='CACHE_KNOWLEDGE')e.waitUntil(cacheKnowledge())});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.hostname.includes('supabase.co'))return;
  const isKnowledge=u.pathname.includes('/knowledge/rendered/')||u.pathname.includes('/knowledge/previews/');
  if(isKnowledge){
    e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r})));
    return;
  }
  const fresh=u.pathname.endsWith('/app-v846.js')||u.pathname.endsWith('/styles-v846.css')||u.pathname.endsWith('/index.html')||u.pathname.endsWith('/');
  e.respondWith(fetch(e.request,{cache:fresh?'reload':'no-store'}).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request).then(c=>c||caches.match('./index.html'))));
});
