// Unit checks for what goes to the App Store and the website: names,
// subtitles and keywords in both listings, the promotional text, the
// product ids, the privacy page, the support page and FAQ, and that the
// listing never suggests the camera scans money.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const meta = readFileSync(`${ROOT}store/metadata.md`, 'utf8');
const section = (h) => meta.split(/\n## /).find((s) => s.startsWith(h)).split('\n').slice(1).join('\n').trim();
const words = (s) => s.toLowerCase().split(/[^a-záéíóúñ]+/).filter(Boolean);

test('English name, subtitle and keywords as briefed: 28, 28 and 99 characters, no word from the name or subtitle', () => {
  const name = section('Name').split('\n')[0];
  const sub = section('Subtitle').split('\n')[0];
  assert.equal(name, 'Count Money: Cash Calculator');
  assert.equal(sub, 'Coin Counter & Money Counter');
  assert.equal(name.length, 28);
  assert.equal(sub.length, 28);
  const kw = section('Keywords, English').split('\n')[0];
  assert.equal(kw, 'counting,tracker,management,till,register,drawer,deposit,bank,float,tips,bills,change,cashier,tally');
  assert.equal(kw.length, 99);
  assert.match(meta, /\(99\/100\)/);
  const banned = new Set(words(`${name} ${sub}`));
  const list = kw.split(',');
  assert.equal(new Set(list).size, list.length);
  for (const w of list) assert.ok(!banned.has(w), w);
});

test('Spanish (Mexico) listing with its own name, subtitle and keywords', () => {
  const es = section('Spanish (Mexico) listing');
  assert.match(es, /Name \(28\/30\): Contador de Dinero: Efectivo\n/);
  assert.match(es, /Subtitle \(29\/30\): Calculadora de caja y monedas\n/);
  const kw = es.match(/Keywords \((\d+)\/100\): (\S+)/);
  assert.equal(kw[2], 'contar,billetes,arqueo,cierre,caja,registradora,deposito,banco,cambio,propinas,total,diario,tienda');
  assert.equal(kw[2].length, Number(kw[1]));
  assert.ok(kw[2].length <= 100);
});

test('promotional text fits; products and RevenueCat ids exactly as set up; prices as briefed', () => {
  const promo = section('Promotional text').split('\n')[0];
  assert.ok(promo.length <= 170, `${promo.length}`);
  assert.match(meta, new RegExp(`## Promotional text \\(${promo.length}/170\\)`));
  for (const id of ['cash_pro_weekly', 'cash_pro_yearly', 'cash_pro_lifetime', '$rc_weekly', '$rc_annual', '$rc_lifetime', 'entitlement `pro`', 'offering `default`']) assert.ok(meta.includes(id), id);
  assert.match(meta, /\$4\.99\/week, 3-day free trial/);
  assert.match(meta, /\$19\.99\/year/);
  assert.match(meta, /\$24\.99 one time/);
  assert.match(meta, /Primary: Business\. Secondary: Finance\./);
  assert.match(meta, /^4\+\./m);
});

test('description leads with outcomes and states the limits; the review note covers free, Pro, the 3-second X, no account and how to test', () => {
  const d = section('Description');
  const first = d.split('\n')[0];
  assert.match(first, /under a minute/);
  assert.match(first, /over or short/);
  assert.match(first, /count sheet/);
  assert.match(d, /Works in airplane mode; nothing leaves your iPhone/);
  assert.match(d, /does not use the camera and does not scan money/);
  assert.match(d, /not accounting or tax software, and gives no financial advice/);
  const note = section('App Review note');
  for (const s of [/Free: unlimited counting/, /Pro adds/, /appears after 3 seconds/, /no account/i, /How to test/, /expected amount/i, /Save count/, /Count sheet/]) assert.match(note, s);
  const shots = section('Screenshots').split('\n').filter((l) => /^\d\. /.test(l));
  assert.equal(shots.length, 6);
  assert.match(section('App Privacy'), /Purchases \(Purchase History\), used for App Functionality, not linked to the user's identity, not used for tracking/);
});

test('the listing never suggests the camera reads cash, and names no brand', () => {
  // Lines that say what the app does not do are the point; every other line must not suggest a scan.
  const body = meta.split('\n').slice(3).filter((l) => !/does not|no camera|No camera/.test(l)).join('\n');
  for (const s of [/scan(s|ning)? (your )?(cash|money|bills|notes)(?! )/i, /\bAI\b/, /recogni[sz]/i, /point (your )?camera/i]) assert.equal(body.match(s), null, `${s}`);
  for (const b of [/square/i, /clover/i, /toast/i, /shopify/i, /quickbooks/i, /paypal/i, /venmo/i]) assert.equal(body.match(b), null, `${b}`);
});

test('privacy page: Purchases, not linked to identity, through RevenueCat, and nothing more is collected', () => {
  const p = readFileSync(`${ROOT}docs/privacy.html`, 'utf8');
  assert.match(p, /Purchases/);
  assert.match(p, /RevenueCat/);
  assert.match(p, /not linked to your identity/);
  assert.match(p, /That is all\./);
  assert.match(p, /No camera, microphone, location, contacts or photos/);
  for (const w of [/analytics provider/i, /we collect your (name|email|location)/i, /advertis/i, /cookies/i]) assert.equal(p.match(w), null, `${w}`);
  assert.match(p, /mailto:bkdigitalleads@gmail\.com/);
});

test('website: landing, privacy, support with an FAQ, sitemap and robots, the App Store link, every image present', () => {
  for (const f of ['index.html', 'privacy.html', 'support.html', 'style.css', 'icon-512.png', 'apple-touch-icon.png', 'og-image.png', 'robots.txt', 'sitemap.xml', 'fonts/OFL-Barlow.txt']) assert.ok(existsSync(`${ROOT}docs/${f}`), f);
  const support = readFileSync(`${ROOT}docs/support.html`, 'utf8');
  assert.match(support, /mailto:bkdigitalleads@gmail\.com/);
  assert.match(support, /we reply within two business days/);
  assert.ok((support.match(/<details>/g) ?? []).length >= 5, 'an FAQ');
  const index = readFileSync(`${ROOT}docs/index.html`, 'utf8');
  assert.match(index, /https:\/\/apps\.apple\.com\/app\/id6838074076/);
  for (const m of index.matchAll(/src="([^"]+\.png)"/g)) assert.ok(existsSync(`${ROOT}docs/${m[1]}`), m[1]);
  const sitemap = readFileSync(`${ROOT}docs/sitemap.xml`, 'utf8');
  for (const p of ['cashcounter/</loc>', 'support.html', 'privacy.html']) assert.ok(sitemap.includes(p), p);
  assert.match(readFileSync(`${ROOT}docs/robots.txt`, 'utf8'), /Sitemap: https:\/\/bkdigitalleads-cmyk\.github\.io\/cashcounter\/sitemap\.xml/);
});

function pngSize(file) {
  const b = readFileSync(file);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

test('app icon files: 1024x1024 with no alpha, splash, favicon and website icons; a stand-in until Brian picks', () => {
  const b = readFileSync(`${ROOT}assets/icon.png`);
  assert.deepEqual(pngSize(`${ROOT}assets/icon.png`), [1024, 1024]);
  assert.equal(b[25], 2, 'color type 2: RGB, no alpha');
  for (const [f, w] of [['assets/splash-icon.png', 512], ['assets/splash-icon-dark.png', 512], ['assets/favicon.png', 48], ['assets/android-icon-foreground.png', 1024], ['docs/icon-512.png', 512], ['docs/apple-touch-icon.png', 180]]) assert.deepEqual(pngSize(`${ROOT}${f}`), [w, w], f);
});
