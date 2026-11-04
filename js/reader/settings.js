        window.toggleReaderUI = function() { views.reader.classList.toggle('reader-ui-hidden'); }
        window.togglePanel = function(id) { const p = document.getElementById(id); if(p.classList.contains('open')) p.classList.remove('open'); else { document.querySelectorAll('.slide-panel, .slide-panel-right').forEach(el => el.classList.remove('open')); p.classList.add('open'); } }

        window.updateSet = function(key, val) { 
            const flowChanged = (key === 'scroll' && readerSettings.scroll !== val) || (key === 'anim3d' && isPdfMode && readerSettings.anim3d !== val);
            readerSettings[key] = val; 
            if(key === 'scroll' && val === true) { document.getElementById('setting-anim3d').checked = false; readerSettings.anim3d = false; }
            applySettings(flowChanged); 
        }
        
        window.switchSettingsTab = function(tab) {
            ['fonte', 'layout', 'mais'].forEach(t => {
                document.getElementById(`tab-${t}`).classList.toggle('hidden', t !== tab);
                document.getElementById(`tab-btn-${t}`).classList.toggle('border-ctonia-luminous', t === tab);
                document.getElementById(`tab-btn-${t}`).classList.toggle('text-ctonia-luminous', t === tab);
                document.getElementById(`tab-btn-${t}`).classList.toggle('bg-ctonia-indigo/50', t === tab);
                document.getElementById(`tab-btn-${t}`).classList.toggle('border-transparent', t !== tab);
                document.getElementById(`tab-btn-${t}`).classList.toggle('text-ctonia-nightsky', t !== tab);
                document.getElementById(`tab-btn-${t}`).classList.toggle('bg-transparent', t !== tab);
            });
        }
        
        window.openSettingsSheet = function() {
            document.getElementById('settings-sheet').classList.add('open'); document.getElementById('settings-sheet-backdrop').classList.remove('hidden');
            document.getElementById('setting-font').value = readerSettings.font; document.getElementById('setting-size').value = readerSettings.size;
            document.getElementById('setting-scroll').checked = readerSettings.scroll; document.getElementById('setting-progress').value = readerSettings.progress; document.getElementById('setting-anim3d').checked = readerSettings.anim3d;
            updateSettingsUI();
        }
        window.closeSettingsSheet = function() { document.getElementById('settings-sheet').classList.remove('open'); document.getElementById('settings-sheet-backdrop').classList.add('hidden'); }
        
        function updateSettingsUI() {
            document.querySelectorAll('.theme-btn').forEach(b => { b.classList.toggle('border-ctonia-luminous', b.dataset.theme === readerSettings.theme); b.classList.toggle('border-transparent', b.dataset.theme !== readerSettings.theme); if(b.dataset.theme === 'light') b.classList.toggle('border-ctonia-mystic', b.dataset.theme !== readerSettings.theme); });
            document.querySelectorAll('.margin-btn').forEach(b => { b.classList.toggle('bg-ctonia-mystic/30', b.dataset.margin === readerSettings.margin); b.classList.toggle('border-ctonia-luminous', b.dataset.margin === readerSettings.margin); });
            document.querySelectorAll('.align-btn').forEach(b => { b.classList.toggle('bg-ctonia-mystic/30', b.dataset.align === readerSettings.align); b.classList.toggle('border-ctonia-luminous', b.dataset.align === readerSettings.align); });
        }

        async function applySettings(flowChanged = false) {
            document.body.classList.remove('theme-dark', 'theme-sepia', 'theme-light');
            if (readerSettings.theme === 'dark') document.body.classList.add('theme-dark'); 
            else if (readerSettings.theme === 'sepia') document.body.classList.add('theme-sepia');
            else if (readerSettings.theme === 'light') document.body.classList.add('theme-light');
            
            const disp = readerSettings.progress === 'hidden' ? 'none' : '';
            document.getElementById('min-footer-right').style.display = disp; document.getElementById('min-footer-left').style.display = disp; document.getElementById('scrubber-text').style.display = disp;

            updateSettingsUI();

            if (isPdfMode) { if (flowChanged) await reloadReader(); return; }
            if (!currentRendition) return;

            if (flowChanged) { await reloadReader(); return; }

            applySettingsToRendition();
        }

        function applySettingsToRendition() {
            if(!currentRendition) return;
            let pad = '0 5%'; if (readerSettings.margin === 'narrow') pad = '0 2%'; else if (readerSettings.margin === 'wide') pad = '0 15%';
            currentRendition.themes.override('padding', pad);
            currentRendition.themes.override('text-align', readerSettings.align);
            currentRendition.themes.font(readerSettings.font);
            currentRendition.themes.fontSize((12 + (readerSettings.size * 2)) + 'px');
            currentRendition.themes.select(readerSettings.theme);
            
            if (currentRendition.manager) {
                try {
                    const loc = currentRendition.currentLocation();
                    if (loc && loc.start) setTimeout(() => currentRendition.display(loc.start.cfi), 50);
                } catch(e) {}
            }
        }

        async function reloadReader() {
            const id = activeBookId; let cfiOrPage = null;
            if (isPdfMode) cfiOrPage = pdfCurrentPage; 
            else {
                try {
                    if (currentRendition && typeof currentRendition.currentLocation === 'function') {
                        const loc = currentRendition.currentLocation();
                        if (loc && loc.start) cfiOrPage = loc.start.cfi;
                    }
                } catch(e) {}
            }
            try { if (currentRendition) currentRendition.destroy(); if (currentReaderInstance) currentReaderInstance.destroy(); } catch(e){}
            if(pdfObserver) { pdfObserver.disconnect(); pdfObserver = null; }
            views.viewer.innerHTML = ''; document.getElementById('marker-layer').innerHTML = '';
            const book = library.find(b => b.id === id);
            try { if (isPdfMode) await initPdfReader(book, cfiOrPage); else await initEpubReader(book, cfiOrPage); } catch(e) { console.error(e); }
        }
