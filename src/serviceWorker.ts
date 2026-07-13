// Unregisters any service worker left over from an earlier visit (register()
// was never called, so nothing was ever installed by this app itself).
export function unregister(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister();
    });
  }
}
