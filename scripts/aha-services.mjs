#!/usr/bin/env node
/**
 * So giá các dịch vụ AhaMove cho một tuyến giao hàng.
 *
 *   node scripts/aha-services.mjs
 *   TO_LAT=21.0430646 TO_LNG=105.8218397 WEIGHT=1 node scripts/aha-services.mjs
 *   ENV_FILE=/opt/hshn/backend/.env node scripts/aha-services.mjs
 *
 * Đọc credential từ backend/.env (không in ra, không ghi ra file). Mặc định
 * là môi trường trong .env đó — chạy trên máy dev sẽ ra giá STAGING, muốn giá
 * thật phải chạy trên VPS nơi .env trỏ partner-api.ahamove.com.
 *
 * Dùng để kiểm tra: dịch vụ nào khả dụng, giá có khác nhau thật không, và
 * service_id nào nên đặt cho từng lựa chọn giao hàng trên app.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = process.env.ENV_FILE || resolve(ROOT, 'backend/.env');

// Dùng khi không lấy được danh mục dịch vụ từ AhaMove. AhaMove trả về
// service_id đầy đủ (vd HAN-BIKE) kèm phí, hoặc error nếu không hỗ trợ tuyến.
const FALLBACK_SERVICES = ['BIKE', 'ECO', 'SAMEDAY'];

function readEnv(file) {
  let raw;
  try {
    raw = readFileSync(file, 'utf8');
  } catch {
    throw new Error(`Không đọc được ${file}`);
  }
  const env = {};
  for (const line of raw.split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m) env[m[1]] = m[2];
  }
  return env;
}

function fmtVnd(n) {
  return n == null ? '—' : `${Number(n).toLocaleString('vi-VN')}đ`;
}

async function get(url, token) {
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text || '{}');
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
}

// AhaMove không tài liệu hoá rõ endpoint liệt kê dịch vụ theo version, nên thử
// lần lượt các đường dẫn đã từng tồn tại và lấy cái nào trả về danh sách.
async function listServices(apiUrl, token, cityId) {
  const candidates = [
    `/v3/services?city_id=${cityId}`,
    `/v3/order/service_types?city_id=${cityId}`,
    `/v2/order/service_types?city_id=${cityId}`,
    `/v1/order/service_types?city_id=${cityId}`,
  ];
  for (const path of candidates) {
    const { status, json } = await get(`${apiUrl}${path}`, token);
    const rows = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : null;
    if (status === 200 && rows && rows.length > 0) return { path, rows };
  }
  return null;
}

async function post(url, body, token) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text || '{}');
  } catch {
    throw new Error(`Phản hồi không phải JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  return { status: res.status, json };
}

async function main() {
  const env = readEnv(ENV_FILE);
  const apiUrl = (env.AHAMOVE_API_URL || 'https://partner-api.ahamove.com').replace(/\/+$/, '');
  const apiKey = env.AHAMOVE_TOKEN;
  const mobile = env.AHAMOVE_MOBILE;

  if (!apiKey) throw new Error('AHAMOVE_TOKEN trống trong .env');
  if (!mobile) throw new Error('AHAMOVE_MOBILE trống trong .env');

  const fromLat = Number(env.AHAMOVE_SHOP_LAT || 21.0324);
  const fromLng = Number(env.AHAMOVE_SHOP_LNG || 105.7975);
  const shopName = env.AHAMOVE_SHOP_NAME || 'Shop';
  const shopAddress = env.AHAMOVE_SHOP_ADDRESS || 'Hà Nội';
  const shopPhone = String(env.AHAMOVE_SHOP_PHONE || mobile).replace(/^0/, '84').replace(/[^0-9]/g, '');

  const toLat = Number(process.env.TO_LAT || 21.0430646);
  const toLng = Number(process.env.TO_LNG || 105.8218397);
  const weight = Number(process.env.WEIGHT || 1);
  const goods = Number(process.env.GOODS || 0);

  const isStaging = /apistg/.test(apiUrl);
  console.log(`Môi trường : ${apiUrl}${isStaging ? '  ⚠️  STAGING — giá không phải giá thật' : '  (production)'}`);
  console.log(`Lấy hàng   : ${fromLat}, ${fromLng}`);
  console.log(`Giao tới   : ${toLat}, ${toLng}`);
  console.log(`Khối lượng : ${weight}kg · giá trị hàng khai báo ${fmtVnd(goods)}\n`);

  const auth = await post(`${apiUrl}/v3/accounts/token`, { api_key: apiKey, mobile }, null);
  const token = auth.json?.token;
  if (!token) {
    const why = auth.json?.description || auth.json?.internal || auth.json?.title || JSON.stringify(auth.json);
    throw new Error(`Lấy token thất bại (${auth.status}): ${why}`);
  }

  const cityId = process.env.CITY_ID || 'HAN';
  const catalog = await listServices(apiUrl, token, cityId);
  const names = new Map();
  let services = FALLBACK_SERVICES;

  if (catalog) {
    console.log(`Dịch vụ AhaMove công bố (${catalog.path}):`);
    const ids = [];
    for (const s of catalog.rows) {
      const id = String(s._id || s.id || s.service_id || '').trim();
      if (!id) continue;
      const name = s.name || s.title || s.description || '';
      names.set(id, name);
      ids.push(id);
      console.log(`  ${id.padEnd(26)}${name}`);
    }
    if (ids.length > 0) services = ids;
    console.log();
  } else {
    console.log('Không lấy được danh mục dịch vụ từ AhaMove — dò theo danh sách mặc định.\n');
  }

  if (process.env.SERVICES) services = process.env.SERVICES.split(',').map((s) => s.trim());

  const estimate = await post(
    `${apiUrl}/v3/orders/estimates`,
    {
      order_time: 0,
      path: [
        { lat: fromLat, lng: fromLng, address: shopAddress, name: shopName, mobile: shopPhone },
        { lat: toLat, lng: toLng, address: 'Địa chỉ giao hàng', name: 'Khách', mobile: '84981230001' },
      ],
      // Endpoint estimate tự ghép tiền tố thành phố, nên phải gửi phần đuôi:
      // "HAN-ECO" trong danh mục → gửi "ECO", nếu không thành "HAN-HAN-ECO".
      group_services: services.map((id) => ({
        _id: id.replace(new RegExp(`^${cityId}-`, 'i'), ''),
        group_requests: [],
      })),
      payment_method: 'CASH',
      items: [{ _id: 'GOODS', num: 1, name: 'Hàng hóa', price: goods }],
      package_detail: [{ weight: Math.max(0.5, weight) }],
    },
    token,
  );

  const rows = Array.isArray(estimate.json) ? estimate.json : [];
  if (rows.length === 0) {
    console.log('AhaMove không trả về dịch vụ nào:');
    console.log(JSON.stringify(estimate.json, null, 2).slice(0, 1500));
    return;
  }

  const pad = (s, n) => String(s).padEnd(n);
  console.log(`${pad('service_id', 26)}${pad('tên', 24)}${pad('phí', 14)}ghi chú`);
  console.log('-'.repeat(88));

  const fees = [];
  for (const r of rows) {
    const d = r.data || {};
    const fee = d.total_fee ?? d.total_price ?? null;
    const id = r.service_id || '?';
    const note = r.error
      ? `LỖI: ${r.error?.description || r.error?.code || JSON.stringify(r.error)}`
      : !fee
        ? 'không trả về phí → không dùng được'
        : '';
    console.log(`${pad(id, 26)}${pad(names.get(id) || '', 24)}${pad(fmtVnd(fee), 14)}${note}`);
    if (fee && !r.error) fees.push({ id, fee: Number(fee) });
  }

  console.log();
  if (fees.length < 2) {
    console.log('Chỉ có 1 dịch vụ khả dụng → không thể phân biệt giao nhanh / tiết kiệm.');
    return;
  }
  const distinct = [...new Set(fees.map((f) => f.fee))];
  if (distinct.length === 1) {
    console.log(`Tất cả ${fees.length} dịch vụ cùng giá ${fmtVnd(distinct[0])} → AhaMove không phân giá cho tuyến này.`);
  } else {
    const sorted = [...fees].sort((a, b) => a.fee - b.fee);
    console.log(`Rẻ nhất : ${sorted[0].id} — ${fmtVnd(sorted[0].fee)}`);
    console.log(`Đắt nhất: ${sorted[sorted.length - 1].id} — ${fmtVnd(sorted[sorted.length - 1].fee)}`);
  }
}

main().catch((err) => {
  console.error(`\n✗ ${err.message}`);
  process.exit(1);
});
