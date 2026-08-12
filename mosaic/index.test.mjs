import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
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

test("store badges name Skald consistently", () => {
  assert.match(
    html,
    /data-store="app_store"[^>]*>[\s\S]*?<b>Skald: Odyssey<\/b> · App Store<\/a>/,
  );
  assert.match(
    html,
    /data-store="google_play"[^>]*>[\s\S]*?<b>Skald: Odyssey<\/b> · Google Play<\/a>/,
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
