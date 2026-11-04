        /* ---------- Sincronização Celestial: câmara oculta do Drive (appDataFolder) ---------- */
        const SYNC_STATE = 'ctonia-state.json', SYNC_COVERS = 'ctonia-covers.json';
        function sy() { if (!appMeta.sync) appMeta.sync = { enabled: true, last: 0, stateId: '', coversId: '', deleted: {} }; if (!appMeta.sync.deleted) appMeta.sync.deleted = {}; return appMeta.sync; }
        function hasToken() { return !!(gToken && Date.now() < gExp); }
        function setSyncMsg(t) { syncMsg = t; try { renderMore(); } catch (e) {} updateSyncPill(); }
        function trackAnn(b) {
            const cur = new Set((b.annotations || []).map(a => a.id)), prev = annSnap[b.id];
            if (prev) prev.forEach(id => { if (!cur.has(id)) (b.delAnn = b.delAnn || {})[id] = Date.now(); });
            annSnap[b.id] = cur;
        }
        function scheduleCloudSync() {
            try { const S = sy(); if (S.enabled === false || !appMeta.drive.user || !hasToken() || syncBusy || syncTimer || Date.now() - (S.last || 0) < 60000) return; syncTimer = setTimeout(() => { syncTimer = 0; syncCloud(false); }, 45000); } catch (e) {}
        }
        async function gFind(name) {
            const q = encodeURIComponent(`name='${name}' and trashed=false`);
            const j = await (await driveApi(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&orderBy=${encodeURIComponent('modifiedTime desc')}&fields=files(id)&pageSize=5`)).json();
            return (j.files && j.files[0]) ? j.files[0].id : null;
        }
        async function gReadJson(id) { return (await driveApi(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`)).json(); }
        async function gWriteJson(name, obj, id) {
            const bd = 'ct' + Math.random().toString(36).slice(2), meta = id ? { name } : { name, parents: ['appDataFolder'] };
            const body = `--${bd}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${bd}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(obj)}\r\n--${bd}--`;
            const url = id ? `https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=multipart&fields=id` : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id';
            const r = await driveApi(url, { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + bd }, body });
            return (await r.json()).id;
        }
        async function gUploadBlob(name, blob) {
            const t = await getToken(), ct = blob.type || 'application/octet-stream';
            const init = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id', { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': ct, 'X-Upload-Content-Length': String(blob.size) }, body: JSON.stringify({ name, parents: ['appDataFolder'] }) });
            if (!init.ok) throw new Error('A Nuvem recusou o envio (Erro ' + init.status + ')');
            const loc = init.headers.get('Location'); if (!loc) throw new Error('A Nuvem não devolveu o caminho de envio.');
            const up = await fetch(loc, { method: 'PUT', headers: { 'Content-Type': ct }, body: blob });
            if (!up.ok) throw new Error('Falha ao enviar o pergaminho (Erro ' + up.status + ')');
            return (await up.json()).id;
        }
        function serBook(b) { const { file, thumb, coverUrl, ...r } = b; const o = Object.assign({}, r); if (coverUrl && /^data:/.test(coverUrl)) o.hasCover = true; return o; }
        function mergeBook(lb, rb) {
            const remoteNewer = (rb.lastRead || 0) > (lb.lastRead || 0);
            const keep = { file: lb.file, cover: lb.coverUrl, cloud: lb.cloudFileId, secs: lb.readSeconds || 0 };
            const lAnn = lb.annotations || [], rAnn = rb.annotations || [], del = Object.assign({}, rb.delAnn || {}, lb.delAnn || {});
            if (remoteNewer) { const { annotations, delAnn, file, hasCover, ...rest } = rb; Object.assign(lb, rest); }
            lb.file = keep.file; if (keep.cover) lb.coverUrl = keep.cover;
            lb.cloudFileId = keep.cloud || rb.cloudFileId || lb.cloudFileId;
            lb.readSeconds = Math.max(keep.secs, rb.readSeconds || 0);
            const map = new Map(), first = remoteNewer ? lAnn : rAnn, second = remoteNewer ? rAnn : lAnn;
            first.concat(second).forEach(a => { if (a && a.id && !del[a.id]) map.set(a.id, a); });
            lb.annotations = Array.from(map.values()).sort((a, b) => (a.date || 0) - (b.date || 0));
            const lim = Date.now() - 60 * 864e5; Object.keys(del).forEach(k => { if (del[k] < lim) delete del[k]; });
            lb.delAnn = del; annSnap[lb.id] = new Set(lb.annotations.map(a => a.id));
        }
        async function runCloudSync(S) {
            setSyncMsg('Lendo a câmara oculta…');
            const stateId = (await gFind(SYNC_STATE)) || S.stateId || null;
            let remote = { books: [], deleted: {}, readLog: {}, coverIds: [], drive: { folders: [] } };
            if (stateId) { try { remote = Object.assign(remote, await gReadJson(stateId)); } catch (e) { console.warn('estado remoto ilegível', e); } }
            const del = Object.assign({}, remote.deleted || {}, S.deleted || {});
            // pergaminhos banidos em outro aparelho
            for (const id of Object.keys(del)) {
                const i = library.findIndex(b => b.id === id);
                if (i >= 0 && del[id] >= (library[i].lastRead || 0) && del[id] >= (library[i].addedAt || 0)) { try { DB.del('books', id); DB.del('files', id); } catch (e) {} library.splice(i, 1); }
            }
            // livros remotos
            for (const rb of (remote.books || [])) {
                if (!rb || !rb.id) continue;
                if (del[rb.id] && del[rb.id] >= (rb.lastRead || 0)) { if (rb.cloudFileId) driveApi(`https://www.googleapis.com/drive/v3/files/${rb.cloudFileId}`, { method: 'DELETE' }).catch(() => {}); continue; }
                const lb = library.find(b => b.id === rb.id);
                if (!lb) { const nb = Object.assign({ annotations: [] }, rb); delete nb.hasCover; library.push(nb); annSnap[nb.id] = new Set((nb.annotations || []).map(a => a.id)); }
                else mergeBook(lb, rb);
            }
            // pastas do Drive e registro de leitura
            (remote.drive && remote.drive.folders || []).forEach(f => { if (f && f.id && !appMeta.drive.folders.some(x => x.id === f.id)) appMeta.drive.folders.push({ id: f.id, name: f.name }); });
            Object.keys(remote.readLog || {}).forEach(k => { appMeta.readLog[k] = Math.max(appMeta.readLog[k] || 0, remote.readLog[k] || 0); });
            // capas
            const rIds = new Set(remote.coverIds || []); let covers = null, coversId = S.coversId || null;
            const needCovers = library.filter(b => !b.coverUrl && rIds.has(b.id)), newCovers = library.filter(b => b.coverUrl && /^data:/.test(b.coverUrl) && !rIds.has(b.id));
            if (needCovers.length || newCovers.length) {
                coversId = (await gFind(SYNC_COVERS)) || coversId;
                if (coversId) { try { covers = await gReadJson(coversId); } catch (e) { covers = null; } }
                covers = covers || {};
                needCovers.forEach(b => { if (covers[b.id]) b.coverUrl = covers[b.id]; });
                if (newCovers.length) { newCovers.forEach(b => { covers[b.id] = b.coverUrl; }); coversId = await gWriteJson(SYNC_COVERS, covers, coversId); S.coversId = coversId; }
            }
            // envia os arquivos que só existem neste aparelho (pergaminhos do botão +)
            const up = []; for (const b of library) { if (b.driveId || b.cloudFileId) continue; let blob = null; try { blob = await DB.get('files', b.id); } catch (e) {} if (blob) up.push({ b, blob }); }
            const saver = navigator.connection && navigator.connection.saveData;
            let i = 0; for (const u of up) {
                if (saver) break; i++; setSyncMsg(`Enviando “${u.b.title}” (${i}/${up.length})…`);
                try { u.b.cloudFileId = await gUploadBlob(`book_${u.b.id}.${u.b.type}`, u.blob); } catch (e) { console.warn('Envio falhou', u.b.title, e); }
            }
            // grava o estado
            setSyncMsg('Gravando na câmara oculta…');
            const lim = Date.now() - 90 * 864e5; Object.keys(del).forEach(k => { if (del[k] < lim) delete del[k]; });
            S.deleted = del;
            const state = { v: 1, updatedAt: Date.now(), books: library.map(serBook), deleted: del, readLog: appMeta.readLog, drive: { folders: appMeta.drive.folders }, coverIds: library.filter(b => b.coverUrl && /^data:/.test(b.coverUrl)).map(b => b.id) };
            S.stateId = await gWriteJson(SYNC_STATE, state, stateId);
        }
        window.syncCloud = async function (manual) {
            const S = sy();
            if (syncBusy) return;
            if (!appMeta.drive.user) { if (manual) setSyncMsg('Conecte sua essência (conta Google) primeiro.'); return; }
            if (!manual && !hasToken()) return;
            if (!navigator.onLine) { if (manual) setSyncMsg('Sem conexão com a Nuvem.'); return; }
            syncBusy = true; setSyncMsg('Sincronizando…');
            try { await runCloudSync(S); S.last = Date.now(); setSyncMsg(''); }
            catch (e) {
                console.warn('Sync', e);
                let ok = false;
                if (manual && /Erro (401|403)/.test(e.message || '')) { try { await requestToken('consent'); await runCloudSync(S); S.last = Date.now(); setSyncMsg(''); ok = true; } catch (e2) { e = e2; } }
                if (!ok) setSyncMsg(/Erro 403/.test(e.message || '') ? 'A Nuvem recusou. Toque em Sincronizar agora e aceite a permissão “dados do app” do Google.' : (e.message || 'A sincronização falhou.'));
            } finally { syncBusy = false; libDirty = true; flushLibrary(); try { renderCurrentView(); } catch (e) {} updateSyncPill(); try { renderMore(); } catch (e) {} }
        };
        window.setAutoSync = v => { sy().enabled = !!v; libDirty = true; flushLibrary(); updateSyncPill(); };
        function syncSectionHtml(btn, btnDark) {
            const S = sy();
            const last = S.last ? `<p class="text-[11px] text-ctonia-luminous font-bold mt-4 tracking-wider uppercase"><i class="ph-bold ph-clock"></i> Última sincronia: ${new Date(S.last).toLocaleString('pt-BR')}</p>` : '';
            const msg = syncMsg ? `<p class="text-[11px] text-ctonia-magenta font-bold mt-3 tracking-wider bg-ctonia-magenta/10 p-2 rounded">${escapeHtml(syncMsg)}</p>` : '';
            const tok = hasToken() ? '' : `<p class="text-[11px] text-ctonia-nightsky mt-3 leading-relaxed">A permissão do Google dura cerca de 1 hora. Se expirou, toque em “Sincronizar agora” para renovar.</p>`;
            return `<p class="text-sm text-white/80 leading-relaxed bg-ctonia-indigo/30 p-4 rounded-xl border border-ctonia-darkmint mb-4">Progresso, marcações, notas e os pergaminhos enviados pelo (+) ficam guardados numa câmara oculta do seu Drive e aparecem em todos os aparelhos conectados a esta conta.</p><button onclick="syncCloud(true)" class="${btnDark} w-full flex items-center justify-center gap-2" ${syncBusy ? 'disabled' : ''}><i class="ph-bold ph-arrows-clockwise ${syncBusy ? 'ct-spin' : ''}"></i> ${syncBusy ? 'Sincronizando…' : 'Sincronizar agora'}</button><label class="flex items-center gap-2 text-xs text-white mt-4 cursor-pointer select-none"><input type="checkbox" ${S.enabled !== false ? 'checked' : ''} onchange="setAutoSync(this.checked)"> Sincronizar automaticamente</label>${last}${msg}${tok}`;
        }
        function updateSyncPill() {
            let p = document.getElementById('sync-pill');
            const S = sy(), show = !!(appMeta.drive && appMeta.drive.user && S.enabled !== false && views.reader.classList.contains('hidden'));
            if (!p) { if (!show) return; p = document.createElement('button'); p.id = 'sync-pill'; p.type = 'button'; p.onclick = () => syncCloud(true); document.body.appendChild(p); }
            p.style.display = show ? 'flex' : 'none'; if (!show) return;
            p.innerHTML = syncBusy ? '<i class="ph-bold ph-arrows-clockwise ct-spin"></i> Sincronizando' : ((S.last && hasToken()) ? '<i class="ph-bold ph-cloud-check"></i> Sincronizado' : '<i class="ph-bold ph-cloud-arrow-up"></i> Sincronizar');
        }
        function initCloudSync() {
            document.addEventListener('visibilitychange', () => { if (!document.hidden) { const S = sy(); if (S.enabled !== false && hasToken() && Date.now() - (S.last || 0) > 60000) syncCloud(false); } });
            window.addEventListener('online', () => { if (hasToken()) syncCloud(false); });
            setInterval(updateSyncPill, 1500); updateSyncPill();
            /* celular: a permissão do Google expira em 1h e só pode ser renovada num toque do usuário */
            let reTry = 0;
            const reauth = () => { try { const S = sy(); if (S.enabled === false || !appMeta.drive.user || hasToken() || syncBusy || Date.now() - reTry < 30000) return; reTry = Date.now(); requestToken('').then(() => syncCloud(false)).catch(() => {}); } catch (e) {} };
            ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, reauth, { passive: true, capture: true }));
            setTimeout(() => { const S = sy(); if (S.enabled !== false && appMeta.drive.user && hasToken()) syncCloud(false); }, 1800);
        }
