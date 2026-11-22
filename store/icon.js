const sharp = require('sharp');
const opentype = require('opentype.js');
const path = require('path');
const fs = require('fs');

// Cash Counter's icon.
// `node icon.js options` writes docs/design/icon-options.png: three concepts
// in the app's own palette (tray steel, ink, deposit-slip blue), each large
// and at 60 px on a light and a dark wallpaper. Brian picks one; none is
// chosen here.
//   tray    - a cash drawer insert seen from above: four note slots and five coin cups
//   stack   - a stack of coins beside a framed note, on deposit-slip blue
//   counter - a framed note with a large plus under it, the count's own button, on ink
// No currency sign (the app counts six currencies), no real banknote or
// coin artwork, no camera or scanner.
// `node icon.js options2` writes docs/design/icon-options-2.png: four green
// variants of Stack, after Brian liked Stack best (Nov 22) and asked for it
// to read more like money. Three of the top six icons for "cash counter"
// are green tiles with a dollar sign, so these are green but carry a bill
// and coins instead of a sign:
//   2A - rich banknote green tile, the bill and the coin stack in white (Stack recolored)
//   2B - deep dark green tile, a pale mint bill and a gold coin stack
//   2C - off-white tile, a green bill and a gold coin stack
//   2D - green tile, a fan of three green and white bills and one gold coin, bold and simple for 60 px
// Same rules: no currency sign, no letters, no portraits or real banknote
// or coin artwork, no camera.
// `node icon.js` writes the shipped files (assets/icon.png, the splash
// icons, the Android foreground, the favicon and the website icons) from
// CHOSEN. Until Brian picks, CHOSEN is null and they are a plain stand-in
// tile with no mark, so nothing looks decided.
const CHOSEN = null;

const ROOT = path.join(__dirname, '..');
const BOLD = opentype.loadSync(`${ROOT}/assets/fonts/BarlowTab-Bold.ttf`);
const INK = '#0C0E11';
const BLUE = '#1E4FD8';
const STEEL = '#E9ECEF';
const WHITE = '#FFFFFF';
const RULE = '#C9D0D9';
const AMBER = '#F08A3C';

function textPath(font, s, x, y, size, fill) {
  return `<path d="${font.getPath(s, x, y, size).toPathData(2)}" fill="${fill}"/>`;
}

const art = {
  tray: () => `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
    <rect width="1024" height="1024" fill="${INK}"/>
    <rect x="132" y="196" width="760" height="632" rx="56" fill="#1F242B"/>
    ${[0, 1, 2, 3].map((i) => `<rect x="${172 + i * 176}" y="236" width="152" height="300" rx="22" fill="${WHITE}"/>
    <rect x="${196 + i * 176}" y="380" width="104" height="18" rx="9" fill="${i === 0 ? BLUE : RULE}"/>`).join('')}
    ${[0, 1, 2, 3, 4].map((i) => `<circle cx="${236 + i * 138}" cy="680" r="${58 - i * 3}" fill="${WHITE}"/><circle cx="${236 + i * 138}" cy="680" r="${38 - i * 3}" fill="none" stroke="${RULE}" stroke-width="8"/>`).join('')}
  </svg>`,
  stack: () => `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
    <rect width="1024" height="1024" fill="${BLUE}"/>
    <g transform="rotate(-8 400 470)">
      <rect x="150" y="300" width="470" height="290" rx="26" fill="${WHITE}"/>
      <rect x="182" y="332" width="406" height="226" rx="14" fill="none" stroke="${RULE}" stroke-width="10"/>
      <circle cx="385" cy="445" r="62" fill="none" stroke="${BLUE}" stroke-width="16"/>
    </g>
    ${[0, 1, 2, 3].map((i) => {
      const y = 760 - i * 70;
      return `<path d="M520 ${y} v-46 a170 58 0 0 1 340 0 v46 a170 58 0 0 1 -340 0z" fill="${WHITE}" stroke="${BLUE}" stroke-width="10"/><ellipse cx="690" cy="${y - 46}" rx="170" ry="58" fill="${WHITE}" stroke="${BLUE}" stroke-width="10"/>`;
    }).join('')}
  </svg>`,
  counter: () => `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
    <rect width="1024" height="1024" fill="${INK}"/>
    <rect x="182" y="170" width="660" height="380" rx="34" fill="${WHITE}"/>
    <rect x="222" y="210" width="580" height="300" rx="18" fill="none" stroke="${RULE}" stroke-width="12"/>
    <rect x="300" y="330" width="424" height="60" rx="30" fill="${BLUE}"/>
    <rect x="272" y="640" width="200" height="200" rx="44" fill="#262B32"/>
    <rect x="336" y="728" width="72" height="24" rx="12" fill="${WHITE}"/>
    <rect x="552" y="640" width="200" height="200" rx="44" fill="${AMBER}"/>
    <rect x="616" y="728" width="72" height="24" rx="12" fill="${INK}"/>
    <rect x="640" y="704" width="24" height="72" rx="12" fill="${INK}"/>
  </svg>`,
};

const LABELS = { tray: '1. Tray', stack: '2. Stack', counter: '3. Counter' };

// ---------- Stack, in green (options2) ----------

const GREEN = '#1F7A4D';
const DEEP = '#0E3B28';
const MINT = '#D3F0DC';
const PAPER = '#F6F3EA';
const GOLD = '#E6B53C';
const GOLD_EDGE = '#9C6F0E';

/** A bill in the app's own style: a framed oblong with a ring in the middle and four corner marks. No sign, no letters, no portrait. */
function bill({ x, y, w, h, angle, fill, line, weight = 10 }) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const m = Math.round(h * 0.11);
  const corner = Math.round(h * 0.13);
  const marks = [
    [x + m * 2, y + m * 2],
    [x + w - m * 2 - corner, y + m * 2],
    [x + m * 2, y + h - m * 2 - corner],
    [x + w - m * 2 - corner, y + h - m * 2 - corner],
  ]
    .map(([mx, my]) => `<rect x="${mx}" y="${my}" width="${corner}" height="${corner}" rx="${corner / 3}" fill="${line}"/>`)
    .join('');
  return `<g transform="rotate(${angle} ${cx} ${cy})">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h * 0.09}" fill="${fill}"/>
    <rect x="${x + m}" y="${y + m}" width="${w - 2 * m}" height="${h - 2 * m}" rx="${h * 0.05}" fill="none" stroke="${line}" stroke-width="${weight}"/>
    <circle cx="${cx}" cy="${cy}" r="${h * 0.22}" fill="none" stroke="${line}" stroke-width="${weight * 1.5}"/>
    ${marks}
  </g>`;
}

/** A stack of coins seen from the side and a little above: rims, then the top face with an inner ring. */
function coins({ cx, bottom, rx, ry, n, step, fill, edge, weight = 10 }) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const y = bottom - i * step;
    out += `<path d="M${cx - rx} ${y - step} v${step} a${rx} ${ry} 0 0 0 ${rx * 2} 0 v-${step} z" fill="${fill}" stroke="${edge}" stroke-width="${weight}" stroke-linejoin="round"/>`;
  }
  const top = bottom - n * step;
  out += `<ellipse cx="${cx}" cy="${top}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${edge}" stroke-width="${weight}"/>`;
  out += `<ellipse cx="${cx}" cy="${top}" rx="${rx * 0.66}" ry="${ry * 0.66}" fill="none" stroke="${edge}" stroke-width="${weight * 0.8}"/>`;
  return out;
}

const tile = (bg, body) => `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg"><rect width="1024" height="1024" fill="${bg}"/>${body}</svg>`;

const art2 = {
  '2A': () => tile(GREEN, bill({ x: 150, y: 300, w: 470, h: 290, angle: -8, fill: WHITE, line: GREEN, weight: 11 }) + coins({ cx: 690, bottom: 780, rx: 170, ry: 58, n: 4, step: 70, fill: WHITE, edge: GREEN })),
  '2B': () => tile(DEEP, bill({ x: 150, y: 300, w: 470, h: 290, angle: -8, fill: MINT, line: '#2F7A50', weight: 11 }) + coins({ cx: 690, bottom: 780, rx: 170, ry: 58, n: 4, step: 70, fill: GOLD, edge: GOLD_EDGE })),
  '2C': () => tile(PAPER, bill({ x: 150, y: 300, w: 470, h: 290, angle: -8, fill: GREEN, line: MINT, weight: 11 }) + coins({ cx: 690, bottom: 780, rx: 170, ry: 58, n: 4, step: 70, fill: GOLD, edge: GOLD_EDGE })),
  '2D': () =>
    tile(
      '#1E8A4F',
      '<g transform="translate(-36 -44)">' +
      bill({ x: 150, y: 250, w: 560, h: 330, angle: -16, fill: '#0F5A33', line: MINT, weight: 16 }) +
        bill({ x: 170, y: 300, w: 560, h: 330, angle: -5, fill: WHITE, line: '#1E8A4F', weight: 16 }) +
        bill({ x: 190, y: 350, w: 560, h: 330, angle: 6, fill: MINT, line: '#0F5A33', weight: 16 }) +
        `<circle cx="720" cy="740" r="170" fill="${GOLD}" stroke="${GOLD_EDGE}" stroke-width="22"/><circle cx="720" cy="740" r="112" fill="none" stroke="${GOLD_EDGE}" stroke-width="18"/></g>`
    ),
};

async function png(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

async function options() {
  const W = 1500;
  const H = 1060;
  const names = Object.keys(art);
  const layers = [];
  for (const [i, n] of names.entries()) {
    const x = 60 + i * 480;
    const big = await sharp(await png(art[n](), 380)).composite([{ input: Buffer.from(`<svg width="380" height="380"><rect width="380" height="380" rx="86" fill="#fff"/></svg>`), blend: 'dest-in' }]).png().toBuffer();
    layers.push({ input: big, left: x, top: 120 });
    const small = await sharp(await png(art[n](), 60)).composite([{ input: Buffer.from(`<svg width="60" height="60"><rect width="60" height="60" rx="13.5" fill="#fff"/></svg>`), blend: 'dest-in' }]).png().toBuffer();
    layers.push({ input: small, left: x + 60, top: 660 });
    layers.push({ input: small, left: x + 250, top: 660 });
  }
  const labels = names.map((n, i) => textPath(BOLD, LABELS[n], 60 + i * 480, 80, 44, INK)).join('');
  const base = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="${STEEL}"/>
    ${labels}
    ${names.map((_, i) => `<rect x="${60 + i * 480}" y="600" width="180" height="180" rx="20" fill="#DCE6F2"/><rect x="${250 + i * 480}" y="600" width="180" height="180" rx="20" fill="#11151B"/>`).join('')}
    ${textPath(BOLD, 'At 60 px on a light and a dark wallpaper. None is picked: Brian picks.', 60, 860, 34, '#434952')}
    ${textPath(BOLD, 'No currency sign, no real banknote or coin artwork, no camera.', 60, 910, 34, '#434952')}
  </svg>`;
  await sharp(Buffer.from(base)).composite(layers).png().toFile(path.join(ROOT, 'docs/design/icon-options.png'));
  console.log('wrote docs/design/icon-options.png');
}

async function options2() {
  const names = Object.keys(art2);
  const W = 1580;
  const H = 1060;
  const col = 380;
  const big = 320;
  const layers = [];
  for (const [i, n] of names.entries()) {
    const x = 50 + i * col;
    const b = await sharp(await png(art2[n](), big)).composite([{ input: Buffer.from(`<svg width="${big}" height="${big}"><rect width="${big}" height="${big}" rx="${big * 0.225}" fill="#fff"/></svg>`), blend: 'dest-in' }]).png().toBuffer();
    layers.push({ input: b, left: x, top: 130 });
    const small = await sharp(await png(art2[n](), 60)).composite([{ input: Buffer.from(`<svg width="60" height="60"><rect width="60" height="60" rx="13.5" fill="#fff"/></svg>`), blend: 'dest-in' }]).png().toBuffer();
    layers.push({ input: small, left: x + 45, top: 640 });
    layers.push({ input: small, left: x + 210, top: 640 });
  }
  const sub = { '2A': 'Green, white', '2B': 'Deep green, mint, gold', '2C': 'Off-white, green, gold', '2D': 'Fan of bills, gold coin' };
  const base = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="${STEEL}"/>
    ${names.map((n, i) => textPath(BOLD, n, 50 + i * col, 80, 50, INK) + textPath(BOLD, sub[n], 50 + i * col, 112, 24, '#434952')).join('')}
    ${names.map((_, i) => `<rect x="${50 + i * col}" y="585" width="150" height="170" rx="20" fill="#DCE6F2"/><rect x="${215 + i * col}" y="585" width="150" height="170" rx="20" fill="#11151B"/>`).join('')}
    ${textPath(BOLD, 'Stack in green, four ways, at 60 px on a light and a dark wallpaper. None is picked: Brian picks.', 50, 840, 30, '#434952')}
    ${textPath(BOLD, 'Green like money, but a bill and coins instead of a currency sign, so it stands apart', 50, 885, 30, '#434952')}
    ${textPath(BOLD, 'from the green tiles with a sign. No letters, no portraits, no real banknote or coin artwork.', 50, 930, 30, '#434952')}
  </svg>`;
  await sharp(Buffer.from(base)).composite(layers).png().toFile(path.join(ROOT, 'docs/design/icon-options-2.png'));
  console.log('wrote docs/design/icon-options-2.png');
}

/** The stand-in until Brian picks: a plain deposit-slip blue tile, no mark. */
const standIn = () => `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg"><rect width="1024" height="1024" fill="${BLUE}"/></svg>`;

async function shipped() {
  const svg = CHOSEN ? art[CHOSEN]() : standIn();
  const flat = (size) => sharp(Buffer.from(svg)).resize(size, size).flatten({ background: BLUE }).removeAlpha();
  await flat(1024).png().toFile(path.join(ROOT, 'assets/icon.png'));
  await flat(1024).png().toFile(path.join(ROOT, 'assets/android-icon-foreground.png'));
  await flat(48).png().toFile(path.join(ROOT, 'assets/favicon.png'));
  const round = async (size) =>
    sharp(await png(svg, size))
      .composite([{ input: Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * 0.225}" fill="#fff"/></svg>`), blend: 'dest-in' }])
      .png();
  await (await round(512)).toFile(path.join(ROOT, 'assets/splash-icon.png'));
  await (await round(512)).toFile(path.join(ROOT, 'assets/splash-icon-dark.png'));
  await (await round(512)).toFile(path.join(ROOT, 'docs/icon-512.png'));
  await flat(180).png().toFile(path.join(ROOT, 'docs/apple-touch-icon.png'));
  console.log(`wrote assets and website icons from ${CHOSEN ?? 'the stand-in tile'}`);
}

(process.argv[2] === 'options' ? options() : process.argv[2] === 'options2' ? options2() : shipped()).catch((e) => {
  console.error(e);
  process.exit(1);
});

module.exports = { CHOSEN, VARIANTS: Object.keys(art2) };
