import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface AddressSuggestion {
  id: string;
  name: string;
  full: string;
  lat: number;
  lng: number;
}

const NOMINATIM_UA = 'HaiSanHaNoiApp/1.0 (React Native; mobile app)';

const DIACRITIC_MAP: Record<string, string> = {
  'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a',
  'ă': 'a', 'ắ': 'a', 'ằ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
  'â': 'a', 'ấ': 'a', 'ầ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
  'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e',
  'ê': 'e', 'ế': 'e', 'ề': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
  'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
  'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o',
  'ô': 'o', 'ố': 'o', 'ồ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
  'ơ': 'o', 'ớ': 'o', 'ờ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
  'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u',
  'ư': 'u', 'ứ': 'u', 'ừ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
  'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
  'đ': 'd',
};

export function stripDiacritics(s: string): string {
  let out = '';
  for (const ch of s) {
    const lower = ch.toLowerCase();
    out += DIACRITIC_MAP[lower] !== undefined
      ? (ch === lower ? DIACRITIC_MAP[lower] : DIACRITIC_MAP[lower].toUpperCase())
      : ch;
  }
  return out;
}

export function normalizeVietnamese(s: string): string {
  return stripDiacritics(s).toLowerCase();
}

const TYPE_PREFIX = /^(Số|số)\s+|^(Phường|Xã|Thị trấn|Thị xã|Quận|Huyện|Thành phố|TP\.?)\s+/i;
const HOUSE_PAT = /^Số\s+\d+/i;
const PURE_NUM = /^\d+[a-zA-Z]?$/;
const WARD_PAT = /^(Phường|Xã|Thị trấn|Thị xã)/i;
const DISTRICT_PAT = /^(Quận|Huyện|Thành phố)/i;
const STREET_PAT = /(Phố|Đường|Ngõ|Ngách|Hẻm|Kiệt)/i;

function splitRoles(raw: string[]): {
  house: string;
  street: string;
  ward: string;
  district: string;
} {
  let house = '';
  let street = '';
  let ward = '';
  let district = '';
  const rest: string[] = [];
  for (const p of raw) {
    if (!house && (HOUSE_PAT.test(p) || PURE_NUM.test(p))) {
      house = p.replace(/^Số\s+/i, '');
    } else if (WARD_PAT.test(p)) {
      ward = p;
    } else if (DISTRICT_PAT.test(p)) {
      district = p;
    } else if (STREET_PAT.test(p)) {
      street = p;
    } else {
      rest.push(p);
    }
  }
  if (!street) {
    const first = rest.length ? rest[0] : raw[0] || '';
    if (first) street = first;
  }
  return { house, street, ward, district };
}

function buildVariants(address: string): string[] {
  const raw = address.split(',').map((p) => p.trim()).filter(Boolean);
  const city =
    raw.length > 0 && /Hà Nội|Ha Noi/i.test(raw[raw.length - 1]) ? raw.pop()! : '';
  const { house, street, ward, district } = splitRoles(raw);
  const out: string[] = [];
  const push = (arr: string[]) => {
    const s = arr.filter(Boolean).join(', ');
    if (s.length >= 3) out.push(city ? `${s}, ${city}` : s);
  };
  push([house, street, ward, district]);
  push([street, ward, district]);
  push([house, street, district]);
  push([street, district]);
  push([street]);
  const strip = (x: string) => x.replace(TYPE_PREFIX, '');
  push([house, strip(street), strip(ward), strip(district)]);
  push([strip(street), strip(district)]);
  push([strip(street)]);
  const flat = (x: string) => normalizeVietnamese(x);
  push([flat(house), flat(street), flat(district)]);
  push([flat(street), flat(district)]);
  push([flat(street)]);
  push(raw);
  return [...new Set(out)];
}

async function tryLocation(query: string): Promise<GeoPoint | null> {
  try {
    const results = await Location.geocodeAsync(query);
    if (results.length > 0) {
      return { lat: results[0].latitude, lng: results[0].longitude };
    }
  } catch {}
  return null;
}

async function tryNominatim(query: string): Promise<GeoPoint | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=vn&q=${encodeURIComponent(query)}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': NOMINATIM_UA,
        },
      },
    );
    if (!res.ok) return null;
    const data: any = await res.json();
    if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {}
  return null;
}

async function tryPhoton(query: string): Promise<GeoPoint | null> {
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`,
      { headers: { 'Accept': 'application/json' } },
    );
    if (!res.ok) return null;
    const data: any = await res.json();
    const feat = data?.features?.[0];
    const coords = feat?.geometry?.coordinates;
    if (coords && coords.length >= 2 && typeof coords[1] === 'number') {
      return { lat: coords[1], lng: coords[0] };
    }
  } catch {}
  return null;
}

export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  if (!address) return null;
  const hasCity = /hà nội|ha noi/i.test(address);
  const variants = buildVariants(address).map((v) =>
    hasCity ? v : `${v}, Hà Nội, Việt Nam`,
  );
  for (const query of variants) {
    const point =
      (await tryLocation(query)) ||
      (Platform.OS === 'android' ? await tryPhoton(query) : (await tryNominatim(query)) || (await tryPhoton(query)));
    if (point) return point;
  }
  return null;
}

export async function searchAddressSuggestions(
  query: string,
): Promise<AddressSuggestion[]> {
  if (!query || query.trim().length < 3) return [];
  const q = query.trim();

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=10&countrycodes=vn&viewbox=105.6,21.15,106.1,20.85&bounded=1&q=${encodeURIComponent(q)}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': NOMINATIM_UA,
        },
      },
    );
    if (!res.ok) return [];
    const data: any = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .filter((d: any) => d.lat && d.lon && d.display_name)
      .map((d: any) => {
        const display: string = d.display_name;
        const parts = display.split(',').map((p: string) => p.trim());
        return {
          id: String(d.place_id),
          name: parts.slice(0, 2).join(', '),
          full: display,
          lat: parseFloat(d.lat),
          lng: parseFloat(d.lon),
        };
      });
  } catch {
    return [];
  }
}
