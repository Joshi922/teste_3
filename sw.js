/* Service worker do Ctônia (estrutura modular).
   - Arquivos do próprio site: rede primeiro, cache como reserva (você sempre vê a versão mais nova e o app abre offline).
   - Bibliotecas externas (CDN, fontes): usa o cache e atualiza em segundo plano.
   - Nunca mexe nas APIs do Google/Firebase (Drive, Agenda, login) nem em dados do usuário (IndexedDB/localStorage). */
const VERSION = 'ctonia-modular-v2';
const SHELL = [
  './',
  'css/academia-gemas.css',
  'css/academia.css',
  'css/astro.css',
  'css/biblioteca-viva.css',
  'css/corretor.css',
  'css/feituras.css',
  'css/gerenciar-extras.css',
  'css/gerenciar.css',
  'css/hub-letreiro.css',
  'css/hub-mobile.css',
  'css/hub-oraculo.css',
  'css/hub-relogio.css',
  'css/hub-themes.css',
  'css/lab-kit.css',
  'css/laboratorio-embreve.css',
  'css/laboratorio.css',
  'css/library.css',
  'css/oraculo.css',
  'css/reader.css',
  'css/themes.css',
  'index.html',
  'js/academia/app.js',
  'js/academia/google-agenda.js',
  'js/annotations/bookmarks.js',
  'js/annotations/highlights.js',
  'js/annotations/markers.js',
  'js/annotations/notes.js',
  'js/biblioteca-viva/app.js',
  'js/core/app.js',
  'js/core/astro.js',
  'js/core/boot.js',
  'js/core/database.js',
  'js/core/hub-bridge.js',
  'js/core/loader.js',
  'js/corretor/app.js',
  'js/feituras/app.js',
  'js/gerenciar/app.js',
  'js/gerenciar/google-agenda.js',
  'js/gerenciar/google-drawer.js',
  'js/hub/app.js',
  'js/hub/astro.js',
  'js/hub/boot.js',
  'js/hub/cloud-sync.js',
  'js/hub/img-to-pdf.js',
  'js/hub/organize-pdf.js',
  'js/hub/pdf-engine.js',
  'js/hub/portal.js',
  'js/hub/pwa.js',
  'js/hub/sign-pdf.js',
  'js/hub/storage.js',
  'js/hub/theme.js',
  'js/hub/tools-ui.js',
  'js/hub/workflows.js',
  'js/laboratorio/app.js',
  'js/laboratorio/embreve.js',
  'js/laboratorio/ortografia.js',
  'js/library/books.js',
  'js/library/filters.js',
  'js/library/metadata.js',
  'js/library/pdf-meta.js',
  'js/library/sorting.js',
  'js/reader/book3d.js',
  'js/reader/epub.js',
  'js/reader/flip3d.js',
  'js/reader/layout.js',
  'js/reader/navigation.js',
  'js/reader/pdf-links.js',
  'js/reader/pdf.js',
  'js/reader/reader.js',
  'js/reader/rendering.js',
  'js/reader/search.js',
  'js/reader/settings.js',
  'js/statistics/panel.js',
  'js/statistics/reading-stats.js',
  'js/sync/cloud-sync.js',
  'js/sync/google-calendar-bridge.js',
  'js/sync/google-drive.js',
  'modules/academia/index.html',
  'modules/biblioteca/index.html',
  'modules/feituras/index.html',
  'modules/gerenciar/index.html',
  'modules/laboratorio/index.html',
  'modules/laboratorio/experimentos/_embreve/index.html',
  'modules/laboratorio/experimentos/biblioteca-viva/index.html',
  'modules/laboratorio/experimentos/corretor/index.html'
];
const CDN = /^(cdn\.tailwindcss\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION)
    .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('ctonia') && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const same = u.origin === location.origin;
  if (!same && !CDN.test(u.hostname)) return;
  if (same) {
    e.respondWith(fetch(r).then(res => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(r, copy)); } return res; })
      .catch(() => caches.match(r).then(hit => hit || (r.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
  } else {
    e.respondWith(caches.match(r).then(hit => {
      const net = fetch(r).then(res => { if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then(c => c.put(r, copy)); } return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
