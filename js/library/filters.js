        /* ---------- Filtros e busca ---------- */
        const splitList = s => String(s || '').split(/[,;]/).map(x => x.trim()).filter(Boolean);
        const one = s => { const t = String(s || '').trim(); return t ? [t] : []; };
        const FACETS = [
            { id: 'genre', label: 'Gênero', get: b => splitList(b.genre) },
            { id: 'subgenre', label: 'Subgênero', get: b => splitList(b.subgenre) },
            { id: 'series', label: 'Série', get: b => one(b.series) },
            { id: 'author', label: 'Autor', get: b => one(b.author).filter(a => normTxt(a) !== 'desconhecido') },
            { id: 'collection', label: 'Coleção', get: b => one(b.collection) }
        ];
        const FACET = Object.fromEntries(FACETS.map(f => [f.id, f]));
        let activeFilters = [], filterView = 'cards';
        const hasFilter = (f, v) => { const n = normTxt(v); return activeFilters.some(x => x.f === f && normTxt(x.v) === n); };
        function toggleFilter(f, v) {
            if (hasFilter(f, v)) { const n = normTxt(v); activeFilters = activeFilters.filter(x => !(x.f === f && normTxt(x.v) === n)); }
            else activeFilters.push({ f, v });
            currentActiveCollection = null;
        }
        // Mesma faceta: basta um valor (OU). Facetas diferentes: todas precisam bater (E).
        function matchBook(b) {
            if (searchQuery && !normTxt([b.title, b.author, b.collection, b.series, b.genre, b.subgenre].join(' ')).includes(searchQuery)) return false;
            const by = {}; activeFilters.forEach(x => (by[x.f] = by[x.f] || []).push(normTxt(x.v)));
            return Object.keys(by).every(f => { const vals = FACET[f].get(b).map(normTxt); return by[f].some(v => vals.includes(v)); });
        }
        function visibleBooks() { return sortBooks(library.filter(matchBook)); }
        function facetIndex() {
            const idx = {}; FACETS.forEach(f => idx[f.id] = new Map());
            library.forEach(b => FACETS.forEach(f => f.get(b).forEach(v => { const n = normTxt(v), e = idx[f.id].get(n); if (e) e.count++; else idx[f.id].set(n, { label: v, count: 1 }); })));
            return idx;
        }
        function renderFilterBar() {
            const bar = document.getElementById('filter-bar'); if (!bar) return;
            if (!activeFilters.length) { bar.classList.add('hidden'); bar.innerHTML = ''; return; }
            bar.classList.remove('hidden');
            const n = visibleBooks().length;
            bar.innerHTML = activeFilters.map(x => `<button type="button" class="fchip on" data-f="${x.f}" data-v="${escapeHtml(x.v)}" title="Remover filtro"><span class="fk">${FACET[x.f].label}</span>${escapeHtml(x.v)}<i class="ph-bold ph-x"></i></button>`).join('')
                + `<span class="fmeta">${n} livro${n === 1 ? '' : 's'}</span><span class="fseg"><button type="button" data-view="cards" class="${filterView === 'cards' ? 'on' : ''}">Cards</button><button type="button" data-view="books" class="${filterView === 'books' ? 'on' : ''}">Livros</button></span><button type="button" class="flink" data-act="clear">Limpar</button>`;
        }
        function renderFilterPanel() {
            const p = document.getElementById('filter-panel'); if (!p || p.classList.contains('hidden')) return;
            const prev = p.querySelector('.fp-body'), st = prev ? prev.scrollTop : 0;
            const idx = facetIndex(), raw = (document.getElementById('library-search').value || '').trim(), q = normTxt(raw);
            const chip = (f, e, pre) => `<button type="button" class="fchip${hasFilter(f.id, e.label) ? ' on' : ''}" data-f="${f.id}" data-v="${escapeHtml(e.label)}">${pre ? `<span class="fk">${f.label}</span>` : ''}${escapeHtml(e.label)}<small>${e.count}</small></button>`;
            let body = '';
            if (q) {
                const hits = [];
                FACETS.forEach(f => idx[f.id].forEach((e, n) => { if (n.includes(q)) hits.push({ f, e }); }));
                hits.sort((a, b) => b.e.count - a.e.count);
                body = hits.length ? `<div class="fp-chips">${hits.slice(0, 40).map(h => chip(h.f, h.e, true)).join('')}</div>` : `<p class="fp-empty">Nenhum gênero, série, autor ou coleção com “${escapeHtml(raw)}”. A busca por título continua ativa.</p>`;
            } else {
                body = FACETS.map(f => { const es = [...idx[f.id].values()].sort((a, b) => cmpTxt(a.label, b.label)); return es.length ? `<section class="fp-group"><h4>${f.label}</h4><div class="fp-chips">${es.map(e => chip(f, e, false)).join('')}</div></section>` : ''; }).join('')
                    || '<p class="fp-empty">Ainda não há gênero, série ou subgênero nos livros. Preencha na Forja (Metadados do PDF) ou em Alterar Essência.</p>';
            }
            const n = visibleBooks().length;
            p.innerHTML = `<div class="fp-body">${body}</div><div class="fp-foot"><button type="button" data-act="clear"${activeFilters.length ? '' : ' disabled'}>Limpar filtros</button><button type="button" data-act="done" class="primary">Ver ${n} livro${n === 1 ? '' : 's'}</button></div>`;
            const nb = p.querySelector('.fp-body'); if (nb) nb.scrollTop = st;
        }
        function refreshSearchUI() { renderFilterBar(); renderFilterPanel(); renderCurrentView(); }
        window.openFilterPanel = () => { if (!library.length) return; const p = document.getElementById('filter-panel'); if (p.classList.contains('hidden')) { p.classList.remove('hidden'); } renderFilterPanel(); };
        window.closeFilterPanel = () => { document.getElementById('filter-panel').classList.add('hidden'); document.getElementById('library-search').blur(); };
        window.onLibrarySearch = v => { searchQuery = normTxt(v.trim()); currentActiveCollection = null; renderCurrentView(); renderFilterPanel(); };
        (function wireFilters() {
            const sc = document.getElementById('search-container');
            sc.addEventListener('click', e => {
                const c = e.target.closest('[data-f]');
                if (c) {
                    const inp = document.getElementById('library-search');
                    if (c.closest('#filter-panel') && inp.value.trim()) { inp.value = ''; searchQuery = ''; }
                    toggleFilter(c.dataset.f, c.dataset.v); refreshSearchUI(); return;
                }
                const v = e.target.closest('[data-view]'); if (v) { filterView = v.dataset.view; renderCurrentView(); return; }
                const a = e.target.closest('[data-act]');
                if (a) { if (a.dataset.act === 'clear') { activeFilters = []; currentActiveCollection = null; refreshSearchUI(); } else closeFilterPanel(); }
            });
            // composedPath: o chip clicado é recriado ao atualizar, então event.target já saiu do DOM
            document.addEventListener('click', e => { if (!e.composedPath().includes(sc)) document.getElementById('filter-panel').classList.add('hidden'); });
            document.addEventListener('keydown', e => { if (e.key === 'Escape') closeFilterPanel(); });
        })();

        function isStarted(b) { const t = b.readSeconds || 0; return t >= 120 || ((b.progress || 0) >= 3 && t >= 30); }
        // Card: volume e estado de leitura (Lido, % lido ou Não lido)
        function metaLine(b) {
            const p = []; if (b.volume) p.push('Vol. ' + escapeHtml(b.volume));
            if ((b.progress || 0) >= 97) p.push('<span class="text-ctonia-luminous">Lido</span>');
            else if (isStarted(b) && b.progress) p.push('<span class="text-ctonia-luminous">' + Math.round(b.progress) + '%</span>');
            else if (b.finishedAt) p.push('<span class="text-ctonia-luminous">Lido</span>');
            else p.push('Não lido');
            return `<p class="text-[11px] text-ctonia-nightsky mt-1 flex items-center gap-1 font-bold tracking-wider">${p.join(' <span class="text-ctonia-darkmint">•</span> ')}</p>`;
        }
