        function capturePdfSelection() {
            if (!isPdfMode || !pdfDocument) return; const sel = window.getSelection(); if (!sel || sel.isCollapsed || !sel.rangeCount) return;
            const range = sel.getRangeAt(0); let tl = document.getElementById('pdf-text-layer'); let pgNum = pdfCurrentPage;
            if(isPdfContinuous || isPdfBook) {
                const wrapper = range.commonAncestorContainer.parentElement ? range.commonAncestorContainer.parentElement.closest('.pdf-page-wrapper, .pdf-bk-inner') : null;
                if(wrapper) { pgNum = parseInt(wrapper.dataset.page); tl = document.getElementById(`pdf-text-layer-${pgNum}`); }
            }
            if (!tl || !tl.contains(range.commonAncestorContainer)) return;
            const text = sel.toString().replace(/\s+/g, ' ').trim(); if (!text) return; const box = tl.getBoundingClientRect();
            currentSelectionRects = Array.from(range.getClientRects()).filter(r => r.width > 1 && r.height > 1 && r.height < box.height * 0.1).map(r => ({ x: (r.left - box.left) / box.width, y: (r.top - box.top) / box.height, w: r.width / box.width, h: r.height / box.height }));
            currentSelectionText = text; pdfCurrentPage = pgNum; currentSelectionCfi = `page-${pgNum}`; closeHlMenu(); document.getElementById('selection-toolbar').classList.remove('hidden');
        }
        let selTimer; document.addEventListener('selectionchange', () => { clearTimeout(selTimer); selTimer = setTimeout(capturePdfSelection, 300); });
        
        window.closeSelection = function() {
            document.getElementById('selection-toolbar').classList.add('hidden'); document.getElementById('hl-color-popup').classList.add('hidden');
            try { window.getSelection().removeAllRanges(); } catch (e) {}
            if (currentRendition && currentRendition.getContents) { try { currentRendition.getContents().forEach(c => c.window.getSelection().removeAllRanges()); } catch (e) {} }
            currentSelectionCfi = null; currentSelectionText = ""; currentSelectionRects = null; editingAnnotationId = null;
        }

        function pdfExtra() { return isPdfMode ? { page: pdfCurrentPage, rects: currentSelectionRects || [] } : {}; }
        function paintAnnotation(an) { if (!an) return; if (isPdfMode) drawPdfHighlights(an.page, (isPdfContinuous || isPdfBook) ? `pdf-hl-layer-${an.page}` : 'pdf-hl-layer'); else paintEpubHl(an); }
        window.applyHighlight = function(color) { if (!currentSelectionCfi || !currentSelectionText) return; paintAnnotation(saveAnnotation('highlight', currentSelectionCfi, currentSelectionText, color, "", pdfExtra())); closeSelection(); }
        window.openNoteEditor = function(noteId = null) {
            document.getElementById('selection-toolbar').classList.add('hidden'); const textarea = document.getElementById('note-textarea');
            editingAnnotationId = noteId; if(noteId) { const b = library.find(x => x.id === activeBookId); const an = b.annotations.find(x => x.id === noteId); textarea.value = an.noteText || ""; } else textarea.value = "";
            document.getElementById('note-modal').classList.remove('hidden');
        }
        window.closeNoteEditor = function() { document.getElementById('note-modal').classList.add('hidden'); closeSelection(); }
        window.saveNote = function() {
            const text = document.getElementById('note-textarea').value; if(text.trim() === "") return closeNoteEditor();
            const b = library.find(x => x.id === activeBookId);
            if(editingAnnotationId) { const an = b.annotations.find(x => x.id === editingAnnotationId); if(an) { an.noteText = text; an.type = 'note'; } libDirty = true; refreshMarkers(); renderNotesList(); } 
            else { paintAnnotation(saveAnnotation('note', currentSelectionCfi, currentSelectionText, lastHlColor, text, pdfExtra())); refreshMarkers(); }
            closeNoteEditor();
        }
        window.copySelection = function() { navigator.clipboard.writeText(currentSelectionText).then(() => closeSelection()); }

        function saveAnnotation(type, cfi, text, color, noteText, extra = {}) {
            const b = library.find(x => x.id === activeBookId); if (!b) return null;
            let posStr = "No Vazio"; let sort = 0;
            if (isPdfMode) { const pg = parseInt(String(cfi).replace('page-', '')) || 1; posStr = `Página ${pg}`; sort = pg + ((extra.rects && extra.rects[0]) ? extra.rects[0].y : 0); }
            else if (currentReaderInstance && currentReaderInstance.locations.total) { const l = currentReaderInstance.locations.locationFromCfi(cfi); if (l !== undefined && l !== null) { posStr = l; sort = Number(l) || 0; } }
            const an = { id: Date.now().toString() + Math.random().toString(36).slice(2, 5), type, cfi, text, color, noteText, position: posStr, sort, date: Date.now(), ...extra };
            b.annotations.push(an); document.getElementById('notes-badge').classList.remove('hidden'); return an;
        }
