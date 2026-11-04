        /* === Sincronização entre aparelhos (Google Drive · câmara oculta do app) === */
        const CTS = (() => {
            const FILE = 'ctonia-data.json', CFG = 'ct_sync_cfg', META = 'ct_sync_meta', BKP = 'ct_sync_backup', TOKEN = 'kwr_gtoken_v2';
            const SCOPE = 'openid email profile https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.appdata';
            const SKIP = /^(kwr_gtoken|ct_sync_|ct_last_backup|ct-theme|gemini_api_key|ct_gcal_consented)/;
            let busy = false, timer = 0, msg = '', gis = null, needReload = false, lastErrAt = 0;
            const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
            const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
            const cfg = () => Object.assign({ clientId: '', enabled: true, fileId: '', last: 0, user: '', init: false }, rd(CFG, {}));
            const save = c => wr(CFG, c);
            const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return h + ':' + s.length; };
            const keys = () => { const o = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!SKIP.test(k)) o.push(k); } return o; };
            const token = () => { const t = rd(TOKEN, null); return t && t.e > Date.now() ? t.t : null; };
            const origin = () => { try { return location.origin; } catch (e) { return ''; } };
            function setMsg(t) { msg = t; ui(); }
            function ui() {
                const c = cfg(), el = document.getElementById('ct-sync-info'), box = document.getElementById('ct-sync-status'), b = document.getElementById('ct-sync-btn');
                const txt = busy ? 'Sincronizando…' : msg || (c.last ? 'Sincronizado em ' + new Date(c.last).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : (c.clientId ? 'Toque para conectar' : 'Nuvem não configurada'));
                if (el) { el.textContent = txt; el.classList.toggle('old', !c.last || !token()); }
                if (box) box.textContent = txt;
                if (b) b.classList.toggle('spin', busy);
                const ls = document.getElementById('ct-sync-last'); if (ls) ls.textContent = c.last ? new Date(c.last).toLocaleString('pt-BR') : 'nunca';
                const us = document.getElementById('ct-sync-user'); if (us) us.textContent = token() ? 'Conectado' + (c.user ? ' · ' + c.user : '') : 'Desconectado (a permissão do Google dura 1 hora)';
            }
            function loadGis() {
                return gis || (gis = new Promise((res, rej) => {
                    if (window.google && google.accounts && google.accounts.oauth2) return res();
                    const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.onload = res;
                    s.onerror = () => { gis = null; rej(new Error('Não foi possível carregar o login do Google (sem internet?).')); }; document.head.appendChild(s);
                }));
            }
            function requestToken(prompt) {
                const c = cfg();
                if (!c.clientId) return Promise.reject(new Error('Informe o ID do cliente do Google.'));
                if (!/^https?:/.test(origin())) return Promise.reject(new Error('O login do Google só funciona com o site aberto por um endereço https (não por arquivo local).'));
                return loadGis().then(() => new Promise((res, rej) => {
                    const cl = google.accounts.oauth2.initTokenClient({
                        client_id: c.clientId, scope: SCOPE,
                        callback: r => { if (r.error) return rej(new Error(r.error_description || r.error)); try { localStorage.setItem(TOKEN, JSON.stringify({ t: r.access_token, e: Date.now() + (r.expires_in - 60) * 1000 })); } catch (e) {} res(r.access_token); },
                        error_callback: e => rej(new Error(e && e.type === 'popup_closed' ? 'Login cancelado.' : 'O Google bloqueou a janela de login. Toque em “Conectar” de novo.'))
                    });
                    cl.requestAccessToken({ prompt });
                }));
            }
            async function api(url, opts) {
                opts = opts || {};
                const go = t => fetch(url, Object.assign({}, opts, { headers: Object.assign({}, opts.headers || {}, { Authorization: 'Bearer ' + t }) }));
                let t = token(); if (!t) throw new Error('NEEDAUTH');
                let r = await go(t);
                if (r.status === 401) { try { localStorage.removeItem(TOKEN); } catch (e) {} throw new Error('NEEDAUTH'); }
                if (!r.ok) throw new Error('O Google Drive recusou (erro ' + r.status + '). Confira se a API do Drive está ativa e se você aceitou a permissão de dados do app.');
                return r;
            }
            async function find() {
                const q = encodeURIComponent(`name='${FILE}' and trashed=false`);
                const j = await (await api(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&orderBy=${encodeURIComponent('modifiedTime desc')}&fields=files(id)&pageSize=5`)).json();
                return j.files && j.files[0] ? j.files[0].id : null;
            }
            async function put(obj, id) {
                const bd = 'cs' + Math.random().toString(36).slice(2), meta = id ? { name: FILE } : { name: FILE, parents: ['appDataFolder'] };
                const body = `--${bd}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${bd}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(obj)}\r\n--${bd}--`;
                const url = id ? `https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=multipart&fields=id` : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id';
                return (await (await api(url, { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + bd }, body })).json()).id;
            }
            // marca o que mudou neste aparelho desde a última leitura
            function scan(meta) {
                const now = Date.now(), live = new Set(keys());
                live.forEach(k => { const h = hash(localStorage.getItem(k) || ''); if (!meta[k]) meta[k] = { h, t: now }; else if (meta[k].h !== h) meta[k] = { h, t: now }; });
                return live;
            }
            async function run(manual) {
                if (busy) return; const c = cfg();
                if (!c.clientId) { if (manual) openPanel(); return; }
                if (!navigator.onLine) { if (manual) setMsg('Sem conexão.'); return; }
                busy = true; setMsg('');
                try {
                    if (!token()) { if (!manual) throw new Error('NEEDAUTH'); await requestToken(c.user ? '' : 'select_account'); }
                    const meta = rd(META, {}); scan(meta);
                    let id = (await find()) || c.fileId || null, remote = { v: 1, keys: {} };
                    if (id) { try { const r = await (await api(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`)).json(); if (r && r.keys) remote = r; } catch (e) { if (e.message === 'NEEDAUTH') throw e; } }
                    let push = !id, changed = [], conflicts = {};
                    const all = new Set([...Object.keys(remote.keys), ...keys()]);
                    all.forEach(k => {
                        const lv = localStorage.getItem(k), lm = meta[k], rm = remote.keys[k];
                        if (rm && (lv == null || rm.t > (lm ? lm.t : 0) || (!c.init && lv !== rm.v))) {
                            if (lv != null && lv !== rm.v && lv.length > 4 && lm && lm.t > 0 && c.init && lm.t > (c.last || 0)) conflicts[k] = lv;
                            if (lv != null && lv !== rm.v && !c.init && lv.length > 4) conflicts[k] = lv;
                            if (lv !== rm.v) { try { localStorage.setItem(k, rm.v); } catch (e) {} changed.push(k); }
                            meta[k] = { h: hash(rm.v), t: rm.t };
                        } else if (lv != null && (!rm || (lm && lm.t > rm.t))) {
                            remote.keys[k] = { v: lv, t: lm ? lm.t : Date.now() }; push = true;
                        }
                    });
                    if (Object.keys(conflicts).length) { const b = rd(BKP, {}); b.date = Date.now(); b.data = Object.assign(b.data || {}, conflicts); wr(BKP, b); }
                    if (push) { remote.v = 1; remote.updatedAt = Date.now(); id = await put(remote, id); }
                    wr(META, meta); c.fileId = id || ''; c.last = Date.now(); c.init = true; save(c);
                    try { const u = rd('ct_sync_user', null); if (u) c.user = u; } catch (e) {}
                    setMsg('');
                    if (changed.length) afterRemote(changed);
                } catch (e) {
                    if (e.message === 'NEEDAUTH') { setMsg('Toque em Sincronizar para renovar a permissão do Google.'); armGesture(); }
                    else { lastErrAt = Date.now(); setMsg(e.message || 'A sincronização falhou.'); }
                } finally { busy = false; ui(); }
            }
            function afterRemote(changed) {
                needReload = true;
                const portalOpen = !document.getElementById('portal-view').classList.contains('hidden');
                if (portalOpen) { ctBackupToast('Dados novos de outro aparelho. Atualizando…'); setTimeout(() => location.reload(), 1300); return; }
                let b = document.getElementById('ct-sync-banner');
                if (!b) { b = document.createElement('div'); b.id = 'ct-sync-banner'; document.body.appendChild(b); }
                b.innerHTML = '<span><i class="fa-solid fa-cloud-arrow-down"></i> Chegaram dados de outro aparelho.</span><button type="button" onclick="location.reload()">Atualizar agora</button>';
            }
            let armed = false;
            function armGesture() {
                if (armed) return; armed = true;
                const h = () => {
                    if (token() || busy) { if (token()) { cleanup(); } return; }
                    if (Date.now() - lastErrAt < 20000) return;
                    cleanup(); run(true);
                };
                const cleanup = () => { armed = false; ['pointerdown', 'keydown'].forEach(ev => document.removeEventListener(ev, h, true)); };
                ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, h, true));
            }
            function schedule() {
                const c = cfg(); if (!c.clientId || !c.enabled || busy || timer) return;
                timer = setTimeout(() => { timer = 0; run(false); }, 6000);
            }
            // observa mudanças locais (as ferramentas ficam em iframes e gravam direto no localStorage)
            function watch() {
                setInterval(() => {
                    const c = cfg(); if (!c.clientId || !c.enabled || busy || needReload) return;
                    const meta = rd(META, {}); let dirty = false;
                    const live = keys();
                    live.forEach(k => { const h = hash(localStorage.getItem(k) || ''); if (!meta[k] || meta[k].h !== h) dirty = true; });
                    if (dirty && token()) schedule();
                }, 4000);
                document.addEventListener('visibilitychange', () => { const c = cfg(); if (!document.hidden && c.clientId && c.enabled && Date.now() - (c.last || 0) > 45000) { if (token()) run(false); else armGesture(); } });
                window.addEventListener('online', () => { if (token()) run(false); });
                setInterval(() => { const c = cfg(); if (c.clientId && c.enabled && !document.hidden && token() && Date.now() - (c.last || 0) > 120000) run(false); }, 30000);
                setTimeout(() => { const c = cfg(); if (!c.clientId || !c.enabled) return; if (token()) run(false); else armGesture(); }, 1500);
            }
            // painel
            async function detectClientId() {
                const c = cfg(); if (c.clientId) return c.clientId;
                try { const g = rd('ct_gcal_config_v1', null); if (g && g.clientId) return g.clientId; } catch (e) {}
                try {
                    if (indexedDB.databases && (await indexedDB.databases()).some(d => d.name === CT_IDB)) {
                        const db = await ctIdbOpen();
                        try { const a = await ctReq(db.transaction('meta', 'readonly').objectStore('meta').get('app')); if (a && a.drive && a.drive.clientId) return a.drive.clientId; } finally { db.close(); }
                    }
                } catch (e) {}
                return '';
            }
            async function openPanel() {
                let m = document.getElementById('ct-sync-modal');
                if (!m) { m = document.createElement('div'); m.id = 'ct-sync-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.onclick = e => { if (e.target === m) closePanel(); }; document.body.appendChild(m); }
                const c = cfg(), id = await detectClientId();
                m.innerHTML = `<div class="ct-sync-card"><button type="button" class="ct-sync-x" onclick="CTS.close()" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button>
                  <h3><i class="fa-solid fa-cloud"></i> Sincronizar aparelhos</h3>
                  <p>Gerenciar, Academia e Medições passam a ficar guardados numa câmara oculta do seu Google Drive e aparecem em todos os aparelhos conectados à mesma conta. A Biblioteca usa o mesmo login.</p>
                  <label for="ct-sync-cid">ID do cliente OAuth (Google Cloud)</label>
                  <input id="ct-sync-cid" value="${(id || '').replace(/"/g, '&quot;')}" placeholder="xxxx.apps.googleusercontent.com" autocomplete="off" spellcheck="false">
                  <div class="ct-sync-row"><button type="button" class="ct-sync-pri" onclick="CTS.connect()"><i class="fa-brands fa-google"></i> Conectar e sincronizar</button>
                  <button type="button" onclick="CTS.now()"><i class="fa-solid fa-rotate"></i> Sincronizar agora</button></div>
                  <label class="ct-sync-chk"><input type="checkbox" ${c.enabled ? 'checked' : ''} onchange="CTS.auto(this.checked)"> Sincronizar automaticamente</label>
                  <dl><dt>Status</dt><dd id="ct-sync-status"></dd><dt>Conta</dt><dd id="ct-sync-user"></dd><dt>Última sincronia</dt><dd id="ct-sync-last"></dd></dl>
                  <details><summary>Como configurar no Google Cloud</summary><p>Ative a <b>Google Drive API</b>, crie um ID do cliente OAuth (Aplicativo da Web) e, em “Origens JavaScript autorizadas”, adicione exatamente <b>${origin() || '(abra o site por um endereço https)'}</b>. Se o app estiver em modo de teste, inclua seu e-mail em “Usuários de teste”. Faça o mesmo ID valer nos dois aparelhos.</p></details>
                  <details><summary>O que é sincronizado</summary><p>Dados de Gerenciar (tarefas, finanças, fosso), Academia (matérias, notas, faltas, flashcards), Medições e agenda. Anexos de arquivos da Academia e livros da Biblioteca seguem o fluxo próprio da Biblioteca. Chave do Gemini e tema não são enviados. Se os dois aparelhos editarem o mesmo item ao mesmo tempo, vale o mais recente e o outro fica guardado como cópia de segurança.</p></details></div>`;
                m.classList.add('on'); ui();
            }
            function closePanel() { const m = document.getElementById('ct-sync-modal'); if (m) m.classList.remove('on'); }
            function saveId() { const v = (document.getElementById('ct-sync-cid') || {}).value; const c = cfg(); if (v != null) { c.clientId = v.trim(); save(c); } return c; }
            async function connect() {
                const c = saveId();
                if (!/\.apps\.googleusercontent\.com$/.test(c.clientId)) { setMsg('Confira o ID do cliente: deve terminar em .apps.googleusercontent.com'); return; }
                try { localStorage.removeItem(TOKEN); } catch (e) {}
                await run(true); ui();
            }
            document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });
            return {
                open: openPanel, close: closePanel, connect, now: async () => { saveId(); await run(true); }, auto: v => { const c = cfg(); c.enabled = !!v; save(c); },
                start: () => { watch(); ui(); }, ui
            };
        })();
        window.CTS = CTS;
        document.addEventListener('DOMContentLoaded', CTS.ui);
        CTS.start();

        document.addEventListener('DOMContentLoaded', ctBackupInfo); ctBackupInfo();
        try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
