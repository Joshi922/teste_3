        async function initPdfReader(book, startPage = 1) {
            if (!window.pdfjsLib) throw new Error('pdf.js não carregou.');
            const buf = await getBookBuffer(book); pdfDocument = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise; 
            document.getElementById('reader-scrubber').max = pdfDocument.numPages; document.getElementById('scrubber-max').innerText = pdfDocument.numPages;
            buildPdfToc(); 

            isPdfContinuous = readerSettings.scroll;
            bookTeardown();
            if (!isPdfContinuous && bookWanted()) { try { await initPdfBook(startPage); return; } catch (err) { console.error('Livro 3D indisponível, usando página única:', err); bookTeardown(); } }

            if (isPdfContinuous) {
                views.viewer.style.overflowY = 'auto';
                views.viewer.innerHTML = '<div id="pdf-scroll-container" class="w-full flex flex-col items-center gap-6 py-6 bg-transparent"></div>';
                const cont = document.getElementById('pdf-scroll-container');
                for(let i=1; i<=pdfDocument.numPages; i++) {
                    const wrapper = document.createElement('div');
                    wrapper.id = `pdf-page-wrapper-${i}`; wrapper.className = 'pdf-page-wrapper';
                    wrapper.style.cssText = 'min-height: 800px; width: 100%; max-width: 800px;';
                    wrapper.dataset.page = i; wrapper.dataset.rendered = "false";
                    cont.appendChild(wrapper);
                }
                pdfObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const pg = parseInt(entry.target.dataset.page);
                            if (entry.target.dataset.rendered === "false") renderSinglePdfPageInScroll(pg, entry.target);
                            updatePdfProgressUI(pg);
                        }
                    });
                }, { threshold: 0.3 });
                document.querySelectorAll('.pdf-page-wrapper').forEach(el => pdfObserver.observe(el));
                if(startPage > 1) setTimeout(() => { const tgt = document.getElementById(`pdf-page-wrapper-${startPage}`); if(tgt) tgt.scrollIntoView(); }, 100);
            } else {
                views.viewer.style.overflowY = 'auto'; views.viewer.style.overflowX = 'hidden'; views.viewer.scrollTop = 0;
                views.viewer.innerHTML = '<div id="pdf-stage" style="display:flex;min-height:100%;width:100%"><div id="pdf-page" class="pdf-page-wrapper" style="margin:auto"><canvas id="pdf-canvas" class="pdf-canvas"></canvas><div id="pdf-hl-layer" class="pdf-hl-layer"></div><div id="pdf-text-layer" class="textLayer"></div><div id="pdf-link-layer" class="pdf-link-layer"></div></div></div>';
                await renderPdfPage(startPage);
            }
        }

        async function renderSinglePdfPageInScroll(num, wrapper) {
            wrapper.dataset.rendered = "true";
            wrapper.innerHTML = `<canvas id="pdf-canvas-${num}" class="pdf-canvas rounded shadow-[0_4px_20px_rgba(0,0,0,0.8)]"></canvas><div id="pdf-hl-layer-${num}" class="pdf-hl-layer"></div><div id="pdf-text-layer-${num}" class="textLayer"></div><div id="pdf-link-layer-${num}" class="pdf-link-layer"></div>`;
            try {
                const page = await pdfDocument.getPage(num), canvas = document.getElementById(`pdf-canvas-${num}`);
                const vp1 = page.getViewport({ scale: 1 }), cw = views.viewer.clientWidth || window.innerWidth;
                const scale = Math.max(0.1, Math.min(cw / vp1.width, 1.6)), vp = page.getViewport({ scale }), dpr = Math.min(window.devicePixelRatio || 1, 2.5);
                wrapper.style.minHeight = vp.height + 'px'; wrapper.style.width = vp.width + 'px';
                canvas.width = Math.floor(vp.width * dpr); canvas.height = Math.floor(vp.height * dpr);
                canvas.style.width = vp.width + 'px'; canvas.style.height = vp.height + 'px';
                await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise;
                const tl = document.getElementById(`pdf-text-layer-${num}`);
                try { const textContent = await page.getTextContent(); await pdfjsLib.renderTextLayer({ textContent, container: tl, viewport: vp, textDivs: [] }).promise; } catch(e){}
                renderPdfLinks(page, vp, document.getElementById(`pdf-link-layer-${num}`)); drawPdfHighlights(num, `pdf-hl-layer-${num}`); refreshMarkers();
            } catch(e){ wrapper.dataset.rendered = "false"; }
        }

        /* ====================== LIVRO 3D (PDF) ======================
           Cada folha é uma página real do PageFlip com sua própria camada de
           canvas + texto selecionável + destaques + links. As anotações já salvas
           (destaque, nota, pin, selo) continuam por página e em proporção (0..1),
           então valem igualmente no livro, no modo de página única e no contínuo. */
