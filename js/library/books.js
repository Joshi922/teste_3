        window.renderCurrentView = function() { libDirty = true;
            const noRes = document.getElementById('no-results'); noRes.classList.add('hidden'); noRes.classList.remove('flex');
            views.collectionsGrid.classList.add('hidden'); views.booksGrid.classList.add('hidden'); views.booksList.classList.add('hidden'); views.headerMain.classList.remove('hidden'); views.headerInner.classList.add('hidden'); views.searchBar.classList.remove('hidden'); views.emptyState.classList.add('hidden');
            try { renderFilterBar(); } catch (e) {}
            if (library.length === 0) { views.emptyState.classList.remove('hidden'); return; }
            if (currentActiveCollection !== null) {
                views.headerMain.classList.add('hidden'); views.searchBar.classList.add('hidden'); views.headerInner.classList.remove('hidden');
                document.getElementById('inner-collection-title').textContent = currentActiveCollection === "" ? "Livres no Éter (Sem Coleção)" : currentActiveCollection;
                const filtered = sortBooks(library.filter(b => (b.collection || '').trim() === currentActiveCollection && matchBook(b)));
                if (filtered.length === 0) { currentActiveCollection = null; renderCurrentView(); return; }
                views.booksGrid.classList.remove('hidden'); renderBooksGrid(filtered); return;
            }
            const filtering = activeFilters.length > 0, books = visibleBooks();
            if ((filtering || searchQuery) && books.length === 0) {
                document.getElementById('main-header-title').innerHTML = '<i class="ph-fill ph-funnel mr-2 text-ctonia-luminous"></i> RESULTADOS';
                noRes.classList.remove('hidden'); noRes.classList.add('flex'); return;
            }
            if (filtering) {
                document.getElementById('main-header-title').innerHTML = '<i class="ph-fill ph-funnel mr-2 text-ctonia-luminous"></i> RESULTADOS';
                if (filterView === 'cards') { views.collectionsGrid.classList.remove('hidden'); renderCollectionsGrid(books); }
                else if (currentDisplayMode === 'list') { views.booksList.classList.remove('hidden'); renderBooksList(books); }
                else { views.booksGrid.classList.remove('hidden'); renderBooksGrid(books); }
                return;
            }
            const mode = (searchQuery && currentDisplayMode === 'collections') ? 'grid' : currentDisplayMode;
            if (mode === 'collections') { document.getElementById('main-header-title').innerHTML = '<i class="ph-fill ph-squares-four mr-2 text-ctonia-luminous"></i> COLEÇÕES'; views.collectionsGrid.classList.remove('hidden'); renderCollectionsGrid(library); }
            else if (mode === 'grid') { document.getElementById('main-header-title').innerHTML = '<i class="ph-fill ph-grid-four mr-2 text-ctonia-luminous"></i> BIBLIOTECA'; views.booksGrid.classList.remove('hidden'); renderBooksGrid(books); }
            else if (mode === 'list') { document.getElementById('main-header-title').innerHTML = '<i class="ph-fill ph-list-dashes mr-2 text-ctonia-luminous"></i> BIBLIOTECA'; views.booksList.classList.remove('hidden'); renderBooksList(books); }
        }

        function renderCollectionsGrid(src) {
            views.collectionsGrid.innerHTML = ''; const collections = {}; const uncollected = [];
            sortBooks(src || library).forEach(b => { const c = (b.collection || '').trim(); if (c) { if(!collections[c]) collections[c]=[]; collections[c].push(b); } else uncollected.push(b); });
            collectionNames(Object.keys(collections)).forEach(name => {
                const card = document.createElement('div'); card.className = 'aspect-square bg-ctonia-indigo border border-ctonia-darkmint flex flex-col cursor-pointer hover:shadow-[0_0_15px_rgba(123,240,195,0.3)] hover:border-ctonia-luminous transition-all rounded-lg overflow-hidden'; card.onclick = () => { currentActiveCollection = name; renderCurrentView(); };
                const cGrid = document.createElement('div'); cGrid.className = 'h-[75%] collection-covers-grid p-[1px]';
                for(let i=0; i<4; i++) {
                    const slot = document.createElement('div'); slot.className = 'cover-slot';
                    if (collections[name][i]) { slot.innerHTML = collections[name][i].coverUrl ? `<img src="${collections[name][i].coverUrl}">` : `<div class="text-[10px] text-ctonia-nightsky font-serif font-bold text-center p-1">${escapeHtml(collections[name][i].title.substring(0,10))}...</div>`; } else slot.style.backgroundColor = '#1B132B'; cGrid.appendChild(slot);
                }
                card.innerHTML = `<div class="h-[25%] flex justify-between items-center px-3 bg-ctonia-indigo border-t border-ctonia-darkmint"><span class="text-xs font-bold truncate text-white flex-1 pr-2 font-serif tracking-wider">${escapeHtml(name)}</span><span class="text-[10px] text-ctonia-luminous font-bold bg-ctonia-abyssal px-2 py-0.5 rounded-full border border-ctonia-mystic">${collections[name].length}</span></div>`; card.prepend(cGrid); views.collectionsGrid.appendChild(card);
            });
            if (uncollected.length > 0) {
                const card = document.createElement('div'); card.className = 'aspect-square bg-ctonia-indigo border border-ctonia-darkmint flex flex-col items-center justify-center cursor-pointer hover:shadow-[0_0_15px_rgba(232,90,113,0.3)] hover:border-ctonia-magenta transition-all rounded-lg'; card.onclick = () => { currentActiveCollection = ""; renderCurrentView(); };
                card.innerHTML = `<div class="flex flex-col items-center justify-center pt-2"><span class="text-5xl font-serif text-ctonia-magenta mb-2 drop-shadow-[0_0_5px_#E85A71]">${uncollected.length}</span><span class="text-xs text-white font-bold tracking-wider uppercase font-body text-center px-2">Livres no Éter</span></div>`; views.collectionsGrid.appendChild(card);
            }
        }

        function renderBooksGrid(books) {
            views.booksGrid.innerHTML = '';
            books.forEach(book => {
                const el = document.createElement('div'); el.className = 'flex flex-col cursor-pointer group relative'; el.onclick = () => openReader(book.id); el.oncontextmenu = (e) => showContextMenu(e, book.id);
                el.innerHTML = `<div class="aspect-[2/3] w-full bg-ctonia-abyssal border border-ctonia-darkmint overflow-hidden relative shadow-sm group-hover:shadow-[0_0_15px_rgba(123,240,195,0.4)] group-hover:border-ctonia-luminous transition-all rounded-lg">${book.coverUrl ? `<img src="${book.coverUrl}" class="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity">` : `<div class="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-gradient-to-b from-ctonia-indigo to-ctonia-abyssal"><i class="ph-fill ph-file-text text-4xl text-ctonia-mystic mb-2 drop-shadow-md"></i><span class="font-serif text-[11px] text-white font-bold line-clamp-4 leading-relaxed">${escapeHtml(book.title)}</span></div>`}</div><div class="mt-3 px-1"><p class="text-[13px] font-bold text-white line-clamp-2 leading-tight group-hover:text-ctonia-luminous transition-colors font-serif tracking-wide">${escapeHtml(book.title)}</p><p class="text-[10px] text-ctonia-salmon mt-1 line-clamp-1 uppercase tracking-wider font-bold">${escapeHtml(book.author)}</p>${metaLine(book)}</div>`; views.booksGrid.appendChild(el);
            });
        }

        function renderBooksList(books) {
            views.booksList.innerHTML = '';
            books.forEach(book => {
                const item = document.createElement('div'); item.className = 'flex py-4 px-2 border-b border-ctonia-indigo items-center cursor-pointer group hover:bg-ctonia-indigo/50 transition-colors rounded-lg'; item.onclick = () => openReader(book.id); item.oncontextmenu = (e) => showContextMenu(e, book.id);
                item.innerHTML = `<div class="w-[56px] shrink-0 shadow-[0_0_10px_rgba(0,0,0,0.5)] border border-ctonia-darkmint aspect-[2/3] bg-ctonia-abyssal flex items-center justify-center overflow-hidden rounded-md group-hover:border-ctonia-luminous transition-colors">${book.coverUrl ? `<img src="${book.coverUrl}" class="w-full h-full object-cover opacity-90">` : `<i class="ph-fill ph-file-text text-3xl text-ctonia-mystic"></i>`}</div><div class="flex-1 ml-4 min-w-0 flex flex-col justify-center"><h3 class="text-[15px] font-bold text-white leading-tight truncate font-serif tracking-wide group-hover:text-ctonia-luminous transition-colors">${escapeHtml(book.title)}</h3><p class="text-[11px] text-ctonia-salmon uppercase mt-1.5 truncate font-bold tracking-wider">${escapeHtml(book.author)}</p>${metaLine(book)}</div><div class="ml-3 pr-2 shrink-0 flex items-center justify-center"><i class="ph-bold ph-caret-right text-xl text-ctonia-darkmint group-hover:text-ctonia-luminous transition-colors"></i></div>`; views.booksList.appendChild(item);
            });
        }

        window.backToCollections = function() { currentActiveCollection = null; renderCurrentView(); }
        window.openDisplayMenu = function() { views.displayMenu.classList.remove('hidden'); requestAnimationFrame(() => views.displayMenu.classList.remove('opacity-0')); updateDisplayMenuUI(); }
        window.closeDisplayMenu = function() { views.displayMenu.classList.add('opacity-0'); setTimeout(() => views.displayMenu.classList.add('hidden'), 300); }
        window.setDisplayMode = function(mode) { currentDisplayMode = mode; currentActiveCollection = null; updateDisplayMenuUI(); renderCurrentView(); setTimeout(closeDisplayMenu, 150); }
        function updateDisplayMenuUI() { document.getElementById('check-grid').classList.toggle('hidden', currentDisplayMode !== 'grid'); document.getElementById('check-list').classList.toggle('hidden', currentDisplayMode !== 'list'); document.getElementById('check-collections').classList.toggle('hidden', currentDisplayMode !== 'collections'); renderSortOptions(); }
        
        window.showContextMenu = function(e, bookId) { e.preventDefault(); activeBookId = bookId; const m = document.getElementById('context-menu'); m.style.left = `${Math.min(e.pageX, window.innerWidth-230)}px`; m.style.top = `${Math.min(e.pageY, window.innerHeight-110)}px`; m.classList.remove('hidden'); }
        document.addEventListener('click', (ev) => { document.getElementById('context-menu').classList.add('hidden'); if (!ev.target.closest('#annotation-action-menu') && !ev.target.closest('[onclick*="openAnnotationMenu"]')) document.getElementById('annotation-action-menu').classList.add('hidden'); });
        
        window.openEditModal = function() { const b = library.find(x=>x.id===activeBookId); if(b){ const set = (id, v) => { document.getElementById(id).value = v || ''; }; set('edit-title', b.title); set('edit-author', b.author); set('edit-collection', b.collection); set('edit-genre', b.genre); set('edit-subgenre', b.subgenre); set('edit-series', b.series); set('edit-volume', b.volume); document.getElementById('edit-modal-backdrop').classList.remove('hidden'); } }
        window.closeEditModal = function() { document.getElementById('edit-modal-backdrop').classList.add('hidden'); activeBookId=null; }
        window.saveBookProperties = function() { const b = library.find(x=>x.id===activeBookId); if(b){ const get = id => document.getElementById(id).value.trim(); b.title=document.getElementById('edit-title').value; b.author=document.getElementById('edit-author').value; b.collection=get('edit-collection'); b.genre=get('edit-genre'); b.subgenre=get('edit-subgenre'); b.series=get('edit-series'); b.volume=get('edit-volume'); closeEditModal(); renderCurrentView(); } }
        window.deleteBook = function() { const id = activeBookId; const bk = library.find(b => b.id === id); library = library.filter(b => b.id !== id); try { DB.del('books', id); DB.del('files', id); } catch (e) {} try { sy().deleted[id] = Date.now(); if (bk && bk.cloudFileId && hasToken()) driveApi('https://www.googleapis.com/drive/v3/files/' + bk.cloudFileId, { method: 'DELETE' }).catch(() => {}); } catch (e) {} libDirty = true; renderCurrentView(); }
