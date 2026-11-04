        const bookUsable = () => !!(window.St && window.St.PageFlip);
        const bookWanted = () => !!(readerSettings.anim3d && !readerSettings.scroll && bookUsable() && pdfDocument && pdfDocument.numPages > 1);

        function bookTeardown() {
            try { if (pageFlip) pageFlip.destroy(); } catch (e) {}
            try { if (pdfBook) { clearTimeout(pdfBook.syncT); if (pdfBook.ro) pdfBook.ro.disconnect(); } } catch (e) {}
            pageFlip = null; pdfBook = null; isPdfBook = false; bookFlipping = false;
        }

        async function initPdfBook(startPage) {
            isPdfBook = true;
            const V = views.viewer; V.style.overflowY = 'hidden'; V.style.overflowX = 'hidden'; V.scrollTop = 0;
            V.innerHTML = '<div id="pdf-bk-stage" class="pdf-bk-stage"><div id="pdf-bk-frame" class="pdf-bk-frame"></div></div>';
            const N = pdfDocument.numPages, cnt = new Map(); let best = null;
            for (let i = 1; i <= Math.min(N, 10); i++) {   // tamanho-base = o mais comum entre as primeiras páginas
                const pg = await pdfDocument.getPage(i), v = pg.getViewport({ scale: 1 });
                const key = Math.round(v.width / 8) + 'x' + Math.round(v.height / 8), prev = cnt.get(key);
                cnt.set(key, { n: (prev ? prev.n : 0) + 1, w: v.width, h: v.height });
                if (!best || cnt.get(key).n > cnt.get(best).n) best = key;
            }
            const base = cnt.get(best);
            const B = pdfBook = { N, bw: base.w, bh: base.h, done: new Set(), tasks: new Map(), pages: [], spread: false, pw: 0, ph: 0, renderPw: 0, ro: null, ensureTok: 0, gotoTok: 0, syncT: 0 };
            if ('ResizeObserver' in window) B.ro = new ResizeObserver(entries => entries.forEach(en => {
                const el = en.target, w = en.contentRect.width, pw = parseFloat(el.style.getPropertyValue('--pw'));
                if (w > 2 && pw) el.style.setProperty('--k', (w / pw).toFixed(5));
            }));
            for (let n = 1; n <= N; n++) {
                const pg = document.createElement('div'); pg.className = 'pdf-bk-page'; pg.dataset.n = n;
                pg.innerHTML = `<div class="pdf-bk-inner" id="pdf-bk-inner-${n}" data-page="${n}" style="left:0;top:0;width:100%;height:100%;--pw:${B.bw};--ph:${B.bh};--k:1"><canvas class="pdf-canvas" id="pdf-canvas-${n}" width="1" height="1"></canvas><div class="pdf-hl-layer" id="pdf-hl-layer-${n}"></div><div class="pdf-bk-textwrap"><div class="textLayer" id="pdf-text-layer-${n}"></div></div><div class="pdf-link-layer" id="pdf-link-layer-${n}"></div></div>`;
                B.pages.push(pg);
            }
            bookCreate(startPage);
            await bookRenderVisible();
            bookProgress();
        }

        function bookLayout() {
            const B = pdfBook, st = document.getElementById('pdf-bk-stage');
            const W = st ? st.clientWidth : views.viewer.clientWidth, H = st ? st.clientHeight : views.viewer.clientHeight;
            const pad = W < 700 ? 6 : 22, aw = Math.max(80, W - pad * 2), ah = Math.max(80, H - pad * 2), r = B.bw / B.bh;
            const pwS = Math.min(aw, ah * r), pwD = Math.min(aw / 2, ah * r);
            const spread = B.N > 1 && pwD >= pwS * 0.8;          // paisagem = duas páginas; retrato = uma
            const pw = Math.max(60, Math.floor(spread ? pwD : pwS)), ph = Math.floor(pw / r);
            return { spread, pw, ph, fw: spread ? pw * 2 : pw, fh: ph };
        }

        function bookCreate(startPage) {
            const B = pdfBook; if (!B) return;
            try { if (pageFlip) pageFlip.destroy(); } catch (e) {} pageFlip = null; bookFlipping = false;
            const L = bookLayout(); B.spread = L.spread; B.pw = L.pw; B.ph = L.ph; B.renderPw = B.renderPw || L.pw;
            const frame = document.getElementById('pdf-bk-frame'); if (!frame) return;
            frame.style.width = L.fw + 'px'; frame.style.height = L.fh + 'px';
            frame.innerHTML = '<div id="pdf-book"></div>';
            const host = document.getElementById('pdf-book'); B.pages.forEach(p => host.appendChild(p));
            pageFlip = new St.PageFlip(host, {
                width: L.pw, height: L.ph, size: 'stretch',
                minWidth: Math.round(L.pw * 0.6), maxWidth: Math.round(L.pw * 2), minHeight: Math.round(L.ph * 0.5), maxHeight: Math.round(L.ph * 2),
                maxShadowOpacity: 0.35, showCover: true, mobileScrollSupport: false,
                useMouseEvents: false,          // o centro fica livre para selecionar texto; viramos por toque/borda/seta/arrastar
                flippingTime: 800, startPage: Math.max(0, Math.min((parseInt(startPage) || 1) - 1, B.N - 1))
            });
            pageFlip.on('flip', () => { bookFlipping = false; bookOnFlip(); });
            pageFlip.on('changeState', e => { bookFlipping = !(e && e.data === 'read'); if (!bookFlipping) setTimeout(refreshMarkers, 40); });
            pageFlip.loadFromHTML(B.pages);
        }

        function bookVisible() {
            const B = pdfBook; if (!B || !pageFlip) return [pdfCurrentPage || 1];
            let idx = 0, land = B.spread;
            try { idx = pageFlip.getCurrentPageIndex(); } catch (e) {}
            try { land = pageFlip.getOrientation() === 'landscape'; } catch (e) {}
            if (!land) return [idx + 1];
            if (idx === 0) return [1];
            if (idx % 2 === 0) idx -= 1;      // com capa, a página da esquerda da dupla é sempre ímpar (índice)
            const a = idx + 1; return a + 1 <= B.N ? [a, a + 1] : [a];
        }

        function bookProgress() {
            const B = pdfBook; if (!B) return; const vis = bookVisible(); updatePdfProgressUI(vis[0]);
            if (vis.length > 1) {
                const pct = Math.round((vis[1] / B.N) * 100), t = document.getElementById('scrubber-text'), l = document.getElementById('min-footer-left'), r = document.getElementById('min-footer-right');
                if (t) t.innerText = `PÁGINAS ${vis[0]}–${vis[1]} DE ${B.N} • ${pct}%`; if (l) l.innerText = `PÁGINAS ${vis[0]}–${vis[1]}`; if (r) r.innerText = `${pct}%`;
            }
        }

        function bookOnFlip() { if (!pdfBook || !pageFlip) return; bookProgress(); bookEnsure(); setTimeout(refreshMarkers, 60); }
        function bookSyncSoon() { const B = pdfBook; if (!B) return; clearTimeout(B.syncT); B.syncT = setTimeout(() => { if (B === pdfBook) bookOnFlip(); }, 1200); }

        async function bookRenderVisible() { const vis = bookVisible(); await Promise.all(vis.map(n => bookRender(n))); bookEnsure(); }

        async function bookEnsure() {
            const B = pdfBook; if (!B) return; const tok = ++B.ensureTok, vis = bookVisible(), lo = vis[0], hi = vis[vis.length - 1], order = [...vis];
            for (let d = 1; d <= 4; d++) order.push(hi + d, lo - d);
            for (const n of order) { if (tok !== B.ensureTok || B !== pdfBook) return; if (n >= 1 && n <= B.N) await bookRender(n); }
            if (tok === B.ensureTok && B === pdfBook) bookRelease();
        }

        function bookRender(n) {
            const B = pdfBook; if (!B || n < 1 || n > B.N || B.done.has(n)) return Promise.resolve();
            if (B.tasks.has(n)) return B.tasks.get(n);
            const t = (async () => {
                try {
                    const inner = document.getElementById('pdf-bk-inner-' + n); if (!inner) return;
                    const page = await pdfDocument.getPage(n); if (B !== pdfBook) return;
                    const v1 = page.getViewport({ scale: 1 }), rb = B.bw / B.bh, rp = v1.width / v1.height; let w = 100, h = 100;
                    if (rp > rb) h = (rb / rp) * 100; else w = (rp / rb) * 100;          // páginas de tamanho diferente ficam centralizadas
                    const dispW = B.pw * w / 100;
                    inner.style.cssText = `left:${(100 - w) / 2}%;top:${(100 - h) / 2}%;width:${w}%;height:${h}%;--pw:${v1.width};--ph:${v1.height};--k:${(dispW / v1.width).toFixed(5)}`;
                    const dpr = Math.min(window.devicePixelRatio || 1, 2.5); let scale = Math.max(0.8, Math.min(4, (dispW * dpr) / v1.width));
                    let vpR = page.getViewport({ scale }); if (vpR.width * vpR.height > 14e6) { scale *= Math.sqrt(14e6 / (vpR.width * vpR.height)); vpR = page.getViewport({ scale }); }
                    const canvas = document.getElementById('pdf-canvas-' + n); canvas.width = Math.floor(vpR.width); canvas.height = Math.floor(vpR.height);
                    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vpR }).promise; if (B !== pdfBook) return;
                    const tl = document.getElementById('pdf-text-layer-' + n); tl.innerHTML = '';
                    try {
                        const tc = await page.getTextContent(); await pdfjsLib.renderTextLayer({ textContent: tc, container: tl, viewport: v1, textDivs: [] }).promise;
                        if (pdfSearchTerm) { const nq = normTxt(pdfSearchTerm); tl.querySelectorAll('span').forEach(sp => { if (normTxt(sp.textContent).includes(nq)) sp.classList.add('pdf-search-hit'); }); }
                    } catch (e) {}
                    renderPdfLinks(page, v1, document.getElementById('pdf-link-layer-' + n));
                    drawPdfHighlights(n, 'pdf-hl-layer-' + n);
                    B.done.add(n); if (B.ro) B.ro.observe(inner);
                    refreshMarkers();
                } catch (e) { /* página ficou em branco: tenta de novo na próxima passagem */ } finally { B.tasks.delete(n); }
            })();
            B.tasks.set(n, t); return t;
        }

        function bookFree(n) {
            const B = pdfBook; if (!B) return; B.done.delete(n);
            const inner = document.getElementById('pdf-bk-inner-' + n); if (!inner) return;
            try { if (B.ro) B.ro.unobserve(inner); } catch (e) {}
            const cv = inner.querySelector('canvas'); if (cv) { cv.width = 1; cv.height = 1; }
            ['.textLayer', '.pdf-hl-layer', '.pdf-link-layer'].forEach(s => { const el = inner.querySelector(s); if (el) el.innerHTML = ''; });
        }
        function bookRelease() { const B = pdfBook; if (!B || B.done.size < 14) return; const c = bookVisible()[0]; Array.from(B.done).forEach(n => { if (Math.abs(n - c) > 8) bookFree(n); }); }
        function bookInvalidate() { const B = pdfBook; if (!B) return; Array.from(B.done).forEach(bookFree); B.renderPw = B.pw; }

        function bookMarkSearch() {
            const host = document.getElementById('pdf-book'); if (!host) return;
            host.querySelectorAll('.pdf-search-hit').forEach(el => el.classList.remove('pdf-search-hit'));
            if (!pdfSearchTerm) return; const nq = normTxt(pdfSearchTerm);
            host.querySelectorAll('.textLayer span').forEach(sp => { if (normTxt(sp.textContent).includes(nq)) sp.classList.add('pdf-search-hit'); });
        }

        async function bookGoto(num, instant) {
            const B = pdfBook; if (!B || !pageFlip) return;
            num = Math.max(1, Math.min(B.N, parseInt(num) || 1)); const tok = ++B.gotoTok; clearMarkers();
            if (pdfSearchTerm) bookMarkSearch();
            if (bookVisible().includes(num)) { bookEnsure(); setTimeout(refreshMarkers, 40); return; }
            await Promise.all([bookRender(num), bookRender(num + 1), bookRender(num - 1)]);      // prepara o destino antes de virar
            if (B !== pdfBook || tok !== B.gotoTok || !pageFlip) return;
            if (pdfSearchTerm) bookMarkSearch();
            try { if (instant) { pageFlip.turnToPage(num - 1); setTimeout(() => { if (B === pdfBook) bookOnFlip(); }, 40); } else { pageFlip.flip(num - 1); bookSyncSoon(); } } catch (e) {}
        }

        function bookRelayout() {
            const B = pdfBook; if (!B || !pageFlip) return;
            const L = bookLayout(), ratio = L.pw / B.pw;
            const rebuild = L.spread !== B.spread || (L.spread ? (ratio < 0.72 || ratio > 1.6) : (ratio > 1.12 || ratio < 0.7));
            if (rebuild) { const p = bookVisible()[0], stale = Math.abs(L.pw - B.renderPw) / B.renderPw > 0.25; bookCreate(p); if (stale) bookInvalidate(); bookOnFlip(); return; }
            const frame = document.getElementById('pdf-bk-frame'); if (frame) { frame.style.width = L.fw + 'px'; frame.style.height = L.fh + 'px'; }
            B.pw = L.pw; B.ph = L.ph;
            try { if (typeof pageFlip.update === 'function') pageFlip.update(); } catch (e) {}
            if (Math.abs(L.pw - B.renderPw) / B.renderPw > 0.25) { bookInvalidate(); bookEnsure(); }
            setTimeout(refreshMarkers, 80);
        }
