        /* ====================== PERSISTÊNCIA E DRIVE ====================== */
        let dbLoaded = false, libDirty = false, progressLocked = false, searchQuery = '';
        let appMeta = { ui: {}, readLog: {}, drive: { clientId: '', folders: [], user: null, lastSync: 0 } };

        const DB = {
            db: null,
            open() { return new Promise((res, rej) => { try { const r = indexedDB.open('kindle-web-reader', 1); r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('books', { keyPath: 'id' }); d.createObjectStore('files'); d.createObjectStore('meta'); }; r.onsuccess = () => { DB.db = r.result; res(); }; r.onerror = () => rej(r.error); } catch (e) { rej(e); } }); },
            req(store, mode, fn) { return new Promise((res, rej) => { if (!DB.db) return res(undefined); const t = DB.db.transaction(store, mode); const r = fn(t.objectStore(store)); t.oncomplete = () => res(r && r.result); t.onerror = t.onabort = () => rej(t.error); }); },
            get: (s, k) => DB.req(s, 'readonly', o => o.get(k)),
            put: (s, v, k) => DB.req(s, 'readwrite', o => k === undefined ? o.put(v) : o.put(v, k)),
            del: (s, k) => DB.req(s, 'readwrite', o => o.delete(k)),
            all: s => DB.req(s, 'readonly', o => o.getAll())
        };

        async function flushLibrary() {
            if (!libDirty || !DB.db || !dbLoaded) return; libDirty = false;
            try {
                for (const b of library) { trackAnn(b); const { file, ...rest } = b; await DB.put('books', rest); }
                await DB.put('meta', readerSettings, 'settings'); await DB.put('meta', appMeta, 'app'); scheduleCloudSync();
            } catch (e) { console.warn('Falha ao salvar', e); libDirty = true; }
        }
        setInterval(() => { if (!views.reader.classList.contains('hidden')) libDirty = true; flushLibrary(); }, 8000);
        window.addEventListener('pagehide', () => { libDirty = true; flushLibrary(); });
        document.addEventListener('visibilitychange', () => { if (document.hidden) { libDirty = true; flushLibrary(); } });
