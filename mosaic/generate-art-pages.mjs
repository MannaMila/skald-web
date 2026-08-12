import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mosaicDir = path.dirname(fileURLToPath(import.meta.url));
const html = await readFile(path.join(mosaicDir, "index.html"), "utf8");
const dataMatch = html.match(/const data=(\{.*\});\nconst passages=/s);

if (!dataMatch) throw new Error("Could not read Mosaic artwork data");

const data = JSON.parse(dataMatch[1]);
const site = "https://skald.mannamila.com";
const makeSocial = process.argv.includes("--social");
const forceSocial = process.argv.includes("--force-social");

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[‘’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 86);
}

function artworkRoutes(artworks) {
  const bases = new Map();
  for (const artwork of artworks) {
    const base = slugify(artwork.title) || artwork.id;
    if (!bases.has(base)) bases.set(base, []);
    bases.get(base).push(artwork);
  }

  const routes = {};
  const used = new Set();
  for (const artwork of artworks) {
    const base = slugify(artwork.title) || artwork.id;
    let route = base;
    if (bases.get(base).length > 1) {
      route = `${base}-${slugify(artwork.creator || artwork.museum || artwork.id)}`;
    }
    if (used.has(route)) route = `${route}-${slugify(artwork.id)}`;
    used.add(route);
    routes[artwork.id] = route;
  }
  return routes;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function descriptionFor(artwork) {
  const context = artwork.blurb || artwork.caption || `${artwork.title} by ${artwork.creator}.`;
  const book = artwork.book ? ` Explore its place in Book ${data.groups.find(({ book: id }) => id === artwork.book)?.roman} of the Odyssey.` : "";
  return `${context}${book}`.slice(0, 260);
}

function routePage(artwork, route) {
  const canonical = `${site}/mosaic/art/${route}/`;
  const image = `${site}/mosaic/social/${encodeURIComponent(artwork.id)}.jpg`;
  const title = `${artwork.title} — ${artwork.creator} · The Odyssey in Art`;
  const description = descriptionFor(artwork);
  const location = [artwork.museum || artwork.source_provider, artwork.city].filter(Boolean).join(" · ");
  const structured = {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    name: artwork.title,
    creator: { "@type": "Person", name: artwork.creator },
    dateCreated: artwork.date || undefined,
    artform: artwork.medium || undefined,
    contentLocation: location || undefined,
    image,
    url: canonical,
    description,
    sameAs: artwork.file_page_url || artwork.museum_url || undefined,
  };

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Skald: Odyssey">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${escapeHtml(`${artwork.title} by ${artwork.creator}`)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${image}">
<meta name="twitter:image:alt" content="${escapeHtml(`${artwork.title} by ${artwork.creator}`)}">
<meta name="theme-color" content="#14100C">
<script type="application/ld+json">${JSON.stringify(structured).replace(/</g, "\\u003c")}</script>
<style>html{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#14100c;color:#f1e5cd;font:18px Georgia,serif}main{width:min(760px,calc(100% - 36px));text-align:center}img{display:block;width:100%;height:auto;border:1px solid #5b4939}h1{font-size:clamp(30px,6vw,52px);margin:24px 0 8px}p{line-height:1.55;color:#e3d0ad}a{color:#c59a4a}</style>
</head>
<body>
<main>
 <img src="../../social/${encodeURIComponent(artwork.id)}.jpg" width="1200" height="630" alt="${escapeHtml(`${artwork.title} by ${artwork.creator}`)}">
 <h1>${escapeHtml(artwork.title)}</h1>
 <p>${escapeHtml(artwork.creator)}${artwork.date ? ` · ${escapeHtml(artwork.date)}` : ""}${location ? ` · ${escapeHtml(location)}` : ""}</p>
 <p>${escapeHtml(description)}</p>
 <p><a href="../../?work=${encodeURIComponent(artwork.id)}">Open this artwork in the Odyssey Mosaic</a></p>
</main>
<script>
const target=new URL('/mosaic/',location.origin);
for(const [key,value] of new URLSearchParams(location.search))target.searchParams.set(key,value);
target.searchParams.set('work','${artwork.id}');
location.replace(target);
</script>
</body>
</html>
`;
}

function socialImage(artwork, output) {
  const overlaps = data.tiles.filter(
    (tile) =>
      tile.x < artwork.x + artwork.width &&
      tile.x + tile.width > artwork.x &&
      tile.y < artwork.y + artwork.height &&
      tile.y + tile.height > artwork.y,
  );
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    `color=c=0x14100c:s=${artwork.width}x${artwork.height}:r=1`,
  ];
  for (const tile of overlaps) args.push("-i", path.join(mosaicDir, tile.path));

  const filters = ["[0:v]format=rgb24[base0]"];
  overlaps.forEach((tile, index) => {
    const left = Math.max(artwork.x, tile.x);
    const top = Math.max(artwork.y, tile.y);
    const right = Math.min(artwork.x + artwork.width, tile.x + tile.width);
    const bottom = Math.min(artwork.y + artwork.height, tile.y + tile.height);
    const width = right - left;
    const height = bottom - top;
    const sourceX = left - tile.x;
    const sourceY = top - tile.y;
    const destinationX = left - artwork.x;
    const destinationY = top - artwork.y;
    filters.push(`[${index + 1}:v]crop=${width}:${height}:${sourceX}:${sourceY}[piece${index}]`);
    filters.push(
      `[base${index}][piece${index}]overlay=${destinationX}:${destinationY}:shortest=1[base${index + 1}]`,
    );
  });
  filters.push(
    `[base${overlaps.length}]scale=1200:630:force_original_aspect_ratio=decrease:flags=lanczos,pad=1200:630:(ow-iw)/2:(oh-ih)/2:color=0x14100c[out]`,
  );
  args.push(
    "-filter_complex",
    filters.join(";"),
    "-map",
    "[out]",
    "-frames:v",
    "1",
    "-q:v",
    "3",
    "-y",
    output,
  );
  execFileSync("ffmpeg", args, { stdio: "pipe" });
}

const routes = artworkRoutes(data.artworks);
const artDir = path.join(mosaicDir, "art");
const socialDir = path.join(mosaicDir, "social");
await mkdir(artDir, { recursive: true });
await mkdir(socialDir, { recursive: true });
await writeFile(
  path.join(mosaicDir, "art-routes.js"),
  `globalThis.MOSAIC_ART_ROUTES=${JSON.stringify(routes)};\n`,
);

for (const artwork of data.artworks) {
  const routeDir = path.join(artDir, routes[artwork.id]);
  await mkdir(routeDir, { recursive: true });
  await writeFile(path.join(routeDir, "index.html"), routePage(artwork, routes[artwork.id]));
  const output = path.join(socialDir, `${artwork.id}.jpg`);
  if (makeSocial && (forceSocial || !existsSync(output))) socialImage(artwork, output);
}

const sitemapUrls = [
  `${site}/mosaic/`,
  ...data.artworks.map((artwork) => `${site}/mosaic/art/${routes[artwork.id]}/`),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map((url) => ` <url><loc>${escapeHtml(url)}</loc></url>`).join("\n")}
</urlset>
`;
await writeFile(path.join(mosaicDir, "sitemap.xml"), sitemap);

console.log(
  `Generated ${data.artworks.length} artwork routes${makeSocial ? " and social previews" : ""}.`,
);
