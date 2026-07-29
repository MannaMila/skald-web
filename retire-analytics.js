(() => {
  "use strict";

  const hostname = window.location.hostname.toLowerCase();
  if (hostname !== "mannamila.com" && !hostname.endsWith(".mannamila.com")) return;

  const names = [
    ...new Set(
      document.cookie
        .split(";")
        .map((entry) => entry.slice(0, entry.indexOf("=")).trim())
        .filter((name) => name === "_ga" || name.startsWith("_ga_")),
    ),
  ].sort();
  const expired =
    "=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax; Secure";

  for (const name of names) {
    document.cookie = `${name}${expired}`;
    document.cookie = `${name}${expired}; Domain=mannamila.com`;
  }
})();
