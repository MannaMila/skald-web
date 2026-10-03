// Carries a campaign tag from the page URL into the two store links, so a link such as
// https://skald.mannamila.com/?utm_source=linkedin&utm_medium=social&utm_campaign=linkedin-2026-10
// reaches Google Play as an install-referrer UTM and the App Store as a campaign token.
// Nothing is stored and no request is made; the stores do their own counting.
(function () {
  var APPLE_PROVIDER_TOKEN = ""; // App Store Connect → Analytics → Campaigns → provider id (pt); empty = ct only
  var SAFE = /^[A-Za-z0-9_.-]{1,64}$/;
  var KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

  function campaign() {
    var params = new URLSearchParams(window.location.search);
    var out = {};
    KEYS.forEach(function (key) {
      var value = params.get(key);
      if (value && SAFE.test(value)) out[key] = value;
    });
    return out.utm_source ? out : null;
  }

  function playUrl(href, tag) {
    var url = new URL(href);
    if (url.hostname !== "play.google.com") return href;
    var referrer = new URLSearchParams();
    KEYS.forEach(function (key) {
      if (tag[key]) {
        url.searchParams.set(key, tag[key]);
        referrer.set(key, tag[key]);
      }
    });
    url.searchParams.set("referrer", referrer.toString());
    return url.toString();
  }

  function appleUrl(href, tag) {
    var url = new URL(href);
    if (url.hostname !== "apps.apple.com") return href;
    var ct = tag.utm_campaign || tag.utm_source;
    if (tag.utm_content) ct += "-" + tag.utm_content;
    if (APPLE_PROVIDER_TOKEN) url.searchParams.set("pt", APPLE_PROVIDER_TOKEN);
    url.searchParams.set("ct", ct.slice(0, 40));
    url.searchParams.set("mt", "8");
    return url.toString();
  }

  function apply() {
    var tag = campaign();
    if (!tag) return;
    document.querySelectorAll('a[href^="https://play.google.com/store/apps/details?id=com.mannamila.skald"]').forEach(function (link) {
      link.href = playUrl(link.href, tag);
    });
    document.querySelectorAll('a[href^="https://apps.apple.com/app/id6790579937"]').forEach(function (link) {
      link.href = appleUrl(link.href, tag);
    });
  }

  window.skaldCampaignLinks = apply;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
})();
