import { API_BASE_URL } from '../constants/config';

const MEDIA_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

/**
 * Uploaded filenames can contain spaces and NFD diacritics, which ExoPlayer and
 * Image reject as invalid URIs unless percent-encoded.
 */
export function mediaUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^data:/i.test(path)) return path;
  const absolute = /^https?:\/\//i.test(path) ? path : MEDIA_ORIGIN + path;
  try {
    return encodeURI(decodeURI(absolute));
  } catch {
    return absolute;
  }
}

export { MEDIA_ORIGIN };
