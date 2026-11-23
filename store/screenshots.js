const sharp = require('sharp');
const opentype = require('opentype.js');
const fs = require('fs');
const path = require('path');

// App Store screenshots, from the app's own screens.
//
// Sources (store/screens/): the real app screens rendered at 393x852 points
// and 4x (1572x3408) from a throwaway react-native-web copy of the app (the
// same one that makes docs/design/after), with the made-up front register
// sample; the paywall alone is rendered at exactly 3x (1179x2556). Nothing
// is upscaled: every screen is scaled down onto its canvas.
//
// `node store/screenshots.js` writes store/screenshots/:
//   67-1.png to 67-6.png at 1320x2868 (6.9 inch)
//   61-1.png to 61-6.png at 1206x2622 (6.3 inch)
//   paywall-review.png at 1179x2556, the in-app paywall alone, for the
//   purchase review screenshot
// All PNG, no alpha channel, sRGB.
//
// Each screenshot is the app's tray color, a caption at the top in Barlow
// Tab Bold (drawn as outlines, so it looks the same anywhere) with a short
// blue rule under it, and the screen under that with rounded corners, or a
// cut of it (`crop`, top and height as shares of the screen) shown larger so
// the first three read at the size search results show them. No device
// frames, gradients, emoji or pictures of money.

const ROOT = path.join(__dirname, '..');
const SRC = path.join(__dirname, 'screens');
const OUT = path.join(__dirname, 'screenshots');
const BOLD = opentype.loadSync(path.join(ROOT, 'assets/fonts/BarlowTab-Bold.ttf'));
const SEMI = opentype.loadSync(path.join(ROOT, 'assets/fonts/BarlowTab-SemiBold.ttf'));

const LIGHT = { bg: '#E9ECEF', ink: '#0C0E11', soft: '#434952', rule: '#1E4FD8', edge: 'rgba(12,14,17,0.16)' };
const DARK = { bg: '#0B0D10', ink: '#F3F5F8', soft: '#B4BAC3', rule: '#7EA3FF', edge: 'rgba(255,255,255,0.16)' };

// The plan in store/metadata.md, in order.
const SHOTS = [
  { file: 'count', caption: 'Count Money Fast' },
  { file: 'difference', caption: 'Over or Short at a Glance', crop: { top: 0.245, height: 0.755 } },
  { file: 'sheet', caption: 'Print a Count Sheet', crop: { top: 0.07, height: 0.695 } },
  { file: 'history', caption: 'Every Close in History' },
  { file: 'deposit', caption: 'Know What to Bank' },
  { file: 'count-dark', caption: 'Private and Offline', sub: 'No account. Nothing leaves your iPhone.', dark: true },
];

const SIZES = [
  { prefix: '67', width: 1320, height: 2868 },
  { prefix: '61', width: 1206, height: 2622 },
];

/** Splits a caption into one line, or two balanced lines, at the largest size up to `max` that fits `maxW`. */
function captionLines(text, maxW, max) {
  const w = (t, s) => BOLD.getAdvanceWidth(t, s);
  if (w(text, max) <= maxW) return { lines: [text], size: max };
  const words = text.split(' ');
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const wide = Math.max(w(a, max), w(b, max));
    if (!best || wide < best.wide) best = { lines: [a, b], wide };
  }
  const size = Math.min(max, Math.floor((max * maxW) / best.wide));
  return { lines: best.lines, size };
}

function centered(font, text, cx, y, size, fill) {
  const x = cx - font.getAdvanceWidth(text, size) / 2;
  return `<path d="${font.getPath(text, x, y, size).toPathData(2)}" fill="${fill}"/>`;
}

async function shot(s, size) {
  const { width: W, height: H } = size;
  const k = W / 1320;
  const t = s.dark ? DARK : LIGHT;
  // Caption: one or two lines, always laid out in the same band so the screens line up across the set.
  const cap = captionLines(s.caption, W * 0.86, Math.round(132 * k));
  const lineH = Math.round(cap.size * 1.08);
  const bandTop = Math.round(150 * k);
  const bandH = lineH * 2;
  const firstBase = bandTop + (bandH - lineH * cap.lines.length) / 2 + cap.size * 0.8;
  let svg = cap.lines.map((l, i) => centered(BOLD, l, W / 2, firstBase + i * lineH, cap.size, t.ink)).join('');
  let below = bandTop + bandH + Math.round(24 * k);
  if (s.sub) {
    const subSize = Math.round(50 * k);
    svg += centered(SEMI, s.sub, W / 2, below + subSize * 0.8, subSize, t.soft);
    below += Math.round(subSize * 1.3);
  }
  const ruleW = Math.round(120 * k);
  const ruleH = Math.round(12 * k);
  svg += `<rect x="${(W - ruleW) / 2}" y="${below + Math.round(10 * k)}" width="${ruleW}" height="${ruleH}" rx="${ruleH / 2}" fill="${t.rule}"/>`;
  const screenTop = below + Math.round(90 * k);
  const bottom = Math.round(110 * k);

  // The screen: the whole of it, or a cut, scaled down to fit what is left.
  const src = sharp(path.join(SRC, `${s.file}.png`));
  const meta = await src.metadata();
  const crop = s.crop ?? { top: 0, height: 1 };
  const cutTop = Math.round(meta.height * crop.top);
  const cutH = Math.round(meta.height * crop.height);
  const availH = H - screenTop - bottom;
  const maxW = Math.round(W * (s.crop ? 0.9 : 0.84));
  let sw = Math.min(maxW, Math.floor((availH * meta.width) / cutH));
  let sh = Math.round((cutH * sw) / meta.width);
  if (sw > meta.width) throw new Error(`${s.file} would be upscaled`);
  const radius = Math.round(64 * k);
  const screen = await sharp(path.join(SRC, `${s.file}.png`))
    .extract({ left: 0, top: cutTop, width: meta.width, height: cutH })
    .resize(sw, sh, { kernel: 'lanczos3' })
    .composite([{ input: Buffer.from(`<svg width="${sw}" height="${sh}"><rect width="${sw}" height="${sh}" rx="${radius}" fill="#fff"/></svg>`), blend: 'dest-in' }])
    .png()
    .toBuffer();
  const sx = Math.round((W - sw) / 2);
  // A cut that does not fill the height sits in the middle of the space under the caption.
  const sy = screenTop + Math.max(0, Math.round((availH - sh) / 2));
  const edge = `<rect x="${sx - 1}" y="${sy - 1}" width="${sw + 2}" height="${sh + 2}" rx="${radius + 1}" fill="none" stroke="${t.edge}" stroke-width="${Math.max(2, Math.round(3 * k))}"/>`;
  const base = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="${t.bg}"/>${svg}${edge}</svg>`;
  return sharp(Buffer.from(base))
    .composite([{ input: screen, left: sx, top: sy }])
    .flatten({ background: t.bg })
    .removeAlpha()
    .toColourspace('srgb')
    .withIccProfile('srgb')
    .png({ compressionLevel: 9 });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const size of SIZES) {
    for (const [i, s] of SHOTS.entries()) {
      const file = path.join(OUT, `${size.prefix}-${i + 1}.png`);
      await (await shot(s, size)).toFile(file);
      console.log('wrote', path.relative(ROOT, file));
    }
  }
  // The paywall alone, no caption, already exactly 1179x2556 (393x852 points at 3x).
  const pay = sharp(path.join(SRC, 'paywall.png'));
  const m = await pay.metadata();
  if (m.width !== 1179 || m.height !== 2556) throw new Error(`paywall source is ${m.width}x${m.height}`);
  await pay.flatten({ background: '#FFFFFF' }).removeAlpha().toColourspace('srgb').withIccProfile('srgb').png({ compressionLevel: 9 }).toFile(path.join(OUT, 'paywall-review.png'));
  console.log('wrote store/screenshots/paywall-review.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
