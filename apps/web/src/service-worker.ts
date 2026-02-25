/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from "$service-worker";

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE_NAME = `humans-cache-${version}`;

// Assets to precache: hashed build output + static files
const PRECACHE_ASSETS = [...build, ...files];

// Install: precache all build assets into a versioned cache
sw.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => sw.skipWaiting()),
  );
});

// Activate: delete old caches, claim all clients
sw.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => sw.clients.claim()),
  );
});

// Fetch: strategy depends on request type
sw.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls: pass through (data layer handles caching via IndexedDB)
  if (url.pathname.startsWith("/api/") || url.origin !== sw.location.origin) {
    return;
  }

  // Don't cache SvelteKit __data.json or version checks
  if (url.pathname.includes("__data.json") || url.pathname === "/_app/version.json") {
    return;
  }

  // Precached assets (build output with content hashes): cache-first
  if (PRECACHE_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetch(request)),
    );
    return;
  }

  // Navigation requests: network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((cached) => cached ?? new Response("Offline", { status: 503 })),
      ),
    );
    return;
  }
});
