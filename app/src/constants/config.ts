const PRODUCTION_API_URL = 'https://apiapp.haisanbay.com/api';

function normalize(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

const configured = process.env.EXPO_PUBLIC_API_URL;

export const API_BASE_URL = configured
  ? normalize(configured)
  : PRODUCTION_API_URL;

export const API_TIMEOUT = 15000;
