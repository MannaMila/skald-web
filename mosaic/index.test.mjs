import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const attributionHtml = await readFile(
  new URL("./attribution.html", import.meta.url),
  "utf8",
);
const resolutionsScript = await readFile(
  new URL("./art-resolutions.js", import.meta.url),
  "utf8",
);
const inlineScript = html.match(/<script>([\s\S]*)<\/script>/)?.[1];

test("inline viewer script parses", () => {
  assert.ok(inlineScript);
  assert.doesNotThrow(() => new Function(inlineScript));
});

test("store badges use the standard interface type and foreground color", () => {
  assert.match(
    html,
    /\.badge\{[^}]*font-family:'NotoSerif',Georgia,serif[^}]*color:var\(--paper\)/,
  );
  assert.match(html, /\.badge b\{color:inherit/);
  assert.match(html, /\.badge svg\{[^}]*fill:currentColor/);
});

test("store badges pair a context-specific action with each store", () => {
  assert.match(
    html,
    /data-store="app_store"[^>]*>[\s\S]*?<b>\$\{esc\(promotion\.action\)\}<\/b> · App Store<\/a>/,
  );
  assert.match(
    html,
    /data-store="google_play"[^>]*>[\s\S]*?<b>\$\{esc\(promotion\.action\)\}<\/b> · Google Play<\/a>/,
  );
});

test("the in-app heading carries a compact artwork context snippet", () => {
  assert.match(
    html,
    /<div class="in-app-row">\s*<p class="in-app">In the app<\/p>\s*<p class="in-app-note">\$\{esc\(promotion\.comparison\)\}\.<\/p>\s*<\/div>/,
  );
  assert.match(
    html,
    /\.in-app-row\{display:flex;align-items:baseline;justify-content:space-between/,
  );
  assert.match(
    html,
    /\.in-app-note\{[^}]*font-size:10px[^}]*text-align:right/,
  );
});

test("artwork-specific content leads the Skald CTA and stores lead the promotion", () => {
  const detailTemplate = html.match(
    /infoPane\.innerHTML=`([\s\S]*?)`;\n veil\.classList/,
  )?.[1];

  assert.ok(detailTemplate);
  assert.ok(
    detailTemplate.indexOf('${story?') <
      detailTemplate.indexOf('<div class="skald-cta'),
    "the unique artwork story must appear before the app promotion",
  );
  assert.ok(
    detailTemplate.indexOf("${status}") <
      detailTemplate.indexOf('<div class="skald-cta'),
    "the unique museum status must appear before the app promotion",
  );
  assert.ok(
    detailTemplate.indexOf('<div class="badges">') <
      detailTemplate.indexOf('<div class="cta-body">'),
    "store links must lead the app section",
  );
});

test("phone portrait favors the artwork over a second promotional screenshot", () => {
  assert.match(
    html,
    /\.cta-body\{display:grid;grid-template-columns:minmax\(88px,118px\) minmax\(0,1fr\)/,
  );
  assert.match(
    html,
    /@media \(max-width:600px\) and \(orientation:portrait\)\{[\s\S]*?\.skald-cta \.cta-body\{display:none\}/,
  );
  assert.match(html, /class="cta-footnote"/);
});

test("phone portrait places a tiny reader screenshot beside the poetry", () => {
  const detailTemplate = html.match(
    /infoPane\.innerHTML=`([\s\S]*?)`;\n veil\.classList/,
  )?.[1];

  assert.ok(detailTemplate);
  assert.match(
    detailTemplate,
    /<div class="passage-copy"><div class="lines">[\s\S]*?<\/div><div class="ref">[\s\S]*?<\/div><\/div>\s*\$\{shot\?`<button type="button" class="poetry-shot screenshot-open"[^>]*><img src="\$\{shot\}"/,
  );
  assert.match(html, /\.poetry-shot\{display:none\}/);
  assert.doesNotMatch(html, /\n\.screenshot-open\{[^}]*display:block/);
  assert.match(html, /\.phone\.screenshot-open\{display:block\}/);
  assert.match(
    html,
    /@media \(max-width:600px\) and \(orientation:portrait\)\{[\s\S]*?\.passage\.has-poetry-shot\{[^}]*display:grid[^}]*grid-template-columns:minmax\(0,1fr\) 52px[^}]*align-items:end/,
  );
  assert.match(
    html,
    /@media \(max-width:600px\) and \(orientation:portrait\)\{[\s\S]*?\.poetry-shot\{[^}]*display:block[^}]*width:52px[^}]*justify-self:end/,
  );
});

test("reader screenshots open an isolated nested modal", () => {
  const detailTemplate = html.match(
    /infoPane\.innerHTML=`([\s\S]*?)`;\n veil\.classList/,
  )?.[1];

  assert.ok(detailTemplate);
  assert.match(
    html,
    /id="shot-modal"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-hidden="true"/,
  );
  assert.match(html, /id="shot-image"/);
  assert.match(html, /id="shot-close"[^>]*aria-label="Close reader screenshot"/);
  assert.match(
    detailTemplate,
    /class="phone screenshot-open"[^>]*data-reader-shot/,
  );
  assert.match(
    detailTemplate,
    /class="poetry-shot screenshot-open"[^>]*data-reader-shot/,
  );
  assert.match(html, /function openScreenshotModal\(trigger,w,shot,bookLabel\)/);
  assert.match(html, /function closeScreenshotModal\(restoreFocus=true\)/);
  assert.match(
    html,
    /modal\.setAttribute\('aria-hidden','true'\)[\s\S]*?modal\.removeAttribute\('aria-hidden'\)/,
  );
});

test("nested screenshot modal overlays both tracked store links", () => {
  assert.match(
    html,
    /id="shot-actions"[^>]*aria-label="Get Skald"[\s\S]*?data-store="app_store"[\s\S]*?data-store="google_play"/,
  );
  assert.match(
    html,
    /#shot-actions\{[^}]*position:absolute[^}]*top:var\(--shot-top,16px\)[^}]*right:var\(--shot-right,16px\)/,
  );
  assert.match(html, /function positionScreenshotControls\(\)/);
  assert.match(html, /imageBounds\.left-stageBounds\.left\+inset/);
  assert.match(
    html,
    /trackStoreClick\(link\.dataset\.store,shotArtwork,'reader_screenshot'\)/,
  );
  assert.match(html, /track\('view_reader_screenshot'/);
  assert.match(
    html,
    /if\(e\.key==='Escape'\)\{\s*if\(shotModal\.classList\.contains\('open'\)\)closeScreenshotModal\(\);\s*else closeModal\(\);/,
  );
});

test("every artwork has a source-resolution-backed useful zoom ceiling", () => {
  const dataJson = html.match(/const data=(\{.*\});\nconst passages=/)?.[1];
  const resolutionsJson = resolutionsScript.match(
    /globalThis\.MOSAIC_ART_RESOLUTIONS=(\{.*\});/,
  )?.[1];

  assert.ok(dataJson);
  assert.ok(resolutionsJson);
  const artworks = JSON.parse(dataJson).artworks;
  const resolutions = JSON.parse(resolutionsJson);
  assert.deepEqual(
    artworks.filter(({ id }) => !resolutions[id]),
    [],
    "every mosaic artwork needs source pixel dimensions",
  );
  assert.deepEqual(resolutions["aic-110760"], [750, 283]);
  assert.ok(
    new Set(Object.values(resolutions).map(([width, height]) => Math.max(width, height)))
      .size > 20,
    "useful zoom must vary with actual source resolution",
  );
});

test("modal zoom readout shows current scale and the useful-detail ceiling", () => {
  assert.match(
    html,
    /<script src="art-resolutions\.js"><\/script>\s*<script src="art-routes\.js"><\/script>\s*<script>/,
  );
  assert.match(html, /id="art-zoom"[^>]*>1× \/ … detail<\/output>/);
  assert.match(html, /function usefulDetailScale\(w,width,height\)/);
  assert.match(
    html,
    /const deliveredPixels=Math\.min\(Math\.max\(w\.width,w\.height\),Math\.max\(source\[0\],source\[1\]\)\)/,
  );
  assert.match(
    html,
    /artZoomOutput\.value=`\$\{[^}]+\}× \/ \$\{formatDetailScale\(detailView\.detailScale\)\}× detail`/,
  );
  assert.match(html, /artZoomOutput\.classList\.toggle\('past-detail'/);
});

test("app explanation remains grouped with its screenshot on larger viewports", () => {
  const detailTemplate = html.match(
    /infoPane\.innerHTML=`([\s\S]*?)`;\n veil\.classList/,
  )?.[1];

  assert.ok(detailTemplate);
  assert.match(
    detailTemplate,
    /<div class="cta-copy">[\s\S]*?<h3>[\s\S]*?<\/h3>\s*<p class="cta-footnote">[\s\S]*?<\/p>\s*<\/div>/,
  );
  assert.match(html, /\.cta-copy\{[^}]*justify-content:flex-start[^}]*gap:10px/);
});

test("phone portrait brings unique content up and keeps stores in one compact row", () => {
  const detailTemplate = html.match(
    /infoPane\.innerHTML=`([\s\S]*?)`;\n veil\.classList/,
  )?.[1];

  assert.ok(detailTemplate);
  assert.ok(
    detailTemplate.indexOf("${status}") > detailTemplate.indexOf("${story?"),
    "ON VIEW must follow the unique artwork story",
  );
  assert.ok(
    detailTemplate.indexOf("${status}") <
      detailTemplate.indexOf('<p class="in-app">In the app</p>'),
    "ON VIEW must remain above the app promotion",
  );
  assert.match(
    html,
    /@media \(max-width:600px\)\{[\s\S]*?#art-pane\{[^}]*height:38%[^}]*min-height:220px[^}]*max-height:340px/,
  );
  assert.match(
    html,
    /@media \(max-width:600px\)\{[\s\S]*?#info-pane\{[^}]*padding:12px 16px/,
  );
  assert.match(
    html,
    /@media \(max-width:600px\)\{[\s\S]*?\.badges\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/,
  );
});

test("short phone landscape keeps the stores above the fold", () => {
  assert.match(
    html,
    /@media \(max-width:860px\) and \(orientation:landscape\) and \(max-height:600px\)\{/,
  );
  assert.match(
    html,
    /@media \(max-width:860px\) and \(orientation:landscape\) and \(max-height:600px\)\{[\s\S]*?#sheet\{[^}]*flex-direction:row/,
  );
  assert.match(
    html,
    /@media \(max-width:860px\) and \(orientation:landscape\) and \(max-height:600px\)\{[\s\S]*?#art-pane\{[^}]*min-height:0/,
  );
});

test("modal artwork exposes isolated wheel, pinch, and drag interaction", () => {
  assert.match(html, /id="art-pane"[^>]*tabindex="0"/);
  assert.match(html, /id="art-surface"/);
  assert.match(html, /#art-pane\{[^}]*touch-action:none[^}]*cursor:grab/);
  assert.match(html, /artPane\.addEventListener\('wheel'/);
  assert.match(html, /artPane\.addEventListener\('pointerdown'/);
  assert.match(html, /artPane\.addEventListener\('pointermove'/);
  assert.match(html, /artPane\.addEventListener\('pointerup'/);
  assert.match(html, /function fitDetail\(w\)/);
  assert.match(html, /function zoomDetailAt\(next,cx,cy,method\)/);
  assert.match(html, /const detailPointers=new Map\(\)/);
});

test("artwork pan leaves modal controls clickable", () => {
  const pointerDown = html.match(
    /artPane\.addEventListener\('pointerdown',event=>\{([\s\S]*?)\n\}\);/,
  )?.[1];

  assert.ok(pointerDown);
  assert.match(pointerDown, /event\.target\.closest\('button,a'\)/);
  assert.ok(
    pointerDown.indexOf("event.target.closest('button,a')") <
      pointerDown.indexOf("event.preventDefault()"),
    "interactive controls must be ignored before pan cancels the pointer event",
  );
});

test("fit all invalidates stale canvas gestures before resetting the view", () => {
  const resetGestureMatch = html.match(
    /function resetCanvasGesture\(\)\{([\s\S]*?)\n\}/,
  );
  const resetGesture = resetGestureMatch?.[1];
  const fit = html.match(/function fit\(\)\{([\s\S]*?)\n\}/)?.[1];

  assert.ok(resetGesture);
  assert.match(resetGesture, /pointers\.clear\(\)/);
  assert.match(resetGesture, /gesture=null/);
  assert.match(resetGesture, /stage\.classList\.remove\('dragging'\)/);
  assert.ok(fit);
  assert.ok(
    fit.indexOf("resetCanvasGesture()") < fit.indexOf("scale=Math.min"),
    "fit must clear the old gesture before calculating the fitted transform",
  );

  const resetState = new Function(`
    const pointers=new Map([[17,{x:900,y:400}]]);
    let gesture={type:'pan',px:900,py:400,x:-12000,y:-7000},moved=true;
    const removed=[];
    const stage={classList:{remove:value=>removed.push(value)},style:{cursor:'grabbing'}};
    const hoverBox={style:{display:'block'}};
    ${resetGestureMatch[0]}
    resetCanvasGesture();
    return {pointerCount:pointers.size,gesture,moved,removed,cursor:stage.style.cursor,hover:hoverBox.style.display};
  `)();
  assert.deepEqual(resetState, {
    pointerCount: 0,
    gesture: null,
    moved: false,
    removed: ["dragging"],
    cursor: "grab",
    hover: "none",
  });
});

test("desktop canvas recovers when a pointer release is missed", () => {
  const pointerMove = html.match(
    /stage\.addEventListener\('pointermove',e=>\{([\s\S]*?)\n\}\);/,
  )?.[1];

  assert.ok(pointerMove);
  assert.match(
    pointerMove,
    /e\.pointerType==='mouse'&&e\.buttons===0[\s\S]*?endPointer\(e\)/,
  );
  assert.match(
    html,
    /stage\.addEventListener\('lostpointercapture',endPointer\)/,
  );
});

test("GA4 is privacy-scoped and covers detail engagement", () => {
  assert.match(html, /const GA_ID="G-K0V3J9TLBF"/);
  assert.match(html, /cookie_domain:'none'/);
  assert.match(html, /cookie_path:'\/mosaic\/'/);
  assert.match(html, /allow_google_signals:false/);
  assert.match(html, /allow_ad_personalization_signals:false/);
  assert.match(html, /trackDetail\('zoom_artwork'/);
  assert.match(html, /trackDetail\('pan_artwork'/);
  assert.match(html, /let detailEngagement=\{zoom:false,pan:false\}/);
});

test("every artwork click sends the exact artwork identity to GA4", () => {
  assert.match(
    html,
    /function trackArtworkView\(w\)/,
  );
  assert.match(html, /artwork_id:w\.id,artwork_title:w\.title,book:w\.book\|\|0/);
  assert.match(html, /museum:w\.museum\|\|w\.source_provider,mosaic_index:w\.index/);
  assert.match(html, /track\('view_artwork',params\)/);
});

test("artwork and store events carry action-order context", () => {
  assert.match(
    html,
    /const actionContext=\{sequence:0,artworksViewed:0,storeClicks:0,lastArtwork:null\}/,
  );
  assert.match(html, /interaction_sequence:\+\+actionContext\.sequence/);
  assert.match(html, /store_clicks_before_event:actionContext\.storeClicks/);
  assert.match(html, /artworks_viewed_before_store:actionContext\.artworksViewed/);
  assert.match(
    html,
    /store_timing:actionContext\.artworksViewed>0\?'after_artwork_view':'before_artwork_view'/,
  );
  assert.match(html, /last_artwork_id:last\?last\.id:''/);
  assert.match(html, /track\('click_store',params\)/);
});

test("the public Mosaic and its artwork previews are indexable", () => {
  assert.doesNotMatch(
    html,
    /noindex|nofollow|nosnippet|noimageindex/,
    "the former private-launch crawler block must not return",
  );
  assert.match(
    html,
    /<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">/,
  );
  assert.match(html, /<base href="\/mosaic\/">/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  assert.doesNotMatch(
    attributionHtml,
    /noindex|nofollow|nosnippet|noimageindex/,
    "public artwork credits must remain discoverable with the Mosaic",
  );
});

test("artwork exploration updates history and restores through popstate", () => {
  assert.match(html, /<script src="art-routes\.js"><\/script>/);
  assert.match(html, /function artworkPath\(w\)/);
  assert.match(html, /function updateExplorationUrl\(state,mode='push'\)/);
  assert.ok(html.includes("history[`${mode}State`](state,'',url)"));
  assert.match(html, /updateExplorationUrl\(\{work:w\.id\}/);
  assert.match(html, /updateExplorationUrl\(\{book:g\.book\}/);
  assert.match(html, /addEventListener\('popstate',restoreExplorationFromUrl\)/);
  assert.match(html, /function updateArtworkMetadata\(w\)/);
  assert.match(html, /document\.title=/);
  assert.match(html, /setMeta\('meta\[property="og:image"\]'/);
});

test("artwork modal offers native sharing and copyable permanent links", () => {
  assert.match(html, /class="share-actions"/);
  assert.match(html, />Share this artwork<\/button>/);
  assert.match(html, />Copy link<\/button>/);
  assert.match(html, /function shareArtwork\(w,trigger\)/);
  assert.match(html, /navigator\.share\(shareData\)/);
  assert.match(html, /function copyArtworkLink\(w,trigger/);
  assert.match(html, /navigator\.clipboard\.writeText\(url\)/);
  assert.match(html, /track\('share_artwork'/);
});

test("store clicks preserve inbound campaign dimensions and artwork context", () => {
  assert.match(
    html,
    /const INBOUND_CAMPAIGN_KEYS=\['utm_id','utm_source','utm_medium','utm_campaign','utm_content','utm_term'\]/,
  );
  assert.match(html, /const inboundCampaign=readInboundCampaign\(location\.search\)/);
  assert.match(html, /function campaignForArtwork\(w\)/);
  assert.match(html, /mosaic_artwork_id:w\.id/);
  assert.match(html, /play\.searchParams\.set\('referrer',campaign\.toString\(\)\)/);
  assert.match(html, /apple\.searchParams\.set\('ct',appleCampaignToken\(campaign\)\)/);
  assert.match(html, /utm_source:campaign\.get\('utm_source'\)/);
  assert.match(html, /utm_content:campaign\.get\('utm_content'\)/);
});

test("the CTA is passage-specific while free-edition copy waits for release", () => {
  assert.match(html, /const FREE_EDITION_LIVE=false/);
  assert.match(html, /Continue from this passage/);
  assert.match(html, /Compare this passage across ten translations/);
  assert.match(html, /Read Book \$\{ROMAN\[w\.book\]\} free in Skald/);
  assert.match(html, /Free download · Books I, II and IX included/);
  assert.match(html, /One-time purchase · All 24 books included/);
});

test("all 200 artworks have permanent index pages and social cards", async () => {
  const dataJson = html.match(/const data=(\{.*\});\nconst passages=/)?.[1];
  const routesScript = await readFile(
    new URL("./art-routes.js", import.meta.url),
    "utf8",
  );
  const routesJson = routesScript.match(
    /globalThis\.MOSAIC_ART_ROUTES=(\{.*\});/,
  )?.[1];

  assert.ok(dataJson);
  assert.ok(routesJson);
  const artworks = JSON.parse(dataJson).artworks;
  const routes = JSON.parse(routesJson);
  assert.equal(Object.keys(routes).length, artworks.length);

  for (const artwork of artworks) {
    const slug = routes[artwork.id];
    assert.ok(slug, `missing route for ${artwork.id}`);
    await access(new URL(`./art/${slug}/index.html`, import.meta.url));
    await access(new URL(`./social/${artwork.id}.jpg`, import.meta.url));
  }

  const sample = artworks.find(({ id }) => id === "ngv-waterhouse-ulysses-sirens");
  const sampleSlug = routes[sample.id];
  const routeHtml = await readFile(
    new URL(`./art/${sampleSlug}/index.html`, import.meta.url),
    "utf8",
  );
  const canonical = `https://skald.mannamila.com/mosaic/art/${sampleSlug}/`;
  assert.match(routeHtml, /<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">/);
  assert.ok(routeHtml.includes(`<link rel="canonical" href="${canonical}">`));
  assert.ok(routeHtml.includes(`<meta property="og:url" content="${canonical}">`));
  assert.ok(routeHtml.includes("/mosaic/social/ngv-waterhouse-ulysses-sirens.jpg"));
  assert.match(routeHtml, /<meta property="og:image:width" content="1200">/);
  assert.match(routeHtml, /<meta property="og:image:height" content="630">/);
  assert.match(routeHtml, /<h1>Ulysses and the Sirens<\/h1>/);
  assert.match(routeHtml, /"sameAs":"https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
  assert.doesNotMatch(routeHtml, /"license":"https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
  assert.match(routeHtml, /target\.searchParams\.set\('work','ngv-waterhouse-ulysses-sirens'\)/);

  const sitemap = await readFile(new URL("./sitemap.xml", import.meta.url), "utf8");
  assert.ok(sitemap.includes(`<loc>${canonical}</loc>`));
  assert.equal((sitemap.match(/<url>/g) || []).length, artworks.length + 1);
});
