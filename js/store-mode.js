/* ============================================================
   StoreMode — זיהוי runtime אם האפליקציה רצה בתוך עטיפת חנות
   (TWA באנדרואיד / Capacitor ב-iOS) לעומת האתר הרגיל בדפדפן.
   אותם קבצים בדיוק בשני המקרים — אין build נפרד.
   ============================================================ */
'use strict';

const StoreMode = (() => {
  let _cached = null;

  function isStoreBuild() {
    if (_cached !== null) return _cached;
    const isTWA = typeof document !== 'undefined' && !!document.referrer
      && document.referrer.startsWith('android-app://');
    const isCapacitor = typeof window !== 'undefined' && !!window.Capacitor
      && typeof window.Capacitor.isNativePlatform === 'function'
      && window.Capacitor.isNativePlatform();
    _cached = !!(isTWA || isCapacitor);
    return _cached;
  }

  return { isStoreBuild };
})();
