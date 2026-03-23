
// Service Worker has been removed.
// This script ensures any previously installed versions are unregistered to prevent stale caching.

self.addEventListener('install', (event) => {
  // Force this new (empty) service worker to become the active one immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Unregister the service worker immediately upon activation
  event.waitUntil(
    self.registration.unregister()
      .then(() => {
        console.log('Service Worker has been unregistered.');
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});
