(()=>{
  'use strict';
  if(!('serviceWorker' in navigator)) return;
  const secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if(!secure) return;
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js?v=58-private-vary-range-safe', {
        scope: './',
        updateViaCache: 'none'
      });
      await registration.update();
    } catch (error) {
      console.error('CAPTAUP service worker registration failed', error);
    }
  }, { once: true });
})();
