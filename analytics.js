(() => {
  const measurementId = "G-E0E4FPDPTB";
  const allowedHostnames = new Set([
    "skald.mannamila.com",
    "squash.mannamila.com",
    "inspire.mannamila.com",
  ]);
  const hostname = window.location.hostname.toLowerCase();

  if (!allowedHostnames.has(hostname)) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    cookie_domain: "mannamila.com",
    cookie_flags: "SameSite=Lax;Secure",
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.append(script);
})();
