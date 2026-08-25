/** Free raster tiles (no API key). Carto Voyager is OSM-based and works in Android WebView. */
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
const TILE_ATTR = '&copy; OpenStreetMap &copy; CARTO'

export const WEBVIEW_MAP_UA =
  'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'

export const WEBVIEW_MAP_PROPS = {
  originWhitelist: ['*'] as string[],
  javaScriptEnabled: true,
  mixedContentMode: 'always' as const,
  userAgent: WEBVIEW_MAP_UA,
  setSupportMultipleWindows: false,
}

const LEAFLET_HEAD = `
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
`

export function leafletTileInit(lat: number, lng: number, zoom: number): string {
  return `
var map = L.map('map', { zoomControl: true }).setView([${lat}, ${lng}], ${zoom});
L.tileLayer('${TILE_URL}', {
  attribution: '${TILE_ATTR}',
  subdomains: 'abcd',
  maxZoom: 20
}).addTo(map);
`
}

export function addressMapHtml(lat: number, lng: number): string {
  return `<!DOCTYPE html>
<html>
<head>
${LEAFLET_HEAD}
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; }
</style>
</head>
<body>
<div id="map"></div>
<script>
${leafletTileInit(lat, lng, 16)}
L.marker([${lat}, ${lng}]).addTo(map);
</script>
</body>
</html>`
}

export { LEAFLET_HEAD, TILE_URL, TILE_ATTR }
