        /* ---------- Google / Drive ---------- */
        const DRIVE_SCOPE = 'openid email profile https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.appdata';
        try { localStorage.removeItem('kwr_gtoken'); } catch (e) {}
        let gToken = null, gExp = 0, gisReady = null, moreMsg = '', browseStack = [], browseList = [];
        try { const t = JSON.parse(localStorage.getItem('kwr_gtoken_v2') || 'null'); if (t && t.e > Date.now()) { gToken = t.t; gExp = t.e; } } catch (e) {}

        /* O login do Google roda na janela PAI (origem https real); dentro do iframe srcdoc a origem é 'null' e o Google recusa (Erro 400 invalid_request). */
        const GW = (() => { try { if (window.parent && window.parent !== window && window.parent.document) return window.parent; } catch (e) {} return window; })();
        function loadGis() { return gisReady || (gisReady = new Promise((res, rej) => { if (GW.google && GW.google.accounts && GW.google.accounts.oauth2) return res(); const s = GW.document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.onload = res; s.onerror = () => { gisReady = null; rej(new Error('A magia do Google falhou em ser invocada.')); }; GW.document.head.appendChild(s); })); }
        function requestToken(prompt) {
            if (!appMeta.drive.clientId) return Promise.reject(new Error('Forneça a Chave de Cliente do Google no Oráculo.'));
            return loadGis().then(() => new Promise((res, rej) => {
                const client = GW.google.accounts.oauth2.initTokenClient({
                    client_id: appMeta.drive.clientId, scope: DRIVE_SCOPE,
                    callback: r => { if (r.error) return rej(new Error(r.error_description || r.error)); gToken = r.access_token; gExp = Date.now() + (r.expires_in - 60) * 1000; try { localStorage.setItem('kwr_gtoken_v2', JSON.stringify({ t: gToken, e: gExp })); } catch (e) {} res(gToken); },
                    error_callback: e => rej(new Error(e && e.type === 'popup_closed' ? 'Invocação cancelada.' : 'Falha na ponte do Google (popup bloqueado?). Tente de novo no Oráculo.'))
                });
                client.requestAccessToken({ prompt });
            }));
        }
        async function getToken() { if (gToken && Date.now() < gExp) return gToken; return requestToken(''); }
        async function driveApi(url, opts) {
            opts = opts || {};
            const go = t => fetch(url, Object.assign({}, opts, { headers: Object.assign({}, opts.headers || {}, { Authorization: 'Bearer ' + t }) }));
            let t = await getToken(); let r = await go(t);
            if (r.status === 401) { gToken = null; t = await getToken(); r = await go(t); }
            if (!r.ok) throw new Error('A Nuvem Ancestral recusou (Erro ' + r.status + ')');
            return r;
        }
        function setMoreMsg(t) { moreMsg = t; renderMore(); }
        window.saveClientId = function () { appMeta.drive.clientId = document.getElementById('gclient-input').value.trim(); libDirty = true; flushLibrary(); renderMore(); };
        window.googleSignIn = async function () {
            try {
                await requestToken('select_account');
                const u = await (await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + gToken } })).json();
                appMeta.drive.user = { name: u.name || '', email: u.email || '', picture: u.picture || '' }; libDirty = true; flushLibrary(); setMoreMsg(''); setTimeout(() => { try { syncCloud(false); } catch (e) {} }, 500);
            } catch (e) { setMoreMsg(e.message); }
        };
        window.googleSignOut = function () {
            try { if (gToken && GW.google) GW.google.accounts.oauth2.revoke(gToken, () => {}); } catch (e) {}
            gToken = null; gExp = 0; try { localStorage.removeItem('kwr_gtoken_v2'); } catch (e) {}
            appMeta.drive.user = null; libDirty = true; flushLibrary(); setMoreMsg('');
        };
        window.removeDriveFolder = function (i) { appMeta.drive.folders.splice(i, 1); libDirty = true; flushLibrary(); renderMore(); };

        window.openFolderPicker = async function () { browseStack = [{ id: 'root', name: 'Meu Domínio (Nuvem)' }]; document.getElementById('drive-modal').classList.remove('hidden'); loadBrowse(); };
        window.closeFolderPicker = function () { document.getElementById('drive-modal').classList.add('hidden'); };
        async function loadBrowse() {
            const cur = browseStack[browseStack.length - 1], box = document.getElementById('drive-browse');
            box.innerHTML = '<div class="p-6 text-sm text-ctonia-luminous font-bold animate-pulse text-center"><i class="ph-bold ph-spinner-gap animate-spin text-2xl mb-2"></i><br>Consultando as Nuvens...</div>';
            try {
                const base = cur.id === 'shared' ? "sharedWithMe=true and mimeType='application/vnd.google-apps.folder' and trashed=false" : `'${cur.id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
                const j = await (await driveApi(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(base)}&fields=files(id,name)&orderBy=name&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true`)).json();
                browseList = j.files || [];
                let h = `<div class="px-5 py-4 border-b border-ctonia-indigo flex items-center gap-3 text-sm bg-ctonia-indigo/30">${browseStack.length > 1 ? '<button onclick="browseUp()" class="p-1 rounded-full text-ctonia-luminous hover:bg-ctonia-abyssal transition-colors"><i class="ph-bold ph-caret-left text-lg"></i></button>' : ''}<span class="font-bold tracking-widest uppercase text-ctonia-salmon truncate">${escapeHtml(cur.name)}</span></div>`;
                if (cur.id === 'root') h += `<div onclick="browseShared()" class="px-5 py-4 flex items-center gap-4 border-b border-ctonia-indigo cursor-pointer hover:bg-ctonia-indigo transition-colors"><i class="ph-fill ph-users text-2xl text-ctonia-mystic"></i><span class="text-[15px] font-bold text-white">Salas Compartilhadas</span></div>`;
                h += browseList.map((f, i) => `<div onclick="browseInto(${i})" class="px-5 py-4 flex items-center gap-4 border-b border-ctonia-indigo cursor-pointer hover:bg-ctonia-indigo transition-colors"><i class="ph-fill ph-folder text-2xl text-ctonia-nightsky"></i><span class="text-[15px] text-white truncate flex-1 font-medium">${escapeHtml(f.name)}</span><i class="ph-bold ph-caret-right text-ctonia-darkmint"></i></div>`).join('');
                if (!browseList.length) h += '<div class="p-6 text-sm text-ctonia-nightsky font-bold text-center">O fim do abismo. Não há sub-câmaras.</div>';
                if (cur.id !== 'shared') h += `<div class="sticky bottom-0 bg-ctonia-abyssal/90 backdrop-blur p-5 border-t border-ctonia-indigo"><button onclick="addDriveFolder()" class="w-full py-3.5 rounded-xl bg-ctonia-luminous text-ctonia-abyssal text-sm font-bold tracking-widest uppercase hover:bg-white transition-colors shadow-[0_0_15px_rgba(123,240,195,0.4)]">Vincular a “${escapeHtml(cur.name)}”</button></div>`;
                box.innerHTML = h;
            } catch (e) { box.innerHTML = `<div class="p-6 text-sm text-ctonia-magenta font-bold text-center"><i class="ph-fill ph-warning-circle text-4xl mb-2"></i><br>${escapeHtml(e.message)}</div>`; }
        }
        window.browseInto = i => { browseStack.push(browseList[i]); loadBrowse(); };
        window.browseUp = () => { browseStack.pop(); loadBrowse(); };
        window.browseShared = () => { browseStack.push({ id: 'shared', name: 'Salas Compartilhadas' }); loadBrowse(); };
        window.addDriveFolder = function () {
            const cur = browseStack[browseStack.length - 1];
            if (!appMeta.drive.folders.some(f => f.id === cur.id)) appMeta.drive.folders.push({ id: cur.id, name: cur.name });
            libDirty = true; flushLibrary(); closeFolderPicker(); renderMore(); syncDrive();
        };

        window.syncDrive = async function () {
            const folders = appMeta.drive.folders; if (!folders.length) return setMoreMsg('Conecte uma câmara na Nuvem primeiro.');
            setMoreMsg('Conjurando Sincronização...'); let added = 0, total = 0;
            const walk = async (folderId, root, depth) => {
                let page = '';
                do {
                    const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
                    const j = await (await driveApi(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=nextPageToken,files(id,name,size,mimeType,thumbnailLink)&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true${page ? '&pageToken=' + page : ''}`)).json();
                    for (const f of j.files || []) {
                        if (f.mimeType === 'application/vnd.google-apps.folder') { if (depth < 4) await walk(f.id, root, depth + 1); continue; }
                        const ext = (f.name.split('.').pop() || '').toLowerCase(); if (ext !== 'pdf' && ext !== 'epub') continue;
                        total++; const ex = library.find(b => b.driveId === f.id); if (ex) { if (f.thumbnailLink) ex.thumb = f.thumbnailLink; continue; }
                        library.push({ id: 'd_' + f.id, driveId: f.id, driveFolderId: root.id, size: +f.size || 0, type: ext, title: f.name.replace(/\.[^/.]+$/, ''), author: 'Desconhecido', coverUrl: null, collection: root.name, volume: '', thumb: f.thumbnailLink || '', addedAt: Date.now(), annotations: [] }); added++;
                    }
                    page = j.nextPageToken || '';
                } while (page);
            };
            try {
                for (const f of folders) await walk(f.id, f, 0);
                appMeta.drive.lastSync = Date.now(); libDirty = true; flushLibrary(); renderCurrentView();
                setMoreMsg(`Ritual finalizado: Encontrados ${total}, Invocados ${added} novos manuscritos.`);
                enrichQueue();
            } catch (e) { setMoreMsg('O Ritual falhou: ' + e.message); }
        };


        /* Capas e dados dos livros do Drive, em segundo plano (sem abrir o livro e sem contar como leitura) */
        let enrichRunning = false;
        async function fetchDriveMeta(b) {
            if (b.type === 'pdf' && b.thumb && (b.size || 0) > 60 * 1024 * 1024) {
                try {
                    const t = await getToken();
                    const r = await fetch(b.thumb.replace(/=s\d+(-c)?$/, '') + '=s400', { headers: { Authorization: 'Bearer ' + t } });
                    if (r.ok) { b.coverUrl = await coverBlobToSmallDataUrl(await r.blob()); b.enriched = true; b.metaV = 2; return; }
                } catch (e) {}
            }
            if ((b.size || 0) > 60 * 1024 * 1024) { b.enriched = true; b.metaV = 2; return; } // arquivo grande: a capa vem na primeira abertura
            const blob = await (await driveApi(`https://www.googleapis.com/drive/v3/files/${b.driveId}?alt=media&supportsAllDrives=true`)).blob();
            await enrichBook(b, await readAsArrayBuffer(blob));
        }
        async function enrichQueue() {
            if (enrichRunning) return; enrichRunning = true;
            try {
                const todo = library.filter(b => b.driveId && (!b.enriched || (b.type === 'pdf' && b.metaV !== 2))); let i = 0;
                for (const b of todo) {
                    i++; setMoreMsg(`Preparando capas… ${i} de ${todo.length}`);
                    try { await fetchDriveMeta(b); } catch (e) { console.warn('Capa falhou', b.title, e); }
                    libDirty = true; if (i % 3 === 0) renderCurrentView();
                }
                renderCurrentView(); flushLibrary();
                if (todo.length) setMoreMsg('Capas prontas.');
            } finally { enrichRunning = false; }
        }
