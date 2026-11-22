// Unit checks for the engine carried over from Estimate Maker (trial and
// plan rules, the Pro re-check), the app config, the copy rules, the
// onboarding order, the paywall and the design rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const O = await import('../src/offer.ts');

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(`${ROOT}${f}`, 'utf8');

function walk(dir, ext) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const p = `${dir}/${f}`;
    if (f === 'node_modules') return [];
    return statSync(p).isDirectory() ? walk(p, ext) : ext.some((e) => p.endsWith(e)) ? [p] : [];
  });
}

/** An 8-bit RGB PNG, decoded with Node's zlib (no image library), for checking the shipped icon. */
function decodeRgbPng(buf) {
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  assert.equal(buf[24], 8);
  assert.equal(buf[25], 2);
  const parts = [];
  for (let at = 8; at < buf.length; ) {
    const len = buf.readUInt32BE(at);
    if (buf.toString('latin1', at + 4, at + 8) === 'IDAT') parts.push(buf.subarray(at + 8, at + 8 + len));
    at += 12 + len;
  }
  const data = inflateSync(Buffer.concat(parts));
  const stride = width * 3;
  const rgb = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const f = data[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = data[y * (stride + 1) + 1 + x];
      const a = x >= 3 ? rgb[y * stride + x - 3] : 0;
      const b = y > 0 ? rgb[(y - 1) * stride + x] : 0;
      const c = x >= 3 && y > 0 ? rgb[(y - 1) * stride + x - 3] : 0;
      const p = a + b - c;
      const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const pred = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      rgb[y * stride + x] = (v + pred) & 255;
    }
  }
  return { width, height, rgb };
}

// ---------- trial and plans (engine copy) ----------

test('trial: "3 days free" only for a free intro offer this Apple ID can still get', () => {
  const intro = { price: 0, periodNumberOfUnits: 3, periodUnit: 'DAY' };
  assert.equal(O.trialLength(intro), '3 days');
  assert.equal(O.trialLength({ ...intro, price: 0.99 }), null);
  assert.equal(O.trialLabelFrom(intro, true), '3 days free');
  assert.equal(O.trialLabelFrom(intro, false), null);
});

test('trial reminder: a day before the trial ends; sandbox-short or unknown ends fall back to 2 days out', () => {
  const H = 3_600_000;
  const now = Date.UTC(2026, 10, 22, 12);
  assert.equal(O.trialReminderAt(now + 72 * H, now), now + 48 * H);
  assert.equal(O.trialReminderAt(now + 5 * 60_000, now), now + 48 * H);
  assert.equal(O.trialReminderAt(null, now), now + 48 * H);
});

test('plans: three rows, weekly first and preselected on both paywalls, then yearly, then lifetime; disclosure has every price', () => {
  for (const onb of [true, false]) {
    assert.deepEqual(O.planOrder(onb), ['WEEKLY', 'ANNUAL', 'LIFETIME']);
    assert.equal(O.preselect(['LIFETIME', 'ANNUAL', 'WEEKLY'], onb), 'WEEKLY');
  }
  assert.equal(O.planTypeOf('MONTHLY'), null);
  const d = O.disclosureText({ weekly: '$4.99', yearly: '$19.99', lifetime: '$24.99', trial: '3 days free' });
  assert.match(d, /Weekly \$4\.99\/week .*3 days free/);
  assert.match(d, /Yearly \$19\.99\/year/);
  assert.match(d, /Lifetime \$24\.99 is a one-time purchase/);
});

test('purchases.ts is the engine copy: entitlement pro, key must start with appl_, offering current; the foreground Pro re-check never takes Pro away on an error', () => {
  const p = read('src/purchases.ts');
  assert.match(p, /export const ENTITLEMENT_ID = 'pro';/);
  assert.match(p, /!apiKey\.startsWith\('appl_'\)/);
  assert.match(p, /offerings\.current/);
  assert.match(p, /export async function checkPro\(\): Promise<boolean \| null>/);
  const st = read('src/state.tsx');
  assert.match(st, /checkPro\(\)\.then\(\(v\) => \{\s*if \(v !== null\) setStorePro\(v\);/);
  assert.match(st, /onProChange\(/);
});

// ---------- config ----------

test('app.json: identity, iPhone only, no permissions, push entitlement plugin last, the store values from Cowork', () => {
  const app = JSON.parse(read('app.json')).expo;
  assert.equal(app.name, 'Cash Counter');
  assert.equal(app.slug, 'cashcounter');
  assert.equal(app.ios.bundleIdentifier, 'com.bwk.cashcounter');
  assert.equal(app.version, '1.0.0');
  assert.equal(app.ios.buildNumber, '1');
  assert.equal(app.ios.supportsTablet, false);
  assert.equal(app.owner, 'bkdeveloper123');
  assert.equal(JSON.parse(read('package.json')).version, app.version);
  assert.equal(app.plugins[app.plugins.length - 1], './plugins/withoutPushEntitlement');
  assert.ok(!JSON.stringify(app).match(/UsageDescription|Camera|Microphone|Location|Photo|Contacts|image-picker|camera/i));
  const eas = JSON.parse(read('eas.json'));
  assert.equal(eas.cli.appVersionSource, 'local');
  assert.equal(eas.build.production.autoIncrement, false);
  // From Cowork, Nov 22: the public RevenueCat SDK key and the App Store Connect app id.
  assert.equal(app.extra.revenueCatApiKeyIos, 'appl_ceOFPmkMDeqJMhPczUWrOeZzcoa');
  assert.equal(eas.submit.production.ios.ascAppId, '6838074076');
});

test('placeholders: only the Expo project id is left, clearly marked, for Cowork to fill', () => {
  const mark = new RegExp(['TODO', 'COWORK'].join('_'), 'g');
  const app = JSON.parse(read('app.json')).expo;
  assert.equal(app.extra.eas.projectId, `${['TODO', 'COWORK'].join('_')}_EAS_PROJECT_ID`);
  const files = ['eas.json', 'package.json', 'App.tsx', 'index.ts', ...walk(`${ROOT}src`, ['.ts', '.tsx']).map((f) => f.slice(ROOT.length)), ...walk(`${ROOT}docs`, ['.html']).map((f) => f.slice(ROOT.length))];
  const found = files.filter((f) => mark.test(read(f)));
  assert.deepEqual(found, []);
  // The Expo project is not in any workflow yet, so nothing builds by accident.
  assert.match(read('.eas/workflows/deploy.yml'), /branches: \['main'\]/);
});

test('no native modules or permissions the app does not need', () => {
  const deps = Object.keys(JSON.parse(read('package.json')).dependencies);
  for (const d of ['expo-camera', 'expo-image-picker', 'expo-location', 'expo-contacts', 'expo-media-library', '@shopify/react-native-skia', 'expo-mail-composer']) assert.ok(!deps.includes(d), d);
  for (const f of walk(`${ROOT}src`, ['.ts', '.tsx'])) assert.ok(!/from 'expo-(camera|image-picker|location|contacts|media-library)'/.test(readFileSync(f, 'utf8')), f);
});

// ---------- copy ----------

test('copy: no em dashes, exclamation marks, banned words or brand names in the app, the website or the store text', () => {
  const files = [...walk(`${ROOT}src`, ['.ts', '.tsx']), `${ROOT}App.tsx`, ...walk(`${ROOT}docs`, ['.html']), ...[`${ROOT}store/metadata.md`].filter(existsSync)];
  for (const f of files) {
    let s = readFileSync(f, 'utf8');
    if (f.endsWith('metadata.md')) s = s.split('\n').slice(3).join('\n'); // the line that names the rule
    if (/\.(ts|tsx)$/.test(f)) s = (s.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`|>[^<>{}]+</g) ?? []).filter((t) => !/^'\.\.?\//.test(t) && !/^'(react|expo|@)/.test(t)).join('\n');
    assert.ok(!s.includes('—'), `em dash in ${f}`);
    for (const w of [/\bunlock/i, /\bpremium\b/i, /\bseamless/i, /\beffortless/i, new RegExp(`\\b${['wel', 'come'].join('')}\\b`, 'i'), /\blet's\b/i, /\blet’s\b/i]) assert.equal(s.match(w), null, `${w} in ${f}`);
  }
  for (const f of [...walk(`${ROOT}src`, ['.tsx']), `${ROOT}App.tsx`]) {
    const strings = readFileSync(f, 'utf8').match(/'[^'\n]*'|"[^"\n]*"|`[^`\n]*`|>[^<>{}\n]+</g) ?? [];
    for (const t of strings) assert.ok(!/[A-Za-z0-9.]!(\s|$|['"`<])/.test(t), `exclamation in ${f}: ${t}`);
  }
  for (const f of [...walk(`${ROOT}src`, ['.ts', '.tsx']), `${ROOT}App.tsx`, ...walk(`${ROOT}docs`, ['.html', '.md']), ...walk(`${ROOT}store`, ['.md', '.js', '.mjs', '.py']), `${ROOT}README.md`, `${ROOT}NOTES.md`, `${ROOT}CLAUDE.md`].filter(existsSync))
    assert.ok(!/brianwkershner/i.test(readFileSync(f, 'utf8')), `personal address in ${f}`);
  assert.match(read('src/links.ts'), /SUPPORT_EMAIL = 'bkdigitalleads@gmail\.com'/);
  for (const f of [...walk(`${ROOT}src`, ['.ts', '.tsx']), ...walk(`${ROOT}docs`, ['.html'])])
    for (const m of readFileSync(f, 'utf8').matchAll(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g)) assert.equal(m[0], 'bkdigitalleads@gmail.com', `${m[0]} in ${f}`);
  // The examples from the brief, word for word.
  assert.match(read('src/screens/Count.tsx'), /label="Save count"/);
  assert.match(read('src/screens/SheetPreview.tsx'), /say\('Count sheet ready\.'\)/);
});

test('review safety: a calculator and a record, never a camera scan, and no financial or tax advice', () => {
  const files = [...walk(`${ROOT}src`, ['.ts', '.tsx']), `${ROOT}App.tsx`, ...walk(`${ROOT}docs`, ['.html'])];
  for (const f of files) {
    const s = readFileSync(f, 'utf8');
    for (const w of [/\bscan(s|ning|ner)?\b(?! money)/i, /\brecogni[sz]/i, /(?<!no )financial advice/i, /\btax (filing|return)/i, /\baccounting software\b/i]) {
      const hit = s.match(w);
      assert.equal(hit, null, `${w} in ${f}`);
    }
  }
});

// ---------- onboarding and paywall ----------

test('onboarding: three value screens, "What are you counting?", then the trial, the reminder and the paywall', () => {
  const app = read('App.tsx');
  const order = ["step === 'intro' && <Intro onDone={() => setStep('what')}", "step === 'what' && (", "setStep('trial')", '<TrialSteps onDone={openOnboardingPaywall}', '<PaywallModal privacyUrl={PRIVACY_URL} onboarding />'];
  let at = -1;
  for (const o of order) {
    const i = app.indexOf(o, at + 1);
    assert.ok(i > at, `out of order or missing: ${o}`);
    at = i;
  }
  assert.match(app, /data\.saveTill\(\{ \.\.\.first, name: tillNameFor\(choice\) \}\)/, 'the answer only names the first till');
  const w = read('src/screens/Intro.tsx');
  assert.deepEqual(
    [...w.matchAll(/title: '([^']+)', line: '[^']+', show: '(count|diff|sheet)'/g)].map((m) => m[1]),
    ['Count a till in under a minute.', 'See at once if it is over or short.', 'Keep a record you can print.']
  );
  assert.match(w, /What are you counting\?/);
  assert.ok(!/TextInput|TextBox|keyboardType/.test(w), 'no name or email asked: nothing to type');
});

test('paywalls: close after 3 seconds on the first one, Continue never Subscribe, Restore, Terms and Privacy, prices from the store', () => {
  const pay = read('src/screens/Paywall.tsx');
  assert.match(pay, /ONBOARDING_CLOSE_DELAY_MS = 3000/);
  assert.match(pay, /label=\{purchasing \? 'One moment' : 'Continue'\}/);
  assert.match(pay, /Restore purchases/);
  assert.match(pay, /Terms of Use \(EULA\)/);
  assert.match(pay, /p\.product\.priceString/);
  assert.ok(!/\$\d/.test(pay.replace(/\$\{/g, '')), 'no price typed into the paywall');
  for (const r of ['save', 'sheet', 'csv', 'till', 'deposit', 'rows', 'currency', 'pro']) assert.match(pay, new RegExp(`\\n  ${r}: \\{ title: '`), r);
});

test('the in-app paywall opens where the brief says: the fourth save, the second count sheet, a second till, and Settings', () => {
  assert.match(read('App.tsx'), /if \(saveAsksPro\(isPro, data\.counts\.length, editing\)\) pro = await askPro\('save'\);/);
  assert.match(read('src/screens/SheetPreview.tsx'), /if \(!gate\.allowed && !\(await askPro\('sheet'\)\)\) return;/);
  assert.match(read('src/screens/Tills.tsx'), /canAddTill\(isPro, data\.tills\.length\) \|\| \(await askPro\('till'\)\)/);
  assert.match(read('src/screens/Settings.tsx'), /askPro\('pro'\)/);
  assert.match(read('src/screens/Settings.tsx'), /Restore purchases/);
});

test('rating ask: wired after a save on a later day, never mid-count', () => {
  assert.match(read('App.tsx'), /setCounting\(false\);[\s\S]*if \(savedOnLaterDay\(data\.installDay, isoDay\(Date\.now\(\)\)\)\) maybeRequestReview\('laterDaySave'\);/);
  assert.match(read('src/reviews.ts'), /launchState !== 'idle' \|\| counting\(\)/);
  assert.match(read('src/screens/Count.tsx'), /useEffect\(\(\) => setCounting\(!blank\), \[blank, setCounting\]\);/);
});

test('hidden test menu: seven taps on the version line in Settings, test builds only (TestFlight sandbox or development)', () => {
  const s = read('src/screens/Settings.tsx');
  assert.match(s, /testBuild && taps >= 7/);
  assert.match(s, /if \(!testBuild\) return;/);
  assert.match(read('src/state.tsx'), /const testBuild = __DEV__ \|\| sandbox;/);
});

// ---------- design ----------

test('design: the accent on the main button only, the flag on over or short only, lettering readable in both themes, 56 pt touch targets', () => {
  const theme = read('src/theme.ts');
  for (const f of [...walk(`${ROOT}src`, ['.tsx']), `${ROOT}App.tsx`]) {
    for (const l of readFileSync(f, 'utf8').split('\n')) {
      if (/theme\.accent\b/.test(l) && !/selectionColor/.test(l)) assert.ok(f.endsWith('ui/Kit.tsx') && /styles\.main/.test(l), `accent outside the main button: ${f}: ${l.trim()}`);
      if (/theme\.(flag|flagWash)\b/.test(l)) assert.ok(f.endsWith('ui/Cash.tsx'), `flag outside DiffLine: ${f}: ${l.trim()}`);
    }
  }
  const hex = (name, block) => block.match(new RegExp(`${name}: '(#[0-9A-F]{6})'`, 'i'))[1];
  const lum = (h) => {
    const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const contrast = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
  };
  for (const name of ['lightTheme', 'darkTheme']) {
    const block = theme.slice(theme.indexOf(`export const ${name}`)).split('};')[0];
    assert.ok(contrast(hex('accent', block), hex('onAccent', block)) >= 4.5, `${name}: button lettering`);
    assert.ok(contrast(hex('ink', block), hex('tile', block)) >= 12, `${name}: ink on a tile, for bad light`);
    assert.ok(contrast(hex('inkSoft', block), hex('tile', block)) >= 4.5, `${name}: soft ink`);
    assert.ok(contrast(hex('flag', block), hex('flagWash', block)) >= 4.5, `${name}: over or short on its wash`);
    assert.ok(contrast(hex('flag', block), hex('tile', block)) >= 4.5, `${name}: over or short on a tile`);
  }
  assert.match(theme, /export const TOUCH = 56;/);
  const count = read('src/screens/Count.tsx');
  assert.match(count, /step: \{ width: TOUCH, height: TOUCH/, 'plus and minus are 56 pt');
  assert.match(count, /qty: \{ minWidth: 64, height: TOUCH/, 'the number is 56 pt tall');
  assert.match(theme, /BarlowTab-SemiBold\.ttf/);
  assert.ok(!/IBMPlex|Plex/.test(theme), 'not the Estimate Maker type');
  for (const f of readdirSync(`${ROOT}assets/fonts`).filter((f) => f.endsWith('.ttf'))) assert.match(f, /^BarlowTab-/);
  assert.ok(existsSync(`${ROOT}assets/fonts/OFL-Barlow.txt`));
});

test('notes and coins are drawn as labeled tiles in the app style, not pictures of money', () => {
  const cash = read('src/ui/Cash.tsx');
  assert.match(cash, /export function CashTile/);
  assert.ok(!/<Image|require\(.*\.(png|jpg)/.test(cash));
  assert.ok(!existsSync(`${ROOT}assets/notes`) && !existsSync(`${ROOT}assets/coins`));
});

test('design renders: the screens the brief asks for, at 393x852 points', () => {
  const want = ['01-count-empty', '02-count-mid', '03-typing', '04-expected', '05-difference', '06-save', '07-history', '08-deposit', '09-sheet-preview', '10-paywall-onboarding', '11-paywall-in-app', '12-settings', '13-onboarding-1', '14-onboarding-2', '15-onboarding-3', '16-onboarding-4'];
  const dir = `${ROOT}docs/design/after`;
  for (const w of want) {
    for (const mode of ['light', 'dark']) {
      const f = `${dir}/${w}-${mode}.png`;
      assert.ok(existsSync(f), f);
      const b = readFileSync(f);
      const [width, height] = [b.readUInt32BE(16), b.readUInt32BE(20)];
      assert.equal(width / height, 393 / 852, `${w}-${mode}: ${width}x${height}`);
    }
  }
  assert.ok(existsSync(`${ROOT}docs/design/icon-options.png`));
  assert.match(read('store/icon.js'), /const CHOSEN = '2D-2';/, 'Brian picked 2D-2');
});

test('icon options 2: four green variants of Stack, 2A to 2D, kept for the record', () => {
  const f = `${ROOT}docs/design/icon-options-2.png`;
  assert.ok(existsSync(f));
  const b = readFileSync(f);
  assert.deepEqual([b.readUInt32BE(16), b.readUInt32BE(20)], [1580, 1060]);
  const icon = read('store/icon.js');
  for (const v of ['2A', '2B', '2C', '2D']) assert.match(icon, new RegExp(`'${v}': \\(\\) =>`), v);
  assert.match(icon, /const MODES = \{ options, options2, options3, check60 \};/);
  const art = icon.slice(icon.indexOf('const art2 = {'), icon.indexOf('async function png('));
  assert.ok(!/textPath|<text/.test(art), 'no letters or signs drawn on the variants');
  assert.match(icon, /const CHOSEN = '2D-2';/);
});

test('icon options 3: 2D refined in three ways, the bills in each fan alike, kept for the record', () => {
  const f = `${ROOT}docs/design/icon-options-3.png`;
  assert.ok(existsSync(f));
  const b = readFileSync(f);
  assert.deepEqual([b.readUInt32BE(16), b.readUInt32BE(20)], [1200, 1060]);
  const icon = read('store/icon.js');
  for (const v of ['2D-1', '2D-2', '2E']) assert.match(icon, new RegExp(`'${v}': \\(\\) => fan\\(`), v);
  // One face, one line color and one shared pivot for all three bills in a fan, opened in 18 degree steps.
  const fan = icon.slice(icon.indexOf('function fan('), icon.indexOf('const art3 = {'));
  assert.match(fan, /angles = \[-36, -18, 0\]/);
  assert.match(fan, /angles\.map\(\(a\) => bill\(\{[^}]*fill: face, line,[^}]*pivot: \[280, 690\] \}\)\)/);
  assert.ok(!/textPath|<text/.test(icon.slice(icon.indexOf('function fan('), icon.indexOf('async function png('))), 'nothing lettered on the variants');
  assert.match(icon, /const CHOSEN = '2D-2';/);
});

test('the app icon is 2D-2 everywhere: 1024 RGB with no alpha and square corners, drawn from store/icon.js', () => {
  const raw = readFileSync(`${ROOT}assets/icon.png`);
  assert.deepEqual([raw.readUInt32BE(16), raw.readUInt32BE(20)], [1024, 1024]);
  assert.equal(raw[24], 8, '8 bits per channel');
  assert.equal(raw[25], 2, 'color type 2: RGB, no alpha');
  const app = JSON.parse(read('app.json')).expo;
  assert.equal(app.icon, './assets/icon.png');
  assert.equal(app.android.adaptiveIcon.backgroundColor, '#0F4A2E', 'the adaptive icon sits on the same dark green');
  assert.match(read('store/icon.js'), /const CHOSEN_BG = '#0F4A2E';/);
  assert.match(read('store/icon.js'), /'2D-2': \(\) => fan\(\{ bg: '#0F4A2E'/);
  // Square corners: the corner pixel is the tile's own green, not cut away; and the mark is there (not one flat color).
  const { width, height, rgb } = decodeRgbPng(raw);
  assert.deepEqual([width, height], [1024, 1024]);
  assert.deepEqual([...rgb.slice(0, 3)], [0x0f, 0x4a, 0x2e], 'top left corner');
  const last = (width * height - 1) * 3;
  assert.deepEqual([...rgb.slice(last, last + 3)], [0x0f, 0x4a, 0x2e], 'bottom right corner');
  const colors = new Set();
  for (let i = 0; i < rgb.length; i += 3 * 101) colors.add(`${rgb[i]},${rgb[i + 1]},${rgb[i + 2]}`);
  assert.ok(colors.size > 20, `the bills and coin are drawn (${colors.size} colors sampled)`);
  const gold = [...colors].some((c) => {
    const [r, g, b] = c.split(',').map(Number);
    return r > 200 && g > 150 && b < 100;
  });
  assert.ok(gold, 'the gold coin is there');
  for (const f of ['index.html', 'privacy.html', 'support.html']) assert.match(read(`docs/${f}`), /src="icon-512\.png"[^>]*alt="Cash Counter app icon: three green bills fanned out and a gold coin, on dark green"/);
});

test('the first-run screens are called Intro; the banned word does not appear in the code', () => {
  assert.ok(existsSync(`${ROOT}src/screens/Intro.tsx`));
  assert.ok(!existsSync(`${ROOT}src/screens/${['Wel', 'come'].join('')}.tsx`));
  assert.match(read('src/screens/Intro.tsx'), /export default function Intro\(/);
  const word = new RegExp(['wel', 'come'].join(''), 'i');
  for (const f of [...walk(`${ROOT}src`, ['.ts', '.tsx']), `${ROOT}App.tsx`, `${ROOT}index.ts`, ...walk(`${ROOT}tests`, ['.mjs']), ...walk(`${ROOT}store`, ['.js', '.mjs', '.py'])]) assert.equal(readFileSync(f, 'utf8').match(word), null, f);
});
