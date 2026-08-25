#!/usr/bin/env node
/**
 * Benchmark tải ảnh/video từ API (mặc định production).
 *
 *   node scripts/bench-media.mjs
 *   API_BASE=https://apiapp.haisanbay.com/api node scripts/bench-media.mjs
 *
 * Đo: thời gian API danh sách, TTFB + tổng thời gian + dung lượng từng URL.
 * Video chỉ đọc tối đa 2MB đầu (đủ để thấy TTFB, không tải cả file 50MB).
 */

const API_BASE = (process.env.API_BASE || 'https://apiapp.haisanbay.com/api').replace(/\/+$/, '');
const VIDEO_PROBE_BYTES = 2 * 1024 * 1024;
const CONCURRENCY = 6;

function fmtMs(ms) {
  return `${Math.round(ms)}ms`;
}
function fmtBytes(n) {
  if (n == null || Number.isNaN(n)) return '—';
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(2)}MB`;
}

async function fetchJson(path) {
  const t0 = performance.now();
  const res = await fetch(`${API_BASE}${path}`);
  const json = await res.json();
  return { status: res.status, ms: performance.now() - t0, json };
}

async function probe(url, { limitBytes } = {}) {
  const t0 = performance.now();
  let ttfb = null;
  try {
    const res = await fetch(url, {
      headers: limitBytes ? { Range: `bytes=0-${limitBytes - 1}` } : undefined,
    });
    ttfb = performance.now() - t0;
    const lenHeader = res.headers.get('content-length');
    const type = res.headers.get('content-type') || '';
    const buf = Buffer.from(await res.arrayBuffer());
    const total = performance.now() - t0;
    const declared = lenHeader ? Number(lenHeader) : buf.length;
    return {
      url,
      ok: res.status >= 200 && res.status < 400,
      status: res.status,
      ttfb,
      total,
      bytes: buf.length,
      declared,
      type,
      error: null,
    };
  } catch (err) {
    return {
      url,
      ok: false,
      status: 0,
      ttfb,
      total: performance.now() - t0,
      bytes: 0,
      declared: 0,
      type: '',
      error: err.message,
    };
  }
}

async function pool(items, limit, fn) {
  const out = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

function summarize(label, rows) {
  const ok = rows.filter((r) => r.ok);
  const fail = rows.filter((r) => !r.ok);
  const times = ok.map((r) => r.total).sort((a, b) => a - b);
  const ttfbs = ok.map((r) => r.ttfb).filter((n) => n != null).sort((a, b) => a - b);
  const bytes = ok.reduce((s, r) => s + (r.declared || r.bytes), 0);
  const p = (arr, q) => (arr.length ? arr[Math.min(arr.length - 1, Math.floor(arr.length * q))] : 0);
  console.log(`\n=== ${label} ===`);
  console.log(`  OK ${ok.length}/${rows.length}  |  lỗi ${fail.length}`);
  if (ok.length) {
    console.log(`  TTFB   p50=${fmtMs(p(ttfbs, 0.5))}  p95=${fmtMs(p(ttfbs, 0.95))}  max=${fmtMs(ttfbs[ttfbs.length - 1] || 0)}`);
    console.log(`  Tổng   p50=${fmtMs(p(times, 0.5))}  p95=${fmtMs(p(times, 0.95))}  max=${fmtMs(times[times.length - 1])}`);
    console.log(`  Dung lượng (khai báo/tải): ${fmtBytes(bytes)}`);
  }
  if (fail.length) {
    fail.slice(0, 8).forEach((r) => {
      console.log(`  FAIL ${r.status} ${r.error || ''} ${r.url.slice(0, 90)}`);
    });
  }
  const slow = [...ok].sort((a, b) => b.total - a.total).slice(0, 5);
  if (slow.length) {
    console.log('  Chậm nhất:');
    slow.forEach((r) => {
      console.log(`    ${fmtMs(r.total)}  ${fmtBytes(r.declared || r.bytes)}  ${r.url.slice(0, 88)}`);
    });
  }
  return { ok: ok.length, fail: fail.length, p50: p(times, 0.5), p95: p(times, 0.95), bytes };
}

function mediaOrigin(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path) || /^data:/i.test(path)) return path;
  const origin = API_BASE.replace(/\/api\/?$/, '');
  return origin + path;
}

async function main() {
  console.log(`API: ${API_BASE}`);
  console.log(`Concurrency: ${CONCURRENCY}\n`);

  const productsCall = await fetchJson('/products?limit=100');
  const videosCall = await fetchJson('/products/videos?limit=50');
  console.log(`GET /products        ${productsCall.status}  ${fmtMs(productsCall.ms)}`);
  console.log(`GET /products/videos ${videosCall.status}  ${fmtMs(videosCall.ms)}`);

  const products = productsCall.json?.data || [];
  const videos = videosCall.json?.data || [];

  const imageUrls = [];
  for (const p of products) {
    const first = (p.images || [])[0];
    const u = mediaOrigin(first);
    if (u && !u.startsWith('data:')) imageUrls.push(u);
  }
  const uniqueImages = [...new Set(imageUrls)];

  const videoUrls = [...new Set(videos.map((v) => mediaOrigin(v.url)).filter(Boolean))];
  const thumbUrls = [...new Set(videos.map((v) => mediaOrigin(v.thumbnail_url)).filter(Boolean))];

  console.log(`Sản phẩm: ${products.length}  |  ảnh unique: ${uniqueImages.length}  |  video: ${videoUrls.length}  |  thumb: ${thumbUrls.length}`);
  console.log(`Sản phẩm không ảnh: ${products.filter((p) => !(p.images || []).length).length}`);
  console.log(`Video không thumbnail: ${videos.filter((v) => !v.thumbnail_url).length}`);

  const tImg = performance.now();
  const imageRows = await pool(uniqueImages, CONCURRENCY, (url) => probe(url));
  const imgMs = performance.now() - tImg;

  const tThumb = performance.now();
  const thumbRows = await pool(thumbUrls, CONCURRENCY, (url) => probe(url));
  const thumbMs = performance.now() - tThumb;

  const tVid = performance.now();
  const videoRows = await pool(videoUrls, Math.min(3, CONCURRENCY), (url) =>
    probe(url, { limitBytes: VIDEO_PROBE_BYTES }),
  );
  const vidMs = performance.now() - tVid;

  const sImg = summarize('Ảnh sản phẩm (toàn file)', imageRows);
  console.log(`  Wall-clock tải hết ảnh: ${fmtMs(imgMs)}`);
  const sThumb = summarize('Thumbnail video (toàn file)', thumbRows);
  console.log(`  Wall-clock tải hết thumb: ${fmtMs(thumbMs)}`);
  const sVid = summarize(`Video (chỉ ${fmtBytes(VIDEO_PROBE_BYTES)} đầu file)`, videoRows);
  console.log(`  Wall-clock probe video: ${fmtMs(vidMs)}`);

  const homeImages = uniqueImages.slice(0, 8);
  const homeThumbs = thumbUrls.slice(0, 2);
  const tHome = performance.now();
  await Promise.all([
    ...homeImages.map((u) => probe(u)),
    ...homeThumbs.map((u) => probe(u)),
    videoUrls[0] ? probe(videoUrls[0], { limitBytes: VIDEO_PROBE_BYTES }) : null,
  ].filter(Boolean));
  const homeMs = performance.now() - tHome;

  console.log('\n=== Mô phỏng Trang chủ ===');
  console.log(`  8 ảnh sản phẩm + 2 thumb + 1 video (2MB đầu, giống autoplay cũ)`);
  console.log(`  Wall-clock: ${fmtMs(homeMs)}`);
  console.log('\nGợi ý đọc kết quả:');
  console.log('  - Ảnh p95 > 1.5s hoặc > 500KB: nên nén/resize phía server hoặc dùng CDN transform.');
  console.log('  - Video TTFB cao: đừng autoplay trên Home, chỉ hiện thumbnail.');
  console.log('  - Lặp lại script sau khi đổi (expo-image cache chỉ đo được trên máy, không đo bằng script này).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
