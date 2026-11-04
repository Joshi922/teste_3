        async function renderPdfPage(num) {
            if (isPdfBook) return bookGoto(num);
            if (!pdfDocument || isPdfContinuous) return;
            num = Math.max(1, Math.min(num, pdfDocument.numPages)); if (isRenderingPage) { pendingPdfPage = num; return; } isRenderingPage = true;
            try {
                const page = await pdfDocument.getPage(num), box = document.getElementById('pdf-page'), canvas = document.getElementById('pdf-canvas'); if (!box || !canvas) return;
                const vp1 = page.getViewport({ scale: 1 }), cw = views.viewer.clientWidth || window.innerWidth, ch = views.viewer.clientHeight || window.innerHeight;
                const sw = cw / vp1.width, sh = ch / vp1.height;
                const scale = Math.max(0.1, Math.min(3, (cw <= ch) ? sw : Math.min(sw, sh)));
                pdfPagedScale = scale;
                const vp = page.getViewport({ scale }), dpr = Math.min(window.devicePixelRatio || 1, 2.5);
                box.style.width = vp.width + 'px'; box.style.height = vp.height + 'px'; canvas.width = Math.floor(vp.width * dpr); canvas.height = Math.floor(vp.height * dpr);
                canvas.style.width = vp.width + 'px'; canvas.style.height = vp.height + 'px';
                await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise;
                views.viewer.scrollTop = (pdfPendingTop !== null) ? Math.max(0, pdfPendingTop * scale - 30) : 0; pdfPendingTop = null;
                const tl = document.getElementById('pdf-text-layer'); tl.innerHTML = '';
                try { const textContent = await page.getTextContent(); await pdfjsLib.renderTextLayer({ textContent, container: tl, viewport: vp, textDivs: [] }).promise; if (pdfSearchTerm) { const nq = normTxt(pdfSearchTerm); tl.querySelectorAll('span').forEach(sp => { if (normTxt(sp.textContent).includes(nq)) sp.classList.add('pdf-search-hit'); }); } } catch (e) {}
                renderPdfLinks(page, vp, document.getElementById('pdf-link-layer'));
                drawPdfHighlights(num, 'pdf-hl-layer'); refreshMarkers(); updatePdfProgressUI(num);
            } catch (e) {} finally { isRenderingPage = false; if (pendingPdfPage && pendingPdfPage !== num) { const n = pendingPdfPage; pendingPdfPage = null; renderPdfPage(n); } pendingPdfPage = null; }
        }

        function updatePdfProgressUI(num) {
            pdfCurrentPage = num; recordProgress((num / pdfDocument.numPages) * 100, { lastPage: num }); document.getElementById('reader-scrubber').value = num;
            const pct = Math.round((num / pdfDocument.numPages) * 100); document.getElementById('scrubber-text').innerText = `PÁGINA ${num} DE ${pdfDocument.numPages} • ${pct}%`; document.getElementById('min-footer-right').innerText = `${pct}%`; document.getElementById('min-footer-left').innerText = `PÁGINA ${num}`; checkBookmarkStatus(`page-${num}`);
        }

        function drawPdfHighlights(num, targetLayerId) {
            const layer = document.getElementById(targetLayerId); if (!layer) return; layer.innerHTML = ''; const anns = getBookAnnotations();
            anns.filter(a => a.rects && a.page === num).forEach(a => a.rects.forEach(r => { const d = document.createElement('div'); d.className = 'pdf-hl'; d.style.cssText = `left:${r.x * 100}%;top:${r.y * 100}%;width:${r.w * 100}%;height:${r.h * 100}%;background:${HL_HEX[a.color] || HL_HEX.yellow};box-shadow:0 0 5px ${HL_HEX[a.color] || HL_HEX.yellow}`; layer.appendChild(d); }));
        }

        function paintEpubHl(an) { try { currentRendition.annotations.highlight(an.cfi, { id: an.id }, null, 'hl-' + an.color, { fill: HL_HEX[an.color] || HL_HEX.yellow, 'fill-opacity': document.body.classList.contains('theme-dark') ? '0.5' : '0.55', 'mix-blend-mode': document.body.classList.contains('theme-dark') ? 'normal' : 'multiply' }); } catch (e) {} }
