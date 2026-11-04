        window.onload = async function () {
            try {
                await DB.open();
                library = (await DB.all('books')) || [];
                const s = await DB.get('meta', 'settings'); if (s) Object.assign(readerSettings, s);
                const a = await DB.get('meta', 'app'); if (a) appMeta = { readLog: a.readLog || {}, drive: Object.assign(appMeta.drive, a.drive || {}), sync: a.sync || undefined, ui: a.ui || {} };
                if (!appMeta.drive.clientId && DEFAULT_CLIENT_ID) appMeta.drive.clientId = DEFAULT_CLIENT_ID;
                if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
            } catch (e) { console.warn('Armazenamento local indisponível neste contexto.', e); }
            dbLoaded = true; try { if (appMeta.ui && SORT_FN[appMeta.ui.sort]) sortMode = appMeta.ui.sort; } catch (e) {} applySettings(); renderCurrentView(); setTimeout(migrateLocalPdfMeta, 800); initCloudSync();
        };
