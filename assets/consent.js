/* Skald consent banner (CNIL/ICO opt-in layer).
 *
 * The pages' own gtag blocks already set region-scoped consent DEFAULTS
 * (analytics denied for EU/EEA/UK/CH via gtag's `region` list, granted
 * elsewhere) — that is the compliance floor and it stays in the page.
 * This script adds the opt-IN path: in consent-region timezones with no
 * stored choice, show a banner; Accept -> consent update granted (+persist),
 * Refuse -> persist denial. A stored 'granted' is replayed on later visits.
 * Timezone detection only decides banner VISIBILITY (harmless if wrong);
 * the denial floor never depends on it.
 *
 * Include AFTER the page's gtag defaults/config:
 *   <script src="/assets/consent.js" defer></script>
 */
(function () {
  'use strict';
  var KEY = 'skm-consent'; // 'granted' | 'denied'
  function storedChoice() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function store(choice) {
    try { localStorage.setItem(KEY, choice); } catch (e) { /* private mode */ }
  }
  function inConsentRegionTz() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      return tz.indexOf('Europe/') === 0 ||
        tz === 'Atlantic/Canary' || tz === 'Atlantic/Madeira' ||
        tz === 'Atlantic/Azores' || tz === 'Atlantic/Reykjavik';
    } catch (e) { return false; }
  }
  function push() { window.dataLayer = window.dataLayer || []; window.dataLayer.push(arguments); }
  function grant() { push('consent', 'update', { analytics_storage: 'granted' }); }
  function banner() {
    if (document.getElementById('skm-consent-banner')) return;
    var fr = (document.documentElement.lang || '').indexOf('fr') === 0;
    var el = document.createElement('div');
    el.id = 'skm-consent-banner';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', fr ? 'Consentement aux cookies' : 'Cookie consent');
    el.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:200;' +
      'background:#2a2118;color:#f2e6cf;padding:14px 18px;display:flex;gap:14px;' +
      'align-items:center;flex-wrap:wrap;font:14px/1.5 Georgia,serif;box-shadow:0 -4px 24px rgba(0,0,0,.3)';
    var msg = document.createElement('span');
    msg.style.cssText = 'flex:1;min-width:220px';
    msg.textContent = fr
      ? 'Skald utilise une mesure d’audience anonyme (Google Analytics). Acceptez-vous ces cookies ?'
      : 'Skald uses anonymous audience measurement (Google Analytics). Do you accept these cookies?';
    var accept = document.createElement('button');
    var refuse = document.createElement('button');
    var btnCss = 'font:inherit;padding:8px 16px;border:1px solid #c69260;background:transparent;color:#f2e6cf;cursor:pointer;border-radius:3px';
    accept.style.cssText = btnCss + ';background:#c69260;color:#2a2118;font-weight:600';
    refuse.style.cssText = btnCss;
    accept.textContent = fr ? 'Accepter' : 'Accept';
    refuse.textContent = fr ? 'Refuser' : 'Refuse';
    accept.onclick = function () { store('granted'); grant(); el.remove(); };
    refuse.onclick = function () { store('denied'); el.remove(); };
    el.appendChild(msg); el.appendChild(accept); el.appendChild(refuse);
    document.body.appendChild(el);
  }
  function init() {
    var gpcDnt = navigator.globalPrivacyControl || navigator.doNotTrack === '1';
    if (gpcDnt) return; // respect the signal: no banner, defaults stand
    var choice = storedChoice();
    if (choice === 'granted') { grant(); return; }
    if (choice === 'denied') return;
    if (inConsentRegionTz()) banner();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
