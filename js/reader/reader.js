        window.openReader = async function(id) { progressLocked = true;
            activeBookId = id; const book = library.find(b => b.id === id); if (!book) return;
            views.main.classList.add('hidden'); views.reader.classList.remove('hidden'); views.reader.classList.remove('reader-ui-hidden');
            document.getElementById('reader-book-title').innerText = book.title; views.viewer.innerHTML = (book.driveId && !book.file) ? '<div class="p-10 text-center text-ctonia-salmon text-sm font-bold animate-pulse mt-20"><i class="ph-fill ph-cloud-arrow-down text-4xl mb-3 block text-ctonia-luminous"></i> Invocando da Nuvem Abissal...</div>' : '';
            document.getElementById('scrubber-text').innerText = "CALCULANDO..."; document.getElementById('min-footer-left').innerText = "Invocando..."; document.getElementById('bookmark-icon').setAttribute("fill", "none");
            
            await new Promise(resolve => setTimeout(resolve, 50)); 
            document.getElementById('toc-list').innerHTML = ''; document.getElementById('search-results').innerHTML = '';
            pdfTextCache = []; pendingPdfPage = null; isRenderingPage = false; pdfSearchTerm = ''; currentSelectionRects = null;
            
            applySettings();

            try {
                if (book.type === 'pdf') { isPdfMode = true; await initPdfReader(book, book.lastPage || 1); }
                else if (book.type === 'epub') { isPdfMode = false; await initEpubReader(book, book.lastCfi || null); } setTimeout(() => { progressLocked = false; }, 1500);
                updatePinFab();
            } catch (err) { progressLocked = false; views.viewer.innerHTML = `<div class="p-10 text-center text-white flex flex-col items-center justify-center h-full"><i class="ph-fill ph-warning-circle text-6xl text-ctonia-magenta mb-4 drop-shadow-[0_0_10px_#E85A71]"></i><p class="font-bold text-xl font-serif tracking-widest">MAGIA ROMPIDA</p><p class="text-sm mt-2 max-w-sm text-ctonia-salmon">${escapeHtml(err && err.message || err)}</p><button onclick="closeReader()" class="mt-6 px-6 py-2 border border-ctonia-luminous rounded-full text-ctonia-luminous font-bold hover:bg-ctonia-luminous hover:text-ctonia-abyssal transition-colors">Retornar</button></div>`; }
        }

        window.closeReader = function() { libDirty = true; flushLibrary(); progressLocked = true; setTimeout(renderCurrentView, 0);
            views.reader.classList.add('hidden');
            views.main.classList.remove('hidden');
            document.querySelectorAll('.slide-panel, .slide-panel-right').forEach(el => el.classList.remove('open'));
            document.getElementById('selection-toolbar').classList.add('hidden');

            try { if (currentRendition) currentRendition.destroy(); } catch (e) {}
            try { if (currentReaderInstance) currentReaderInstance.destroy(); } catch (e) {}
            if (pdfObserver) { pdfObserver.disconnect(); pdfObserver = null; }
            bookTeardown();

            currentRendition = null; currentReaderInstance = null; pdfDocument = null; pdfTextCache = []; pdfJumpStack = []; hidePdfBackBtn(); pdfLastSize = null; pdfPendingTop = null;
            isPdfMode = false; pdfSearchTerm = ''; isPdfContinuous = false;

            views.viewer.innerHTML = '';
            document.getElementById('marker-layer').innerHTML = '';
            document.getElementById('pin-fab').classList.add('hidden');
            closeHlMenu(); closePinSheet();
        }
