/* =========================================================
   Analytics — Umami Cloud.

   Cookieless and anonymous: no cookies are set, no identifier
   follows anyone between sites, and nothing personal is sent.
   That is why there is no consent banner. It is the only
   third-party request the site makes.

   Paste the website ID from your Umami dashboard below —
   it is the only line that needs changing.
   ========================================================= */
(function (global) {
  'use strict';

  var WEBSITE_ID = '0e804d07-804f-40df-b85f-daefd20aced6';
  var SCRIPT_SRC = 'https://cloud.umami.is/script.js';

  /* Events fired before Umami finishes loading wait here. */
  var queue = [];

  function ready() {
    return global.umami && typeof global.umami.track === 'function';
  }

  function flush() {
    if (!ready()) return;
    while (queue.length) {
      try { global.umami.track.apply(global.umami, queue.shift()); } catch (e) { /* never break a page */ }
    }
  }

  /* The one helper. Safe to call anywhere, any time, even offline. */
  function track(name, data) {
    if (!name) return;
    queue.push(data ? [name, data] : [name]);
    flush();
  }

  function load() {
    if (!WEBSITE_ID || document.querySelector('script[data-website-id]')) return;
    var s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.defer = true;
    s.setAttribute('data-website-id', WEBSITE_ID);
    /* Honours the browser's Do Not Track setting. Remove this line to count those visits too. */
    s.setAttribute('data-do-not-track', 'true');
    s.addEventListener('load', flush);
    document.head.appendChild(s);
  }

  /* ---------- installs ----------
     Chrome and Android fire real events. iOS Safari fires nothing at all
     for "Add to Home Screen", so the only honest signal there is the app
     later opening in its own window — counted once per session. */
  function initInstall() {
    global.addEventListener('beforeinstallprompt', function () { track('pwa-install-available'); });
    global.addEventListener('appinstalled', function () { track('pwa-installed'); });

    var standalone = false;
    try {
      standalone = (global.matchMedia && global.matchMedia('(display-mode: standalone)').matches) ||
        global.navigator.standalone === true;
    } catch (e) { standalone = false; }
    if (!standalone) return;
    try {
      if (sessionStorage.getItem('fl.standalone.counted')) return;
      sessionStorage.setItem('fl.standalone.counted', '1');
    } catch (e) { /* private mode: count it every time rather than not at all */ }
    track('pwa-launch-standalone');
  }

  /* ---------- anything marked data-track="name" ---------- */
  function initClicks() {
    document.addEventListener('click', function (e) {
      var el = e.target && e.target.closest ? e.target.closest('[data-track]') : null;
      if (el) track(el.getAttribute('data-track'));
    }, true);
  }

  load();
  initInstall();
  initClicks();

  global.flTrack = track;
})(window);
