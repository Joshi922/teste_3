                window.nextPage = async function() { clearMarkers(); 
            if (isPdfBook && pageFlip) { try { pageFlip.flipNext(); } catch (e) {} bookSyncSoon(); return; }
            setTimeout(refreshMarkers, 700);
            if(isPdfMode && pdfDocument && !isPdfContinuous && pdfCurrentPage < pdfDocument.numPages) {
                await apply3DFlip(1, async () => { await renderPdfPage(pdfCurrentPage + 1); });
            } else if(currentRendition && !readerSettings.scroll) {
                await apply3DFlip(1, async () => { await currentRendition.next(); });
            }
        }

        window.prevPage = async function() { clearMarkers(); 
            if (isPdfBook && pageFlip) { try { pageFlip.flipPrev(); } catch (e) {} bookSyncSoon(); return; }
            setTimeout(refreshMarkers, 700);
            if(isPdfMode && pdfDocument && !isPdfContinuous && pdfCurrentPage > 1) {
                await apply3DFlip(-1, async () => { await renderPdfPage(pdfCurrentPage - 1); });
            } else if(currentRendition && !readerSettings.scroll) {
                await apply3DFlip(-1, async () => { await currentRendition.prev(); });
            } 
        }

        function handleTap(x, hasSelection) {
            if (hasSelection) return; 
            if (!document.getElementById('hl-edit-menu').classList.contains('hidden')) { closeHlMenu(); return; } 
            if (!document.getElementById('selection-toolbar').classList.contains('hidden')) { closeSelection(); return; } 
            
            const b = views.viewer.getBoundingClientRect(); const relX = x - b.left; const w = b.width; 
            if (!readerSettings.scroll) {
                if (relX < w * 0.25) prevPage(); else if (relX > w * 0.75) nextPage(); else toggleReaderUI(); 
            } else toggleReaderUI();
        }
        
        views.viewer.addEventListener('click', e => {
            const sel = window.getSelection(); const hasSel = !!(sel && !sel.isCollapsed && sel.toString().trim());
            if (!hasSel) { let hit = null; if(isPdfMode) hit = pdfHit(e); else hit = epubHit(e); if (hit) { openHlMenu(hit.id); return; } }
            handleTap(e.clientX, hasSel);
        });

        window.onReaderKey = function(e) { if(views.reader.classList.contains('hidden')) return; if (e.key === 'ArrowRight' || e.key === 'PageDown') nextPage(); if (e.key === 'ArrowLeft' || e.key === 'PageUp') prevPage(); }
        document.addEventListener('keyup', onReaderKey);

        window.onScrubberChange = function(val) { clearMarkers(); setTimeout(refreshMarkers, 700);
            if(isPdfMode) { if(isPdfContinuous) document.getElementById(`pdf-page-wrapper-${val}`).scrollIntoView(); else if(isPdfBook) bookGoto(parseInt(val), true); else renderPdfPage(parseInt(val)); }
            else if(currentReaderInstance && currentReaderInstance.locations.total) { currentRendition.display(currentReaderInstance.locations.cfiFromLocation(val)); }
        }

        async function epubGoto(href) { try { await currentRendition.display(href); return; } catch (e) {} const [path, hash] = href.split('#'), base = path.split('/').pop(); const sec = currentReaderInstance.spine.spineItems.find(x => x.href === path || x.href.split('/').pop() === base); if (sec) { try { await currentRendition.display(sec.href + (hash ? '#' + hash : '')); } catch (e) {} } }
        function buildEpubToc() {
            const list = document.getElementById('toc-list'); const addItem = (label, href, depth) => { const d = document.createElement('div'); d.className = 'cursor-pointer py-3 border-b border-ctonia-indigo hover:text-ctonia-luminous transition-colors font-bold text-sm tracking-wide'; d.style.paddingLeft = (depth * 16) + 'px'; d.textContent = (label || '').trim() || 'Sem título'; d.onclick = () => { epubGoto(href); togglePanel('toc-panel'); }; list.appendChild(d); };
            const fallback = () => { list.innerHTML = ''; currentReaderInstance.spine.spineItems.forEach((it, i) => addItem('Seção ' + (i + 1), it.href, 0)); };
            currentReaderInstance.loaded.navigation.then(nav => { list.innerHTML = ''; const walk = (items, depth) => items.forEach(it => { addItem(it.label, it.href, depth); if (it.subitems && it.subitems.length) walk(it.subitems, depth + 1); }); if (nav.toc && nav.toc.length) walk(nav.toc, 0); else fallback(); }).catch(() => currentReaderInstance.ready.then(fallback));
        }
