        async function initEpubReader(book, startCfi = null) {
            if (!window.ePub) throw new Error('epub.js não carregou.');
            const buf = await getBookBuffer(book);
            currentReaderInstance = ePub(buf); const area = document.createElement('div'); area.id = 'epub-area'; 
            
            if (readerSettings.scroll) {
                views.viewer.style.overflowY = 'auto'; views.viewer.style.overflowX = 'hidden';
                area.style.cssText = 'position:relative; max-width:800px; margin:0 auto; padding-top:30px; padding-bottom:100px; width:100%;';
            } else {
                views.viewer.style.overflow = 'hidden';
                area.style.cssText = 'position:absolute;top:0;bottom:0;left:0;right:0;max-width:800px;margin:0 auto;height:100%;width:100%;padding-top:20px;';
            }
            views.viewer.innerHTML = ''; views.viewer.appendChild(area);
            
            currentRendition = currentReaderInstance.renderTo(area, { width: '100%', height: '100%', spread: 'none', flow: readerSettings.scroll ? 'scrolled-doc' : 'paginated' });
            
            currentRendition.themes.register('light', { 'html, body': { 'background': 'transparent !important', 'color': '#1B132B !important' }});
            currentRendition.themes.register('sepia', { 'html, body': { 'background': 'transparent !important', 'color': '#FFBEA6 !important' }}); // Sepia Ctônico usa fundo do body
            currentRendition.themes.register('dark', { 'html, body': { 'background': 'transparent !important', 'color': '#FFBEA6 !important' }});
            
            buildEpubToc(); applySettingsToRendition();

            currentReaderInstance.ready.then(() => currentReaderInstance.locations.generate(1600)).then(() => { const total = currentReaderInstance.locations.total; document.getElementById('reader-scrubber').max = total; document.getElementById('scrubber-max').innerText = total; updateEpubProgressUI(); });
            currentRendition.on('relocated', loc => { updateEpubProgressUI(loc); checkBookmarkStatus(loc.start.cfi); setTimeout(refreshMarkers, 200); });
            currentRendition.on('rendered', () => setTimeout(refreshMarkers, 300));

            currentRendition.on('selected', async (cfiRange) => {
                currentSelectionCfi = cfiRange; closeHlMenu();
                try {
                    const rangeObj = currentReaderInstance.getRange(cfiRange);
                    const r = (rangeObj instanceof Promise) ? await rangeObj : rangeObj;
                    currentSelectionText = r.toString().replace(/\s+/g, ' ').trim();
                } catch (e) { currentSelectionText = ''; }
                document.getElementById('selection-toolbar').classList.remove('hidden');
            });
            currentRendition.on('keyup', onReaderKey); hookEpubSwipe(currentRendition);
            currentRendition.on('click', e => {
                const fr = e.view && e.view.frameElement, x = (fr ? fr.getBoundingClientRect().left : 0) + e.clientX;
                const s = e.view && e.view.getSelection(); const hasSel = !!(s && !s.isCollapsed);
                if (!hasSel) { let hit = epubHit(e); if (hit) { openHlMenu(hit.id); return; } }
                handleTap(x, hasSel);
            });
            
            getBookAnnotations().forEach(an => { if (an.type === 'highlight' || an.type === 'note') paintEpubHl(an); });
            try { await currentRendition.display(startCfi || undefined); } catch (e) { await currentRendition.display(); }
        }

        function updateEpubProgressUI(location) {
            if (!currentReaderInstance || !currentRendition || !currentReaderInstance.locations.total) return;
            let loc = location;
            if (!loc) {
                try {
                    if (typeof currentRendition.currentLocation === 'function') {
                        loc = currentRendition.currentLocation();
                    }
                } catch (e) {}
            }
            if (!loc || !loc.start || !loc.start.cfi) return;

            try {
                const percent = currentReaderInstance.locations.percentageFromCfi(loc.start.cfi);
                const p = Math.round(percent * 100); recordProgress(p, { lastCfi: loc.start.cfi });
                const pos = currentReaderInstance.locations.locationFromCfi(loc.start.cfi);
                const total = currentReaderInstance.locations.total;

                document.getElementById('scrubber-text').innerText = `POSIÇÃO ${pos} DE ${total} • ${p}%`;
                document.getElementById('min-footer-right').innerText = `${p}%`;
                document.getElementById('min-footer-left').innerText = `POSIÇÃO ${pos}`;
                document.getElementById('reader-scrubber').value = pos;
            } catch (e) {}
        }
