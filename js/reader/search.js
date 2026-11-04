        async function getPdfPageText(n) { if (pdfTextCache[n] !== undefined) return pdfTextCache[n]; const pg = await pdfDocument.getPage(n); const tc = await pg.getTextContent(); return (pdfTextCache[n] = tc.items.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim()); }
        async function searchPdf(q, resDiv) {
            const doc = pdfDocument, nq = normTxt(q), out = []; let chars = 0;
            for (let n = 1; n <= doc.numPages && out.length < 300; n++) {
                if (doc !== pdfDocument) return { out: [], chars: 1 };
                if (n % 5 === 0) resDiv.innerHTML = `<div class="p-5 text-ctonia-luminous text-sm font-bold animate-pulse text-center"><i class="ph-bold ph-spinner-gap animate-spin text-2xl mb-2"></i><br>Buscando nas memórias... lâmina ${n} de ${doc.numPages}</div>`;
                const text = await getPdfPageText(n); chars += text.length; const nt = normTxt(text); let i = nt.indexOf(nq);
                while (i !== -1 && out.length < 300) { out.push({ label: `Lâmina ${n}`, excerpt: (i > 40 ? '…' : '') + text.slice(Math.max(0, i - 40), i + q.length + 60) + '…', go: () => { pdfSearchTerm = q; renderPdfPage(n); } }); i = nt.indexOf(nq, i + nq.length); }
            }
            return { out, chars };
        }
        window.executeSearch = async function() {
            const q = document.getElementById('search-input').value.trim(); const resDiv = document.getElementById('search-results');
            if (q.length < 2 || (!currentReaderInstance && !pdfDocument)) return;
            resDiv.innerHTML = '<div class="p-5 text-ctonia-luminous text-sm font-bold animate-pulse text-center"><i class="ph-bold ph-spinner-gap animate-spin text-2xl mb-2"></i><br>Iniciando o feitiço de busca...</div>';
            try {
                let items = [];
                if (isPdfMode) {
                    const { out, chars } = await searchPdf(q, resDiv);
                    if (!chars) { resDiv.innerHTML = '<div class="p-5 text-ctonia-salmon text-sm text-center">Este pergaminho não tem palavras reconhecíveis pela magia (provavelmente é uma imagem).</div>'; return; }
                    items = out;
                } else {
                    const book = currentReaderInstance, spine = book.spine.spineItems;
                    for (let i = 0; i < spine.length && items.length < 300; i++) {
                        if (book !== currentReaderInstance) return;
                        resDiv.innerHTML = `<div class="p-5 text-ctonia-luminous text-sm font-bold animate-pulse text-center"><i class="ph-bold ph-spinner-gap animate-spin text-2xl mb-2"></i><br>Buscando no capítulo ${i + 1} de ${spine.length}...</div>`;
                        const sec = spine[i];
                        try {
                            await sec.load(book.load.bind(book));
                            (await sec.find(q)).forEach(r => items.push({ label: `Capítulo ${i + 1}`, excerpt: r.excerpt, go: () => { currentRendition.display(r.cfi); try { currentRendition.annotations.highlight(r.cfi, {}, null, 'search-hit', { fill: '#7BF0C3', 'fill-opacity': '0.7', 'mix-blend-mode': 'screen' }); setTimeout(() => { try { currentRendition.annotations.remove(r.cfi, 'highlight'); } catch (e) {} }, 5000); } catch (e) {} } }));
                        } catch (e) {} finally { try { sec.unload(); } catch (e) {} }
                    }
                }
                resDiv.innerHTML = '';
                if (!items.length) { resDiv.innerHTML = '<div class="p-5 text-ctonia-nightsky text-sm text-center font-bold">Nenhum eco encontrado nas trevas.</div>'; return; }
                const re = new RegExp('(' + escapeHtml(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
                items.forEach(it => {
                    const d = document.createElement('div'); d.className = 'p-5 border-b border-ctonia-indigo text-sm cursor-pointer hover:bg-ctonia-indigo/50 font-serif leading-relaxed text-white transition-colors';
                    d.innerHTML = `<div class="text-[10px] text-ctonia-mystic font-sans font-bold tracking-widest uppercase mb-2"><i class="ph-fill ph-bookmark-simple"></i> ${escapeHtml(it.label)}</div>` + escapeHtml(it.excerpt).replace(re, '<span class="bg-ctonia-luminous/30 text-ctonia-luminous font-bold px-1 rounded">$1</span>');
                    d.onclick = () => { it.go(); togglePanel('search-panel'); }; resDiv.appendChild(d);
                });
            } catch (e) { resDiv.innerHTML = '<div class="p-5 text-ctonia-magenta text-sm text-center font-bold">Erro ao lançar o feitiço de busca.</div>'; }
        }
