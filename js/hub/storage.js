        /* === Backup e importação de todos os dados do site === */
        const CT_IDB = 'kindle-web-reader';
        function ctBackupToast(msg) {
            let t = document.getElementById('ct-backup-toast');
            if (!t) { t = document.createElement('div'); t.id = 'ct-backup-toast'; document.body.appendChild(t); }
            t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 4200);
        }
        function ctBackupInfo() {
            const el = document.getElementById('ct-backup-info'); if (!el) return;
            let d = null; try { d = localStorage.getItem('ct_last_backup'); } catch (e) {}
            if (!d) { el.textContent = 'Nenhum backup feito ainda'; el.classList.add('old'); return; }
            const dt = new Date(d), dias = Math.floor((Date.now() - dt) / 864e5);
            el.textContent = 'Último backup: ' + dt.toLocaleDateString('pt-BR') + ' às ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            el.classList.toggle('old', dias >= 3);
        }
        function ctIdbOpen() {
            return new Promise((res, rej) => {
                const r = indexedDB.open(CT_IDB, 1);
                r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('books')) d.createObjectStore('books', { keyPath: 'id' }); if (!d.objectStoreNames.contains('files')) d.createObjectStore('files'); if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta'); };
                r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
            });
        }
        const ctReq = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        async function ctIdbDump() {
            try {
                if (!indexedDB.databases) return null;
                if (!(await indexedDB.databases()).some(d => d.name === CT_IDB)) return null;
                const db = await ctIdbOpen();
                try {
                    const tx = db.transaction(['books', 'meta'], 'readonly');
                    const books = await ctReq(tx.objectStore('books').getAll());
                    const mk = await ctReq(tx.objectStore('meta').getAllKeys()), mv = await ctReq(tx.objectStore('meta').getAll());
                    const meta = {}; mk.forEach((k, i) => meta[k] = mv[i]);
                    return { books, meta };
                } finally { db.close(); }
            } catch (e) { return null; }
        }
        async function ctIdbRestore(d) {
            if (!d || !window.indexedDB) return;
            const db = await ctIdbOpen();
            try {
                const tx = db.transaction(['books', 'meta'], 'readwrite');
                (d.books || []).forEach(b => tx.objectStore('books').put(b));
                Object.keys(d.meta || {}).forEach(k => tx.objectStore('meta').put(d.meta[k], k));
                await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = tx.onabort = () => rej(tx.error); });
            } finally { db.close(); }
        }
        async function ctBackupExport(prefix) {
            const out = { app: 'ctonia-backup', version: 2, date: new Date().toISOString(), localStorage: {}, indexedDB: null };
            for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^(kwr_gtoken|ct_sync_)/.test(k)) continue; out.localStorage[k] = localStorage.getItem(k); }
            out.indexedDB = await ctIdbDump();
            const n = Object.keys(out.localStorage).length;
            const z = x => String(x).padStart(2, '0'), d = new Date();
            const name = (prefix || 'backup-ctonia') + '-' + d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + '_' + z(d.getHours()) + '-' + z(d.getMinutes()) + '.json';
            const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: 'application/json' })); a.download = name;
            document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
            if (!prefix) { try { localStorage.setItem('ct_last_backup', out.date); } catch (e) {} ctBackupInfo(); ctBackupToast('Backup gerado: ' + n + ' itens salvos em ' + name); }
        }
        function ctBackupImport() {
            const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
            i.onchange = () => {
                const f = i.files[0]; if (!f) return; const r = new FileReader();
                r.onload = async () => {
                    try {
                        const o = JSON.parse(r.result);
                        const ls = (o && o.app === 'ctonia-backup') ? o.localStorage : o;
                        const keys = Object.keys(ls || {}).filter(k => typeof ls[k] === 'string' && !/^(kwr_gtoken|ct_sync_)/.test(k));
                        if (!keys.length) throw new Error('vazio');
                        const nb = o && o.indexedDB && o.indexedDB.books ? o.indexedDB.books.length : 0;
                        const quando = o && o.date ? ' de ' + new Date(o.date).toLocaleString('pt-BR') : '';
                        if (!confirm('Importar backup' + quando + '?\n\n' + keys.length + ' itens de dados' + (nb ? ' e ' + nb + ' livros da Biblioteca' : '') + '.\nIsso substitui os dados atuais correspondentes. Uma cópia de segurança do que existe hoje será baixada antes.')) return;
                        const tem = ['contabil_items', 'tarefas_items', 'ct_medicoes_v1', 'ct_academia_v1'].some(k => { const v = localStorage.getItem(k); return v && v.length > 4; });
                        if (tem) await ctBackupExport('antes-da-importacao');
                        keys.forEach(k => localStorage.setItem(k, ls[k]));
                        if (o.indexedDB) await ctIdbRestore(o.indexedDB);
                        ctBackupToast('Backup importado com sucesso. Recarregando…'); setTimeout(() => location.reload(), 1200);
                    } catch (e) { ctBackupToast('Arquivo de backup inválido ou corrompido.'); }
                };
                r.readAsText(f);
            };
            i.click();
        }
