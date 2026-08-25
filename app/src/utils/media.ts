import { API_BASE_URL } from '../constants/config';

const MEDIA_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

/**
 * Uploaded filenames can contain spaces and NFD diacritics, which ExoPlayer and
 * Image reject as invalid URIs unless percent-encoded.
 */
export function mediaUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return encodeURI(decodeURI(path));
  return encodeURI(decodeURI(MEDIA_ORIGIN + path));
}

export { MEDIA_ORIGIN };
