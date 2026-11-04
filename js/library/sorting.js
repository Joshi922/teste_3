        // Busca
        /* ---------- Ordenação ---------- */
        const SORT_OPTIONS = [
            { id: 'series', label: 'Série e volume', hint: 'Agrupa por série; dentro dela, Único e depois I, II, III…' },
            { id: 'titleAZ', label: 'Título de A a Z' },
            { id: 'titleZA', label: 'Título de Z a A' },
            { id: 'authorAZ', label: 'Autor de A a Z' },
            { id: 'authorZA', label: 'Autor de Z a A' },
            { id: 'recent', label: 'Adicionados recentemente' },
            { id: 'oldest', label: 'Adicionados há mais tempo' }
        ];
        let sortMode = 'recent';
        const cmpTxt = (a, b) => String(a || '').localeCompare(String(b || ''), 'pt-BR', { sensitivity: 'base', numeric: true });
        function romanToInt(s) { const m = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }; let t = 0; for (let i = 0; i < s.length; i++) { const v = m[s[i]], n = m[s[i + 1]] || 0; t += v < n ? -v : v; } return t; }
        // Único vem primeiro (0), depois 1/I, 2/II, 3/III…; volume vazio vai para o fim
        function volKey(v) {
            let s = normTxt(String(v == null ? '' : v)).trim();
            if (!s) return 1e6;
            if (/unic[oa]/.test(s)) return 0;
            s = s.replace(/^(volume|vol|tomo|livro|parte)\.?\s*/, '').trim();
            const num = s.match(/^\d+(?:[.,]\d+)?/); if (num) return parseFloat(num[0].replace(',', '.'));
            const rom = s.toUpperCase().match(/^[IVXLCDM]+(?![A-Z])/); if (rom) return romanToInt(rom[0]);
            const any = s.match(/\d+/); if (any) return +any[0];
            return 1e5;
        }
        const SORT_FN = {
            recent: (a, b) => (b.addedAt || 0) - (a.addedAt || 0),
            oldest: (a, b) => (a.addedAt || 0) - (b.addedAt || 0),
            titleAZ: (a, b) => cmpTxt(a.title, b.title),
            titleZA: (a, b) => cmpTxt(b.title, a.title),
            authorAZ: (a, b) => cmpTxt(a.author, b.author) || cmpTxt(a.title, b.title),
            authorZA: (a, b) => cmpTxt(b.author, a.author) || cmpTxt(a.title, b.title),
            series: (a, b) => {
                const sa = (a.series || '').trim(), sb = (b.series || '').trim();
                if (sa && !sb) return -1; if (!sa && sb) return 1;
                return cmpTxt(sa, sb) || (volKey(a.volume) - volKey(b.volume)) || cmpTxt(a.title, b.title);
            }
        };
        const sortBooks = arr => arr.slice().sort(SORT_FN[sortMode] || SORT_FN.recent);
        const collectionNames = names => { const r = names.slice().sort(cmpTxt); return /ZA$/.test(sortMode) ? r.reverse() : r; };
        window.setSortMode = id => { sortMode = id; appMeta.ui = Object.assign(appMeta.ui || {}, { sort: id }); libDirty = true; renderSortOptions(); renderCurrentView(); setTimeout(closeDisplayMenu, 150); };
        function renderSortOptions() {
            const el = document.getElementById('sort-options'); if (!el) return;
            el.innerHTML = SORT_OPTIONS.map(o => `<button onclick="setSortMode('${o.id}')" class="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-ctonia-abyssal rounded-lg transition-colors"><span class="flex flex-col"><span class="text-[15px] font-bold">${o.label}</span>${o.hint ? `<span class="text-[11px] text-ctonia-nightsky font-normal mt-0.5">${o.hint}</span>` : ''}</span>${sortMode === o.id ? '<i class="ph-bold ph-check text-ctonia-luminous text-xl drop-shadow-[0_0_5px_#7BF0C3]"></i>' : ''}</button>`).join('');
        }
