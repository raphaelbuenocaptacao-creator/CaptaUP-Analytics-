const CACHE_PREFIX = "captaup-shell-";
const CACHE = `${CACHE_PREFIX}v58-private-vary-range-safe`;
const APP_SHELL = new Set(["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./icon-512-maskable.png","./captaup.css","./captaup-auth.js","./captaup-admin.js","./captaup-auth-bridge.js","./captaup-data.js","./captaup-main.js","./ranking-controls.js","./ranking-page.js","./manager-insights.js","./active-professionals.js","./default-period.js","./captaup-pwa.js","./pwa-update.js","./weekly-captain.js","./engagement.js"]);
const PRIVATE_PATH_RE = /\/(api|auth|login|logout|admin|session|sessions|token|tokens|password|account|profile|me)(\/|$)/i;
const SENSITIVE_QUERY_RE = /^(token|access_token|refresh_token|password|passwd|secret|session|auth|authorization|api_key|apikey|key|code|credential|credentials)$/i;

function hasSensitiveQuery(url){
  for(const key of url.searchParams.keys()) if(SENSITIVE_QUERY_RE.test(key)) return true;
  return false;
}

function isSafeRequest(request){
  if(request.method !== "GET") return false;
  if(request.headers.has("authorization") || request.headers.has("cookie") || request.headers.has("range") || request.headers.has("if-range")) return false;
  const url = new URL(request.url);
  return url.origin === self.location.origin && !PRIVATE_PATH_RE.test(url.pathname) && !hasSensitiveQuery(url);
}

function variesPrivate(response){
  const vary = (response.headers.get("vary") || "").toLowerCase();
  return vary.split(",").some(value => {
    const key = value.trim();
    return key === "*" || key === "cookie" || key === "authorization" || key === "range" || key === "if-range";
  });
}

function isCacheableResponse(response){
  if(!response || !response.ok || response.status === 206 || response.type !== "basic" || response.redirected) return false;
  const cacheControl = response.headers.get("cache-control") || "";
  if(/(?:^|,)\s*(?:private|no-store)(?:\s|,|$)/i.test(cacheControl)) return false;
  if(response.headers.has("set-cookie") || response.headers.has("content-range") || variesPrivate(response)) return false;
  return true;
}

function relativeKey(url){
  const scopePath = new URL(self.registration.scope).pathname;
  let path = url.pathname.startsWith(scopePath) ? url.pathname.slice(scopePath.length) : url.pathname;
  path = path.replace(/^\/+/, "");
  return path ? `./${path}` : "./";
}

async function precacheSafeShell(){
  const cache = await caches.open(CACHE);
  await Promise.all([...APP_SHELL].map(async key => {
    try {
      const request = new Request(key, { credentials: "omit", cache: "no-store", redirect: "error" });
      const response = await fetch(request);
      if(isCacheableResponse(response)) await cache.put(key, response.clone());
    } catch (_) {
      // Keep install resilient if one optional static asset is temporarily unavailable.
    }
  }));
}

self.addEventListener("install", event => {
  event.waitUntil(precacheSafeShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if(!isSafeRequest(request)) return;
  const url = new URL(request.url);

  if(request.mode === "navigate"){
    event.respondWith(fetch(request, {cache:"no-store", redirect:"error"}).catch(() => caches.match("./index.html")));
    return;
  }

  if(url.search) return;
  const key = relativeKey(url);
  if(!APP_SHELL.has(key)) return;

  event.respondWith(
    caches.match(key).then(cached => cached || fetch(request, {cache:"no-store", redirect:"error"}).then(response => {
      if(isCacheableResponse(response)) caches.open(CACHE).then(cache => cache.put(key, response.clone()));
      return response;
    }))
  );
});
