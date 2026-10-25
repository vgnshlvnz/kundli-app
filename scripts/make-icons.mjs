// Generates the PWA icons (public/icons/*.png) with no dependencies.
// Usage: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const BG = [14, 12, 29];
const GOLD = [251, 191, 36];

function crc32(buf) {
  let c, crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

// Emblem from the hero SVG (64-unit grid): rings r=30, 20, plus a centre dot and 12 ticks.
// `scale` shrinks the emblem so maskable icons keep it inside the safe zone.
function render(size, scale) {
  const px = Buffer.alloc(size * size * 3);
  const unit = (size * scale) / 64;
  const off = (size - 64 * unit) / 2;
  const SS = 3;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hit = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const u = (x + (sx + 0.5) / SS - off) / unit - 32;
        const v = (y + (sy + 0.5) / SS - off) / unit - 32;
        const r = Math.hypot(u, v);
        const ang = (Math.atan2(v, u) * 180) / Math.PI;
        const onRing = [30, 20].some((R) => Math.abs(r - R) < 1.6) || r < 6;
        const onTick = r > 20 && r < 30 && [...Array(12)].some((_, i) => {
          const d = Math.abs(((ang - i * 30 + 540) % 360) - 180);
          return d > 180 - 3;
        });
        if (onRing || onTick) hit++;
      }
      const a = hit / (SS * SS);
      const i = (y * size + x) * 3;
      for (let c = 0; c < 3; c++) px[i + c] = Math.round(BG[c] + (GOLD[c] - BG[c]) * a);
    }
  }
  return px;
}

function png(size, scale) {
  const pixels = render(size, scale);
  const stride = size * 3 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    pixels.copy(raw, y * stride + 1, y * size * 3, (y + 1) * size * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', png(192, 0.92));
writeFileSync('public/icons/icon-512.png', png(512, 0.92));
writeFileSync('public/icons/icon-maskable-512.png', png(512, 0.62));
writeFileSync('public/icons/apple-touch-icon.png', png(180, 0.8));
