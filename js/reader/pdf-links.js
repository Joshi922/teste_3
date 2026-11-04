        /* ====================== AJUSTES 12: celular, links do PDF, índice, sincronização ====================== */
        var pdfJumpStack = [], pdfPagedScale = 1, pdfPendingTop = null, annSnap = {}, syncBusy = false, syncMsg = '', syncTimer = 0, pdfLastSize = null, pdfResizeT = 0;
        const DEFAULT_CLIENT_ID = ''; // opcional: cole aqui o seu Client ID para não precisar digitá-lo em cada aparelho
        const CT_ORIGIN = (() => { try { return GW.location.origin; } catch (e) { return ''; } })();

        /* ---------- PDF: links internos/externos ---------- */
        async function renderPdfLinks(page, vp, host) {
            if (!host) return; host.innerHTML = '';
            let anns = []; try { anns = await page.getAnnotations({ intent: 'display' }); } catch (e) { return; }
            const frag = document.createDocumentFragment();
            for (const a of anns) {
                if (a.subtype !== 'Link' || !a.rect) continue;
                const url = a.url || null, dest = a.dest || null, act = a.action || null;
                if (!url && !dest && !act) continue;
                const r = vp.convertToViewportRectangle(a.rect);
                const x = Math.min(r[0], r[2]), y = Math.min(r[1], r[3]), w = Math.abs(r[2] - r[0]), h = Math.abs(r[3] - r[1]);
                if (w < 1 || h < 1) continue;
                const el = document.createElement('a'); el.className = 'pdf-link';
                el.style.cssText = `left:${x / vp.width * 100}%;top:${y / vp.height * 100}%;width:${w / vp.width * 100}%;height:${h / vp.height * 100}%`;
                if (url) { el.href = url; el.target = '_blank'; el.rel = 'noopener noreferrer'; el.addEventListener('click', ev => ev.stopPropagation()); }
                else { el.href = '#'; el.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); followPdfLink(dest, act); }); }
                frag.appendChild(el);
            }
            host.appendChild(frag);
        }
        async function resolvePdfTarget(dest) {
            try {
                if (typeof dest === 'string') dest = await pdfDocument.getDestination(dest);
                if (!Array.isArray(dest) || !dest.length) return null;
                const ref = dest[0]; let pg;
                if (ref && typeof ref === 'object') pg = (await pdfDocument.getPageIndex(ref)) + 1; else if (Number.isInteger(ref)) pg = ref + 1; else return null;
                let top = null; const kind = dest[1] && dest[1].name;
                if (kind === 'XYZ') top = dest[3]; else if (kind === 'FitH' || kind === 'FitBH') top = dest[2]; else if (kind === 'FitR') top = dest[5];
                return { page: Math.max(1, Math.min(pg, pdfDocument.numPages)), top: (typeof top === 'number') ? top : null };
            } catch (e) { return null; }
        }
        async function resolvePdfDest(dest) { const t = await resolvePdfTarget(dest); return t ? t.page : null; }
        async function gotoPdfTarget(t) {
            if (!pdfDocument || !t) return;
            const p = t.page; let yOff = null, pgObj = null;
            if (t.top !== null && t.top !== undefined) { try { pgObj = await pdfDocument.getPage(p); if (!pgObj.rotate) yOff = Math.max(0, pgObj.view[3] - t.top); } catch (e) {} }
            if (isPdfContinuous) {
                const w = document.getElementById(`pdf-page-wrapper-${p}`); if (!w) return; w.scrollIntoView();
                if (yOff !== null && pgObj) setTimeout(() => { const sc = w.getBoundingClientRect().width / (pgObj.view[2] - pgObj.view[0]); const off = yOff * sc - 30; if (off > 40) views.viewer.scrollTop += off; }, 450);
            } else {
                pdfPendingTop = yOff;
                if (p === pdfCurrentPage) await renderPdfPage(p);
                else await apply3DFlip(p > pdfCurrentPage ? 1 : -1, async () => { await renderPdfPage(p); });
            }
        }
        async function followPdfLink(dest, act) {
            if (!pdfDocument) return;
            let t = null;
            if (dest) t = await resolvePdfTarget(dest);
            else if (act === 'NextPage') t = { page: Math.min(pdfCurrentPage + 1, pdfDocument.numPages), top: null };
            else if (act === 'PrevPage') t = { page: Math.max(pdfCurrentPage - 1, 1), top: null };
            else if (act === 'FirstPage') t = { page: 1, top: null };
            else if (act === 'LastPage') t = { page: pdfDocument.numPages, top: null };
            if (!t) return;
            pdfJumpStack.push({ page: pdfCurrentPage, top: views.viewer.scrollTop }); if (pdfJumpStack.length > 30) pdfJumpStack.shift();
            showPdfBackBtn(); await gotoPdfTarget(t);
        }
        function showPdfBackBtn() {
            let b = document.getElementById('pdf-back-btn');
            if (!b) { b = document.createElement('button'); b.id = 'pdf-back-btn'; b.type = 'button'; b.onclick = pdfJumpBack; (document.getElementById('reader-container') || document.body).appendChild(b); }
            const last = pdfJumpStack[pdfJumpStack.length - 1];
            if (!last) { b.style.display = 'none'; return; }
            b.textContent = '↩ Voltar à pág. ' + last.page; b.style.display = 'flex';
        }
        function hidePdfBackBtn() { const b = document.getElementById('pdf-back-btn'); if (b) b.style.display = 'none'; }
        async function pdfJumpBack() {
            const last = pdfJumpStack.pop(); showPdfBackBtn(); if (!last || !pdfDocument) return;
            if (isPdfContinuous) { views.viewer.scrollTop = last.top; }
            else { await apply3DFlip(last.page > pdfCurrentPage ? 1 : -1, async () => { await renderPdfPage(last.page); }); views.viewer.scrollTop = last.top; }
        }

        /* ---------- PDF: reajusta quando a tela muda (girar o celular, esconder barras...) ---------- */
        function pdfRelayout() {
            if (!pdfDocument || views.reader.classList.contains('hidden')) return;
            const w = views.viewer.clientWidth, h = views.viewer.clientHeight; if (!w || !h) return;
            if (isPdfBook) { pdfLastSize = { w, h }; bookRelayout(); return; }
            const L = pdfLastSize; pdfLastSize = { w, h };
            if (!L) { if (!isPdfContinuous) renderPdfPage(pdfCurrentPage); return; }
            if (!isPdfContinuous) {
                if (Math.abs(L.w - w) < 3 && Math.abs(L.h - h) < 3) return;
                if (w <= h && L.w <= L.h && Math.abs(L.w - w) < 3) return; // retrato: só a largura importa
                renderPdfPage(pdfCurrentPage); return;
            }
            if (Math.abs(L.w - w) < 8) return;
            const cur = pdfCurrentPage;
            document.querySelectorAll('#pdf-scroll-container .pdf-page-wrapper').forEach(el => { el.innerHTML = ''; el.dataset.rendered = 'false'; el.style.minHeight = '800px'; el.style.width = '100%'; });
            if (pdfObserver) document.querySelectorAll('.pdf-page-wrapper').forEach(el => { pdfObserver.unobserve(el); pdfObserver.observe(el); });
            setTimeout(() => { const t = document.getElementById(`pdf-page-wrapper-${cur}`); if (t) t.scrollIntoView(); }, 60);
        }
        if ('ResizeObserver' in window) new ResizeObserver(() => { clearTimeout(pdfResizeT); pdfResizeT = setTimeout(pdfRelayout, 220); }).observe(views.viewer);

        /* ---------- Arrastar para o lado vira a página (PDF e EPUB) ---------- */
        function swipeEnd(dx, dy, dt) {
            if (readerSettings.scroll) return;
            const sel = window.getSelection(); if (sel && !sel.isCollapsed) return;
            if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.4 || dt > 900) return;
            const hm = document.getElementById('hl-edit-menu'); if (hm && !hm.classList.contains('hidden')) return;
            if (dx < 0) nextPage(); else prevPage();
        }
        (function () {
            let sx = 0, sy0 = 0, st = 0, on = false; const V = views.viewer;
            V.addEventListener('touchstart', e => { if (e.touches.length !== 1) { on = false; return; } const t = e.touches[0]; sx = t.clientX; sy0 = t.clientY; st = Date.now(); on = true; }, { passive: true });
            V.addEventListener('touchend', e => { if (!on) return; on = false; const t = e.changedTouches[0]; if (t) swipeEnd(t.clientX - sx, t.clientY - sy0, Date.now() - st); }, { passive: true });
            V.addEventListener('touchcancel', () => { on = false; }, { passive: true });
        })();
        function hookEpubSwipe(rendition) {
            let ex = 0, ey = 0, et = 0;
            rendition.on('touchstart', e => { if (e.touches && e.touches.length === 1) { ex = e.touches[0].clientX; ey = e.touches[0].clientY; et = Date.now(); } else et = 0; });
            rendition.on('touchend', e => {
                if (!et) return; const t = e.changedTouches && e.changedTouches[0]; if (!t) { et = 0; return; }
                const s = e.view && e.view.getSelection && e.view.getSelection(); if (s && !s.isCollapsed) { et = 0; return; }
                const dx = t.clientX - ex, dy = t.clientY - ey, dt = Date.now() - et; et = 0; swipeEnd(dx, dy, dt);
            });
        }

        /* ---------- PDF: índice (sumário embutido ou montado a partir dos links azuis) ---------- */
        async function buildPdfToc() {
            const doc = pdfDocument, list = document.getElementById('toc-list'); list.innerHTML = '';
            const clean = s => (s || '').replace(/\s+/g, ' ').trim();
            let entries = [], outline = null;
            try { outline = await doc.getOutline(); } catch (e) {}
            if (outline && outline.length) {
                const walk = (items, depth) => items.forEach(it => {
                    const title = clean(it.title);
                    if (title && !/sem t[ií]tulo|^untitled$/i.test(title) && (it.dest || it.url)) entries.push({ title, depth: Math.min(depth, 4), dest: it.dest || null, url: it.url || null });
                    if (it.items && it.items.length) walk(it.items, depth + 1);
                });
                walk(outline, 0);
            }
            if (!entries.length) {
                list.innerHTML = '<p class="text-[11px] uppercase tracking-widest text-ctonia-nightsky font-bold py-3">Lendo o índice do livro…</p>';
                try { entries = await buildTocFromLinks(doc); } catch (e) { console.warn('Índice por links', e); entries = []; }
            }
            if (doc !== pdfDocument) return;
            list.innerHTML = '';
            if (entries.length) {
                entries.forEach(en => {
                    const d = document.createElement('div');
                    d.className = 'cursor-pointer py-3 border-b border-ctonia-indigo hover:text-ctonia-luminous transition-colors font-serif font-bold text-sm tracking-wide flex items-baseline gap-3';
                    d.style.paddingLeft = (en.depth * 16) + 'px';
                    const t = document.createElement('span'); t.className = 'flex-1 min-w-0'; t.textContent = en.title; d.appendChild(t);
                    if (en.page) { const p = document.createElement('span'); p.className = 'text-[11px] opacity-60 shrink-0'; p.textContent = en.page; d.appendChild(p); }
                    d.onclick = async () => {
                        if (en.url) { window.open(en.url, '_blank', 'noopener'); return; }
                        const tg = en.target || await resolvePdfTarget(en.dest); if (!tg) return;
                        togglePanel('toc-panel'); await gotoPdfTarget(tg);
                    };
                    list.appendChild(d);
                });
                return;
            }
            list.innerHTML = '<p class="text-[11px] uppercase tracking-widest text-ctonia-nightsky font-bold mb-4">Escolha a lâmina de tempo:</p><div id="pdf-page-grid" class="grid grid-cols-5 gap-2 mt-2"></div>';
            const g = document.getElementById('pdf-page-grid');
            for (let i = 1; i <= doc.numPages; i++) { const b = document.createElement('button'); b.className = 'py-2 text-sm border border-ctonia-darkmint bg-ctonia-indigo rounded hover:bg-ctonia-luminous hover:text-ctonia-abyssal hover:border-ctonia-luminous transition-colors font-bold'; b.textContent = i; b.onclick = () => { togglePanel('toc-panel'); gotoPdfTarget({ page: i, top: null }); }; g.appendChild(b); }
        }
        async function buildTocFromLinks(doc) {
            const clean = s => (s || '').replace(/\s+/g, ' ').trim(), hasLetter = s => /\p{L}/u.test(s);
            const maxScan = Math.min(doc.numPages, 80), pages = [];
            for (let n = 1; n <= maxScan; n++) {
                if (doc !== pdfDocument) return [];
                const pg = await doc.getPage(n); let anns = [];
                try { anns = await pg.getAnnotations({ intent: 'display' }); } catch (e) {}
                pages.push({ n, pg, links: anns.filter(a => a.subtype === 'Link' && a.dest && a.rect) });
            }
            // agrupa páginas vizinhas com vários links internos e escolhe o grupo com mais links (o sumário)
            const clusters = []; let cur = null, gap = 0;
            pages.forEach(p => {
                const min = cur ? 2 : 3;
                if (p.links.length >= min) { if (!cur) { cur = { pages: [], total: 0 }; clusters.push(cur); } cur.pages.push(p); cur.total += p.links.length; gap = 0; }
                else if (cur && ++gap > 1) { cur = null; gap = 0; }
            });
            if (!clusters.length) return [];
            const best = clusters.sort((a, b) => b.total - a.total)[0];
            if (best.total < 4) return [];
            const out = [];
            for (const pi of best.pages) {
                const tc = await pi.pg.getTextContent();
                const items = tc.items.filter(i => i.str && i.str.trim()).map(i => ({ s: i.str, x: i.transform[4], y: i.transform[5], w: i.width || 0, h: i.height || Math.abs(i.transform[3]) || 10 }));
                const rows = [];
                for (const a of pi.links) {
                    const x1 = Math.min(a.rect[0], a.rect[2]), x2 = Math.max(a.rect[0], a.rect[2]), y1 = Math.min(a.rect[1], a.rect[3]), y2 = Math.max(a.rect[1], a.rect[3]);
                    const hit = [];
                    for (const it of items) {
                        const cy = it.y + it.h * 0.3; if (cy < y1 - 2 || cy > y2 + 2) continue;
                        if (it.w <= 0) { if (it.x >= x1 - 1 && it.x <= x2 + 1) hit.push({ it, s: it.s }); continue; }
                        const ix1 = Math.max(x1, it.x), ix2 = Math.min(x2, it.x + it.w); if (ix2 - ix1 <= 0.5) continue;
                        let s = it.s;
                        if ((ix2 - ix1) / it.w < 0.97) { const a0 = Math.round((ix1 - it.x) / it.w * s.length), b0 = Math.round((ix2 - it.x) / it.w * s.length); s = s.slice(Math.max(0, a0), Math.max(a0, b0)); }
                        hit.push({ it, s });
                    }
                    hit.sort((p, q) => (Math.abs(q.it.y - p.it.y) > 3 ? q.it.y - p.it.y : p.it.x - q.it.x));
                    let text = clean(hit.map(h => h.s).join(' '));
                    const m = text.match(/^(.*?)(?:\s*[.·…_]{2,}\s*|\s{2,})(\d{1,4}|[ivxlcdm]{1,7})$/i); if (m && hasLetter(m[1])) text = clean(m[1]);
                    text = text.replace(/\s*[.·…_]{3,}\s*$/, '').trim();
                    rows.push({ text, dest: a.dest, key: typeof a.dest === 'string' ? a.dest : JSON.stringify(a.dest), x: x1, y: y2, n: pi.n });
                }
                rows.sort((a, b) => (Math.abs(b.y - a.y) > 3 ? b.y - a.y : a.x - b.x));
                const lefts = [...new Set(rows.filter(r => hasLetter(r.text)).map(r => Math.round(r.x / 8)))].sort((a, b) => a - b);
                for (const r of rows) {
                    if (!hasLetter(r.text)) continue;
                    const last = out[out.length - 1];
                    if (last && last.key === r.key && last.n === r.n) { if (r.text.toLowerCase() !== last.title.toLowerCase()) last.title = clean(last.title + ' ' + r.text); continue; }
                    const depth = (lefts.length > 1 && lefts.length <= 4) ? Math.min(3, lefts.indexOf(Math.round(r.x / 8))) : 0;
                    out.push({ title: r.text, depth: Math.max(0, depth), dest: r.dest, key: r.key, n: r.n });
                }
            }
            const final = [];
            for (const e of out) {
                if (doc !== pdfDocument) return [];
                if (e.title.length < 2 || /^(contents?|table of contents|[ií]ndice|sum[áa]rio)$/i.test(e.title)) continue;
                const tg = await resolvePdfTarget(e.dest); if (!tg || tg.page === e.n) continue;
                const prev = final[final.length - 1]; if (prev && prev.title === e.title && prev.page === tg.page) continue;
                final.push({ title: e.title, depth: e.depth, dest: e.dest, target: tg, page: tg.page });
            }
            return final;
        }
