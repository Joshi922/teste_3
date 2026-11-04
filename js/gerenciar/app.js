        // Firebase é carregado sob demanda: se a rede/CDN falhar, o app continua funcionando offline.
        let initializeApp, getAuth, signInAnonymously, signInWithCustomToken, getFirestore, doc, setDoc, deleteDoc, onSnapshot, collection;
        async function ctLoadFirebase() {
            if (initializeApp) return;
            const base = "https://www.gstatic.com/firebasejs/11.6.1/";
            const [a, b, c] = await Promise.all([import(base + "firebase-app.js"), import(base + "firebase-auth.js"), import(base + "firebase-firestore.js")]);
            ({ initializeApp } = a); ({ getAuth, signInAnonymously, signInWithCustomToken } = b);
            ({ getFirestore, doc, setDoc, deleteDoc, onSnapshot, collection } = c);
        }

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'hub-financeiro';
        const firebaseConfigText = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
        
        let app, db, auth, userId = null;
        function ctSafeList(k) {
            let raw = null;
            try { raw = localStorage.getItem(k); const v = JSON.parse(raw); return Array.isArray(v) ? v : []; }
            catch (e) { try { if (raw) localStorage.setItem(k + '_corrompido_bkp', raw); } catch (e2) {} console.warn('Dados ilegíveis em', k, e); return []; }
        }
        window.contabilItems = ctSafeList('contabil_items');
        window.tarefasItems = ctSafeList('tarefas_items');
        window.trashItems = ctSafeList('ctonia_fosso_items');
        
        let itemToDeleteId = null;
        let deleteType = null;
        window.currentTarefasModule = '';
        let deferredPrompt = null;

        // PWA Setup
        const manifest = {
            "name": "Ctônia Hub Gestão",
            "short_name": "Ctônia Hub",
            "display": "standalone",
            "background_color": "#1B132B",
            "theme_color": "#E85A71"
        };
        document.getElementById('dynamic-manifest')?.setAttribute('href', URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/json' })));
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault(); deferredPrompt = e;
            document.getElementById('btn-install-app').classList.remove('hidden');
        });
        document.getElementById('btn-install-app')?.addEventListener('click', async () => {
            if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; document.getElementById('btn-install-app').classList.add('hidden'); }
        });

        // Worker PDF
        if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

        // Inicialização
        window.onload = () => {
            loadOfflineData(); 
            if (typeof window.renderCalendar === 'function') window.renderCalendar();
            initCloudDatabase(); 
        };

        // Firebase Cloud
        window.initCloudDatabase = async function() {
            if (!firebaseConfigText) return; // Removido aviso visual de modo Offline
            try {
                await ctLoadFirebase();
                const config = JSON.parse(firebaseConfigText);
                app = initializeApp(config); db = getFirestore(app); auth = getAuth(app);
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token); else await signInAnonymously(auth);
                userId = auth.currentUser.uid;
                syncLocalDataToCloud(); setupRealtimeSync();
            } catch (e) { console.error("Erro na inicialização da nuvem", e); }
        }

        async function syncLocalDataToCloud() {
            if (!userId || !db) return;
            try {
                for (const item of window.contabilItems) await setDoc(doc(db, 'artifacts', appId, 'users', userId, 'contabil_items', item.id), item);
                for (const item of window.tarefasItems) await setDoc(doc(db, 'artifacts', appId, 'users', userId, 'tarefas_items', item.id), item);
                for (const item of window.trashItems) await setDoc(doc(db, 'artifacts', appId, 'users', userId, 'trash_items', item.trashKey), item);
            } catch(e) {}
        }

        function setupRealtimeSync() {
            onSnapshot(collection(db, 'artifacts', appId, 'users', userId, 'contabil_items'), (snap) => {
                window.contabilItems = []; snap.forEach(d => window.contabilItems.push({ id: d.id, ...d.data() }));
                localStorage.setItem('contabil_items', JSON.stringify(window.contabilItems));
                if(window.renderKanban) window.renderKanban(); if(window.renderUrgentes) window.renderUrgentes(); if(window.renderPieChart) window.renderPieChart();
            });
            onSnapshot(collection(db, 'artifacts', appId, 'users', userId, 'tarefas_items'), (snap) => {
                window.tarefasItems = []; snap.forEach(d => window.tarefasItems.push({ id: d.id, ...d.data() }));
                localStorage.setItem('tarefas_items', JSON.stringify(window.tarefasItems));
                if (!document.getElementById('view-tarefas').classList.contains('hidden') && window.renderTarefasKanban) window.renderTarefasKanban();
                if(window.renderUrgentes) window.renderUrgentes(); if(window.renderPieChart) window.renderPieChart();
            });
            onSnapshot(collection(db, 'artifacts', appId, 'users', userId, 'trash_items'), (snap) => {
                window.trashItems = []; snap.forEach(d => window.trashItems.push({ trashKey: d.id, ...d.data() }));
                localStorage.setItem('ctonia_fosso_items', JSON.stringify(window.trashItems));
                window.purgeExpiredTrash(); window.renderFossoCount();
                if (!document.getElementById('fosso-overlay').classList.contains('hidden')) window.renderFosso();
            });
        }

        window.loadOfflineData = function() {
            if(window.renderKanban) window.renderKanban(); 
            if(window.renderUrgentes) window.renderUrgentes(); 
            if(window.renderPieChart) window.renderPieChart();
        }

        // Funções Base
        window.formatDate = (str) => { if(!str) return ''; const [y, m, d] = str.split('-'); return `${d}/${m}/${y}`; }
        window.formatCurrency = (val) => val ? Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
        window.generateId = () => Math.random().toString(36).substr(2, 9);
        window.showToast = (msg, type='success') => {
            const toast = document.createElement('div');
            let colors = type === 'success' ? 'bg-ctonia-mystic text-white border-ctonia-luminous' : type === 'error' ? 'bg-[#9E2F2F] text-white border-ctonia-magenta' : 'bg-ctonia-salmon text-ctonia-abyssal border-white';
            toast.className = `px-4 py-3 rounded shadow-lg font-bold text-sm transform transition-all duration-300 translate-y-10 opacity-0 flex items-center gap-2 border ${colors} font-body z-50`;
            toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check' : type === 'error' ? 'fa-skull' : 'fa-triangle-exclamation'}"></i> ${msg}`;
            document.getElementById('toast-container').appendChild(toast);
            setTimeout(() => toast.classList.remove('translate-y-10', 'opacity-0'), 10);
            setTimeout(() => { toast.classList.add('opacity-0'); setTimeout(() => toast.remove(), 300); }, 5000);
        }

        // Widgets (Pie, Calendar, Urgentes)
        window.renderPieChart = function() {
            const tC=window.contabilItems.filter(i=>i.status!=='Concluído').length;
            const tO=window.tarefasItems.filter(t=>t.module==='obra'&&t.status!=='Concluído').length;
            const tA=window.tarefasItems.filter(t=>t.module==='adm'&&t.status!=='Concluído').length;
            const tOu=window.tarefasItems.filter(t=>t.module==='outros'&&t.status!=='Concluído').length;
            const total=tC+tO+tA+tOu, legendEl=document.getElementById('dist-legend'), chartEl=document.getElementById('dist-pie-chart');
            const center=document.getElementById('donut-active-count');if(center)center.textContent=total;
            const colors=['#D4A64A','#4169A1','#2F806E','#8156A8'];
            if(!total){chartEl.style.background='conic-gradient(#D8C7A6 0deg 360deg)';legendEl.innerHTML='<div class="text-center italic">Nenhuma tarefa ativa.</div>';return;}
            const vals=[tC,tO,tA,tOu];let angle=0;const stops=vals.map((v,i)=>{const from=angle;angle+=v/total*360;return `${colors[i]} ${from}deg ${angle}deg`;});
            chartEl.style.background=`conic-gradient(${stops.join(',')})`;
            const labels=['Tesouraria','Construção','Burocracia','Outras missões'];
            legendEl.innerHTML=vals.map((v,i)=>`<div title="${labels[i]}"><span class="w-3 h-3 rounded-full block shrink-0 border border-black/20" style="background:${colors[i]}"></span><span>${labels[i]} (${v})</span></div>`).join('');
            const k1=document.getElementById('kpi-overdue'),k2=document.getElementById('kpi-third'),k3=document.getElementById('kpi-done');
            const today=window.ctTaskToday();const overdue=window.tarefasItems.filter(t=>t.status!=='Concluído'&&t.date&&new Date(t.date+'T00:00:00')<today).length+window.contabilItems.filter(i=>i.status!=='Concluído'&&i.vencimentoBoleto&&new Date(i.vencimentoBoleto+'T00:00:00')<today).length;
            if(k1)k1.textContent=overdue;if(k2)k2.textContent=window.tarefasItems.filter(t=>t.status==='Aguardando Terceiros').length;
            const weekAgo=new Date(today);weekAgo.setDate(today.getDate()-6);if(k3)k3.textContent=window.tarefasItems.filter(t=>t.status==='Concluído'&&t.updatedAt&&new Date(t.updatedAt)>=weekAgo).length+window.contabilItems.filter(i=>i.status==='Concluído'&&i.updatedAt&&new Date(i.updatedAt)>=weekAgo).length;
            if(k1)k1.style.color=overdue?'#B5122A':'';
        }

        window.filterByCalendarDate=function(key){window.focusDateFilter=window.focusDateFilter===key?null:key;window.renderUrgentes();window.renderTarefasKanban();window.showToast(window.focusDateFilter?'Filtrando demandas de '+formatDate(key):'Filtro de data removido');};
        window.renderCalendar = function() {
            const grid = document.getElementById('calendar-grid');
            if(!grid) return; grid.innerHTML = '';
            const today = new Date(); today.setHours(0,0,0,0);
            const currentDay = today.getDay();
            const start = new Date(today); start.setDate(today.getDate() - currentDay);
            let dead = new Date(today), pay = new Date(today);
            if (currentDay <= 2) { dead.setDate(today.getDate() + (2 - currentDay)); pay.setDate(today.getDate() + (4 - currentDay) + 7); } 
            else { dead.setDate(today.getDate() + (2 - currentDay) + 7); pay.setDate(today.getDate() + (4 - currentDay) + 14); }
            
            for(let i=0; i<21; i++) {
                const d = new Date(start); d.setDate(start.getDate() + i);
                const isToday = d.getTime() === today.getTime(), isDead = d.getTime() === dead.getTime(), isPay = d.getTime() === pay.getTime();
                let cls = "ct-calendar-day bg-ctonia-abyssal border-ctonia-darkmint text-white", icon = "", semantic = "ct-calendar-day";
                if(isToday) { semantic = "ct-calendar-day ct-calendar-today"; cls = "ct-calendar-day ct-calendar-today pulse-today bg-ctonia-magenta/20 border-ctonia-magenta text-ctonia-salmon font-bold relative -translate-y-1"; icon = '<div class="ct-calendar-label text-[10px] font-bold absolute bottom-0 left-1/2 -translate-x-1/2 text-ctonia-magenta">HOJE</div>'; }
                else if(isDead) { semantic = "ct-calendar-day ct-calendar-deadline"; cls = "ct-calendar-day ct-calendar-deadline bg-ctonia-salmon/20 border-ctonia-salmon text-ctonia-salmon font-bold"; icon = '<i class="fa-solid fa-scroll text-ctonia-salmon block mb-1"></i>'; }
                else if(isPay) { semantic = "ct-calendar-day ct-calendar-payment"; cls = "ct-calendar-day ct-calendar-payment bg-ctonia-mystic/20 border-ctonia-luminous text-ctonia-luminous font-bold"; icon = '<i class="fa-solid fa-coins text-ctonia-luminous block mb-1"></i>'; }
                const key=d.toISOString().split('T')[0];const taskDue=window.tarefasItems.some(t=>t.status!=='Concluído'&&t.date===key), payDue=window.contabilItems.some(t=>t.status!=='Concluído'&&t.dataPagamento===key);const dots=(taskDue||payDue)?`<span class="flex gap-1 mt-1">${taskDue?'<i class="w-1.5 h-1.5 rounded-full bg-rose-500"></i>':''}${payDue?'<i class="w-1.5 h-1.5 rounded-full bg-blue-500"></i>':''}</span>`:'';grid.innerHTML += `<button type="button" onclick="window.filterByCalendarDate('${key}')" title="Ver demandas de ${formatDate(key)}" class="flex flex-col items-center justify-center p-2 rounded-md border ${cls} transition-all h-16 relative shadow-sm">${icon}<span class="${isToday ? 'mb-2': ''}">${d.getDate()}</span><span class="text-[9px] opacity-70 uppercase ${isToday ? 'hidden' : ''}">${d.toLocaleDateString('pt-BR', {month:'short'})}</span>${dots}</button>`;
            }
            const leg = document.getElementById('calendar-legend-text');
            if(leg) leg.innerHTML = `NFs enviadas até <strong>Terça (${formatDate(dead.toISOString().split('T')[0])})</strong> pagam em <strong>Quinta (${formatDate(pay.toISOString().split('T')[0])})</strong>.`;
        }

        window.renderUrgentes = function() {
            const list=document.getElementById('urgentes-list');if(!list)return;list.innerHTML='';
            const today=window.ctTaskToday?window.ctTaskToday():new Date();today.setHours(0,0,0,0);
            const limit=new Date(today);limit.setDate(today.getDate()+7);
            const urg=[];
            window.contabilItems.forEach(i=>{if(i.status!=='Concluído'&&i.dataPagamento){const d=new Date(i.dataPagamento+'T00:00:00');if(!isNaN(d)&&d<=limit)urg.push({type:'Tesouraria',title:i.title||i.emissor,date:d,orig:i.dataPagamento,icon:'fa-coins'});}});
            window.tarefasItems.forEach(i=>{
                if(i.status==='Concluído')return;
                if(i.date){const d=new Date(i.date+'T00:00:00');if(!isNaN(d)&&d<=limit)urg.push({type:'Prazo',title:i.title,date:d,orig:i.date,icon:'fa-calendar-days',id:i.id,module:i.module,detail:'Prazo da missão'});}
                if(i.followup){const d=new Date(i.followup+'T00:00:00');if(!isNaN(d)&&d<=today)urg.push({type:'Acompanhamento',title:i.title,date:d,orig:i.followup,icon:'fa-bell',id:i.id,module:i.module,detail:'Data de acompanhamento'});}
                if(i.status==='Aguardando Terceiros'){
                    const since=i.waitingSince||i.updatedAt||i.createdAt;const age=since?Math.floor((today-new Date(since).setHours(0,0,0,0))/86400000):0;
                    if(age>=3)urg.push({type:'Sem retorno externo',title:i.title,date:today,orig:i.date||'',icon:'fa-people-arrows-left-right',id:i.id,module:i.module,detail:`Aguardando há ${age} dias`});
                }
            });
            const unique=new Map();urg.forEach(u=>{const key=[u.type,u.id||u.title,u.orig].join('|');if(!unique.has(key))unique.set(key,u);});
            let arr=[...unique.values()].sort((a,b)=>a.date-b.date);if(window.focusDateFilter)arr=arr.filter(u=>u.orig===window.focusDateFilter);if(window.focusModeActive)arr=arr.filter(u=>u.id&&u.type==='Prazo'&&u.date<=today&&window.tarefasItems.some(t=>String(t.id)===String(u.id)&&t.status==='Em Andamento')); 
            if(!arr.length){list.innerHTML='<div class="text-sm text-ctonia-nightsky text-center py-4 italic">Nenhum prazo ou acompanhamento urgente.</div>';return;}
            arr.slice(0,20).forEach(u=>{
                const diff=Math.ceil((u.date-today)/86400000);
                let txt=u.type==='Sem retorno externo'?u.detail:u.type==='Acompanhamento'?(diff<0?'Acompanhamento atrasado':diff===0?'Acompanhar hoje':'Acompanhar'):diff<0?'Atrasado':diff===0?'Vence hoje':`Em ${diff} dias`;
                const cls=(diff===0?'ct-urgent-today text-ctonia-abyssal bg-ctonia-magenta border-white':(diff<0||u.type==='Sem retorno externo')?'text-white bg-ctonia-magenta/30 border-ctonia-magenta':'text-ctonia-salmon bg-ctonia-abyssal border-ctonia-darkmint');
                const row=document.createElement('button');row.type='button';row.className=`w-full text-left flex items-center gap-2.5 p-2.5 rounded border ${cls} transition-all hover:brightness-110 cursor-pointer`; 
                const ctN=(String(u.detail||'').match(/\d+/)||[''])[0];
                const ctChip=u.type==='Sem retorno externo'?`Sem retorno${ctN?' · '+ctN+(ctN==='1'?' dia':' dias'):''}`:txt;
                const ctSub=u.type==='Sem retorno externo'?'':(u.detail||u.type);
                row.title=u.title||'';
                row.innerHTML=`<i class="fa-solid ${u.icon} text-base opacity-80 shrink-0 w-5 text-center"></i><div class="flex-1 min-w-0"><p class="text-xs font-bold leading-snug break-words" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${window.ctEscape(u.title||'Sem título')}</p><div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[10px] leading-tight"><span class="font-bold uppercase tracking-wide whitespace-nowrap px-1.5 py-0.5 rounded" style="background:color-mix(in srgb,currentColor 14%,transparent)">${window.ctEscape(ctChip)}</span><span class="whitespace-nowrap opacity-90">${window.ctEscape(window.formatDate(u.orig)||'')}</span>${ctSub?`<span class="italic opacity-80 min-w-0 truncate">${window.ctEscape(ctSub)}</span>`:''}</div></div>${u.id?`<button title="Concluir missão" aria-label="Concluir missão" onclick="event.stopPropagation();window.updateTarefaStatus('${window.ctEscape(u.id)}','Concluído')" class="urgent-check shrink-0 w-6 h-6 rounded border border-current flex items-center justify-center font-bold">✓</button>`:''}`;
                row.onclick=()=>{if(u.id){window.openTarefas(u.module||'outros');setTimeout(()=>window.openTaskDetail(u.id),0);}else if(u.type==='Tesouraria'){window.showView('view-contabil');}};
                list.appendChild(row);
            });
        }
        // Urgências: mostra no máximo 3 cards por vez; o restante fica acessível rolando a lista.
        window.ctUrgentesMaxVisiveis = 3;

        /* === Livro de Feituras: resumo da semana no hub === */
        window.openMedicoes=function(){ if(window.parent&&window.parent!==window&&window.parent.openCtoniaMedicoes) window.parent.openCtoniaMedicoes(); else window.showToast('Abra o Livro de Feituras pelo Portal Ctônia.'); };
        window.ctRenderMedCard=function(){
            let S={meds:[]}; try{S=JSON.parse(localStorage.getItem('ct_medicoes_v1'))||S;}catch(e){}
            const NM=['Elaboração','Aprovação do gestor','Assinatura do parceiro','Solicitar NF','Enviar p/ Patrícia','Na contabilidade','Nº Único / Pagamento','Pago'],CO=['#9aa0b5','#e9c46a','#c792ea','#7aa2f7','#8f9bff','#f78c6c','#4fc3d9','#5fcfa8'];
            const w=new Date(); w.setHours(0,0,0,0); w.setDate(w.getDate()-(w.getDay()+6)%7);
            const tot=m=>(m.items||[]).reduce((s,i)=>s+(+i.qty||0)*(+i.price||0),0);
            const wk=(S.meds||[]).filter(m=>new Date(m.upd)>=w).sort((a,b)=>b.upd.localeCompare(a.upd));
            const brl=n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
            const set=(id,v)=>{const e=document.getElementById(id); if(e)e.textContent=v;};
            set('med-k-week',wk.length); set('med-k-open',(S.meds||[]).filter(m=>m.stage<8).length); set('med-k-val',brl(wk.reduce((s,m)=>s+tot(m),0)));
            const l=document.getElementById('med-week-list'); if(!l)return;
            l.innerHTML=wk.length?wk.slice(0,4).map(m=>`<div class="ct-med-it" style="--c:${CO[m.stage-1]}"><div><b>${window.ctEscape(m.partner)}</b><small>${m.id} · ${NM[m.stage-1]}</small></div><span>${brl(tot(m))}</span></div>`).join('')+(wk.length>4?`<div class="ct-med-empty">+${wk.length-4} nesta semana</div>`:''):'<div class="ct-med-empty">Nenhuma medição movimentada nesta semana.</div>';
        };
        window.addEventListener('storage',e=>{if(e.key==='ct_medicoes_v1')window.ctRenderMedCard();});
        window.addEventListener('focus',()=>window.ctRenderMedCard());
        window.ctRenderMedCard();
        window.ctFitUrgentes = function() {
            const list=document.getElementById('urgentes-list'); if(!list) return;
            const kids=[...list.children].filter(el=>el.offsetParent!==null);
            const max=window.ctUrgentesMaxVisiveis;
            list.style.maxHeight=''; list.style.flex='';
            if(kids.length<=max) return;
            const first=kids[0].getBoundingClientRect(), last=kids[max-1].getBoundingClientRect();
            const h=Math.ceil(last.bottom-first.top)+4;
            list.style.flex='none'; list.style.maxHeight=h+'px'; list.style.overflowY='auto';
        };
        (function(){
            let t=null; const schedule=()=>{ cancelAnimationFrame(t); t=requestAnimationFrame(window.ctFitUrgentes); };
            const start=()=>{ const list=document.getElementById('urgentes-list'); if(!list) return;
                new MutationObserver(schedule).observe(list,{childList:true});
                window.addEventListener('resize',schedule); schedule(); };
            if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
        })();

        // Navegação e Modais
        window.showView = function(viewId) {
            ['view-hub', 'view-contabil', 'view-tarefas'].forEach(id => document.getElementById(id).classList.add('hidden'));
            document.getElementById(viewId).classList.remove('hidden');
            if (viewId === 'view-contabil') window.renderKanban();
            if (viewId === 'view-hub') { window.renderCalendar(); window.renderUrgentes(); window.renderPieChart(); }
        }
        window.openTarefas = function(modulo) {
            window.currentTarefasModule = modulo;
            const titulos = { 'obra': 'Construções', 'adm': 'Burocracia', 'outros': 'Outras Missões' };
            document.getElementById('tarefas-title').innerText = `Missão: ${titulos[modulo]}`;
            window.showView('view-tarefas'); window.renderTarefasKanban();
        }
        window.openModal = (id) => { document.getElementById(id).classList.remove('hidden'); if(id==='modal-config') document.getElementById('input-api-key').value = localStorage.getItem('gemini_api_key') || ''; }
        window.closeModal = (id) => { document.getElementById(id).classList.add('hidden'); if(id==='modal-novo-item') window.resetPreview(); }
        window.saveApiKey = () => { localStorage.setItem('gemini_api_key', document.getElementById('input-api-key').value.trim()); window.showToast("Cristal salvo!"); window.closeModal('modal-config'); }

        // Render Kanban Tesouraria
        window.renderKanban = function() {
            const cols = { 'Pendente': document.getElementById('col-pendente'), 'Em Andamento': document.getElementById('col-andamento'), 'Concluído': document.getElementById('col-concluido') };
            const counts = { 'Pendente': 0, 'Em Andamento': 0, 'Concluído': 0 };
            if(!cols['Pendente']) return;
            Object.values(cols).forEach(col => col.innerHTML = '');
            const searchInput = document.getElementById('tesouraria-search');
            const normalizeSearch = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
            const query = normalizeSearch(searchInput ? searchInput.value.trim() : '');

            window.contabilItems.forEach(item => {
                const searchable = normalizeSearch(Object.entries(item || {}).map(([key,value]) => `${key} ${typeof value === 'object' ? JSON.stringify(value) : value ?? ''}`).join(' '));
                if (query && !searchable.includes(query)) return;
                if (cols[item.status]) {
                    counts[item.status]++;
                    let badges = '';
                    if (item.top) badges += `<span class="bg-ctonia-nightsky text-white text-[10px] font-bold px-2 py-0.5 rounded border border-ctonia-mystic ctonia-badge-top">TOP: ${item.top}</span>`;
                    if (item.nu && item.status === 'Concluído') badges += `<span class="bg-ctonia-luminous text-ctonia-abyssal text-[10px] font-bold px-2 py-0.5 rounded border border-ctonia-mystic ctonia-badge-nu"><i class="fa-solid fa-hashtag"></i> NU: ${item.nu}</span>`;
                    if (item.oc) badges += `<span class="bg-ctonia-salmon text-ctonia-abyssal text-[10px] font-bold px-2 py-0.5 rounded border border-ctonia-magenta ctonia-badge-oc"><i class="fa-solid fa-cart-shopping"></i> OC: ${item.oc}</span>`;
                    if (item.valorBoleto) badges += `<span class="bg-ctonia-indigo text-ctonia-salmon text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 border border-ctonia-darkmint ctonia-badge-boleto"><i class="fa-solid fa-barcode"></i> Boleto</span>`;
                    
                    let det = '';
                    if (item.emissor) det += `<div class="text-xs text-white/70 mb-1"><i class="fa-regular fa-building mr-1"></i> ${item.emissor}</div>`;
                    if (item.dataPagamento) det += `<div class="text-xs text-ctonia-luminous font-bold mb-1 ctonia-payment-date"> Pgto: ${formatDate(item.dataPagamento)}</div>`;
                    
                    const card = document.createElement('div');
                    card.className = "ct-task-card bg-ctonia-indigo/90 p-4 rounded-lg shadow-sm border border-ctonia-nightsky hover:border-ctonia-mystic transition-colors relative group cursor-grab active:cursor-grabbing pointer-events-auto text-white";
                    card.setAttribute('draggable', 'true');
                    card.ondragstart = (e) => window.handleDragStart(e, item.id, 'contabil');
                    
                    card.innerHTML = `
                        <div class="flex justify-between items-start mb-2 gap-2">
                            <h3 class="font-bold text-sm text-ctonia-salmon leading-tight">${item.title}</h3>
                            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onclick="window.extractItem('${item.id}', event)" aria-label="Extrair dados do lançamento" title="Extrair dados (OC, natureza, CR, TOP)" class="w-6 h-6 rounded bg-ctonia-abyssal text-ctonia-luminous hover:bg-ctonia-luminous hover:text-ctonia-abyssal border border-ctonia-darkmint flex items-center justify-center text-xs transition-colors"><i class="fa-solid fa-clipboard-list"></i></button>
                                <button onclick="window.editItem('${item.id}', event)" class="w-6 h-6 rounded bg-ctonia-abyssal text-ctonia-luminous hover:bg-ctonia-luminous hover:text-ctonia-abyssal border border-ctonia-darkmint flex items-center justify-center text-xs transition-colors"><i class="fa-solid fa-pen"></i></button>
                                <button onclick="window.confirmDelete('${item.id}', 'contabil', event)" class="w-6 h-6 rounded bg-ctonia-abyssal text-ctonia-magenta hover:bg-ctonia-magenta hover:text-white border border-ctonia-darkmint flex items-center justify-center text-xs transition-colors"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-1 mb-2">${badges}</div>
                        ${det}
                        <div class="mt-3 pt-3 border-t border-ctonia-darkmint flex justify-between items-end">
                            <div class="text-sm font-bold text-white">${formatCurrency(item.valorDoc)}</div>
                            <select onchange="window.updateStatus('${item.id}', this.value, event)" onclick="(e) => e.stopPropagation()" class="text-xs bg-ctonia-abyssal border border-ctonia-darkmint rounded px-1 py-1 text-ctonia-salmon outline-none cursor-pointer">
                                <option value="Pendente" ${item.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                                <option value="Em Andamento" ${item.status === 'Em Andamento' ? 'selected' : ''}>Andamento</option>
                                <option value="Concluído" ${item.status === 'Concluído' ? 'selected' : ''}>Concluído</option>
                            </select>
                        </div>
                    `;
                    card.onclick = (e) => { if(e.target.tagName!=='SELECT'&&!e.target.closest('button')) window.editItem(item.id, e); };
                    cols[item.status].appendChild(card);
                }
            });
            document.getElementById('count-pendente').innerText = counts['Pendente'];
            document.getElementById('count-andamento').innerText = counts['Em Andamento'];
            document.getElementById('count-concluido').innerText = counts['Concluído'];
        }

        // Gestão de missões: compatível com registros antigos e modo offline.
        window.ctEscape = function(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); };
        window.ctTaskToday = function(){ const d=new Date(); d.setHours(0,0,0,0); return d; };
        window.ctTaskLog = function(item, text, kind='nota') {
            item.history = Array.isArray(item.history) ? item.history : [];
            item.history.unshift({ id: window.generateId(), at: new Date().toISOString(), text: String(text), kind });
            if(item.history.length > 100) item.history = item.history.slice(0,100);
            item.updatedAt = new Date().toISOString();
        };
        window.persistTarefa = async function(item) {
            localStorage.setItem('tarefas_items', JSON.stringify(window.tarefasItems));
            try { if (userId) await setDoc(doc(db, 'artifacts', appId, 'users', userId, 'tarefas_items', item.id), item); }
            catch(e) { console.warn('Sincronização da missão pendente; registro preservado localmente.', e); }
        };
        window.openNovaTarefa = function() {
            const form=document.getElementById('form-nova-tarefa'); form.reset();
            document.getElementById('input-tarefa-id').value='';
            document.getElementById('input-tarefa-status').value='Pendente';
            document.getElementById('input-tarefa-module').value=window.currentTarefasModule||'obra';
            document.querySelector('#modal-nova-tarefa h3').textContent='Nova Missão';
            window.openModal('modal-nova-tarefa');
        };
        window.editTarefa = function(id) {
            const item=window.tarefasItems.find(t=>String(t.id)===String(id)); if(!item) return;
            document.getElementById('input-tarefa-id').value=item.id;
            document.getElementById('input-tarefa-module').value=item.module||window.currentTarefasModule||'obra';
            document.getElementById('input-tarefa-title').value=item.title||'';
            document.getElementById('input-tarefa-desc').value=item.desc||'';
            document.getElementById('input-tarefa-date').value=item.date||'';
            document.getElementById('input-tarefa-status').value=item.status||'Pendente';
            document.getElementById('input-tarefa-responsavel').value=item.responsavel||'';
            document.getElementById('input-tarefa-terceiro').value=item.terceiro||'';
            document.getElementById('input-tarefa-followup').value=item.followup||'';
            document.getElementById('input-tarefa-next').value=item.nextAction||'';
            document.getElementById('input-tarefa-conclusao').value=item.conclusao||'';
            document.getElementById('input-tarefa-checklist').value=(item.checklist||[]).map(c=>(c.done?'[x] ':'')+c.text).join('\n');
            document.getElementById('input-tarefa-note').value='';
            document.querySelector('#modal-nova-tarefa h3').textContent='Editar Missão';
            window.closeTaskDetail(); window.openModal('modal-nova-tarefa');
        };
        window.openTaskDetail = function(id) {
            const item=window.tarefasItems.find(t=>String(t.id)===String(id)); if(!item) return;
            let modal=document.getElementById('ct-task-detail-modal');
            if(!modal){ modal=document.createElement('div'); modal.id='ct-task-detail-modal'; modal.className='fixed inset-0 z-[60] bg-[#0f0917]/90 flex items-center justify-center p-3 md:p-6'; document.body.appendChild(modal); }
            const checklist=Array.isArray(item.checklist)?item.checklist:[];
            const done=checklist.filter(c=>c.done).length;
            const history=Array.isArray(item.history)?item.history:[];
            // Histórico enxuto: exibe apenas o estado mais recente de cada etapa do checklist.
            // Isso evita uma lista longa de reaberturas repetidas durante edições sucessivas.
            const checklistEvents=new Map();
            history.forEach(h=>{
                const match=String(h.text||'').match(/^Etapa (concluída|reaberta|aberta):\s*(.+)$/i);
                if(!match) return;
                const step=match[2].trim();
                const key=step.toLocaleLowerCase('pt-BR');
                if(!checklistEvents.has(key)) checklistEvents.set(key,{step,done:/concluída/i.test(match[1]),at:h.at||Date.now()});
            });
            const logs=checklistEvents.size?[...checklistEvents.values()].map(h=>`<div class="border-l-2 ${h.done?'border-emerald-600':'border-amber-600'} pl-3 py-1"><div class="text-[10px] text-ctonia-nightsky">${window.ctEscape(new Date(h.at).toLocaleString('pt-BR'))}</div><p class="text-sm text-ctonia-salmon break-words">${h.done?'Concluída':'Aberta'}: ${window.ctEscape(h.step)}</p></div>`).join(''):'<p class="text-sm text-ctonia-nightsky italic">Ainda não há etapas concluídas ou abertas registradas.</p>';
            const eid=window.ctEscape(item.id);
            const nextBlock=item.status==='Concluído'
              ?`<div class="ct-concl rounded-lg p-4"><div class="flex justify-between items-center mb-1"><div class="ct-concl-label text-xs uppercase tracking-wider font-bold"><i class="fa-solid fa-flag-checkered mr-1"></i>Conclusão:</div><button onclick="window.askConclusao('${eid}')" class="ct-concl-label text-xs underline">${item.conclusao?'Editar':'Escrever'}</button></div><p class="ct-concl-text text-sm whitespace-pre-wrap">${window.ctEscape(item.conclusao||'Nenhum resumo registrado ainda.')}</p></div>`
              :`<div class="ct-next ct-next-modal rounded-lg p-4"><div class="ct-next-label text-xs uppercase tracking-wider font-bold mb-1"><i class="fa-solid fa-arrow-right mr-1"></i>Próxima ação</div><p class="ct-next-text text-sm whitespace-pre-wrap">${window.ctEscape(item.nextAction||'Defina a próxima ação ao editar a missão.')}</p></div>`;
            const chkInline=checklist.length?'':`<section><h3 class="font-medieval text-ctonia-salmon font-bold mb-2">Checklist</h3><textarea id="ct-chk-inline" rows="4" placeholder="Uma etapa por linha&#10;Ex.: Solicitar orçamento" class="w-full border border-ctonia-darkmint bg-ctonia-indigo/50 rounded px-3 py-2 text-sm"></textarea><div class="flex justify-end mt-2"><button onclick="window.saveChecklistInline('${eid}')" class="ct-btn-emerald px-3 py-1.5 rounded text-xs font-bold">Salvar checklist</button></div></section>`;
            const chkPanel=checklist.length?`<aside class="ct-chk-panel w-full md:w-80 md:shrink-0 ct-modal-shell rounded-xl bg-ctonia-abyssal shadow-2xl flex flex-col overflow-hidden"><div class="p-4 bg-ctonia-indigo border-b border-ctonia-darkmint flex justify-between items-center"><h3 class="font-medieval text-ctonia-salmon font-bold tracking-wide"><i class="fa-solid fa-list-check mr-2"></i>Checklist</h3><span class="ct-chk-count text-xs font-bold">${done}/${checklist.length}</span></div><div class="px-4 pt-3"><div class="ct-chk-track h-1.5 rounded-full overflow-hidden"><div class="ct-chk-fill h-full" style="width:${done/checklist.length*100}%"></div></div></div><div id="ct-chk-scroll" class="p-4 overflow-y-auto space-y-2">${checklist.map((c,i)=>window.ctChkRowHtml(item,c,i)).join('')}</div>${checklist.length>10?'<p class="px-4 pb-3 text-[10px] text-ctonia-nightsky">Role para ver as demais etapas.</p>':''}</aside>`:'';
            modal.innerHTML=`<div class="flex flex-col md:flex-row md:items-start justify-center gap-3 w-full max-h-[94vh] overflow-y-auto md:overflow-visible"><div class="w-full max-w-3xl md:flex-1 md:min-w-0 max-h-[94vh] overflow-hidden ct-modal-shell rounded-xl bg-ctonia-abyssal shadow-2xl flex flex-col">
              <div class="p-4 md:p-5 bg-ctonia-indigo border-b border-ctonia-darkmint flex justify-between gap-3 items-start"><div><p class="text-[10px] uppercase tracking-widest text-ctonia-luminous mb-1">${window.ctEscape(({obra:'Construção',adm:'Burocracia',outros:'Outras missões'})[item.module]||'Missão')} · ${window.ctEscape(item.status||'Pendente')}</p><h2 class="text-xl md:text-2xl font-medieval text-ctonia-salmon font-bold break-words">${window.ctEscape(item.title)}</h2></div><button onclick="window.closeTaskDetail()" class="text-ctonia-salmon p-2" aria-label="Fechar"><i class="fa-solid fa-xmark text-xl"></i></button></div>
              <div class="p-4 md:p-5 overflow-y-auto space-y-5 text-white">
                ${item.desc?`<p class="ct-f-desc ct-modal-desc text-sm whitespace-pre-wrap">${window.ctEscape(item.desc)}</p>`:''}
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div class="ct-tile ct-tile-prazo rounded p-3"><div class="ct-tile-label text-[10px] uppercase">Prazo</div><div class="ct-tile-val text-sm font-bold">${window.ctEscape(window.formatDate(item.date)||'Não definido')}</div></div>
                  <div class="ct-tile ct-tile-follow rounded p-3"><div class="ct-tile-label text-[10px] uppercase">Acompanhar</div><div class="ct-tile-val text-sm font-bold ${item.followup&&item.followup<=new Date().toISOString().slice(0,10)&&item.status!=='Concluído'?'is-due':''}">${window.ctEscape(window.formatDate(item.followup)||'Não definido')}</div></div>
                  <div class="ct-tile ct-tile-resp rounded p-3"><div class="ct-tile-label text-[10px] uppercase">Responsável</div><div class="ct-tile-val text-sm font-semibold">${window.ctEscape(item.responsavel||'Não atribuído')}</div></div>
                  <div class="ct-tile ct-tile-terc rounded p-3"><div class="ct-tile-label text-[10px] uppercase">Terceiro</div><div class="ct-tile-val text-sm font-semibold">${window.ctEscape(item.terceiro||'—')}</div></div>
                </div>
                ${nextBlock}
                ${chkInline}
                <section><h3 class="font-medieval text-ctonia-salmon font-bold mb-3">Histórico da missão</h3><div class="space-y-3 max-h-48 overflow-y-auto">${logs}</div></section>
              </div>
              <div class="p-4 bg-ctonia-indigo border-t border-ctonia-darkmint flex flex-wrap justify-end gap-2"><button onclick="window.editTarefa('${window.ctEscape(item.id)}')" class="ct-btn-emerald px-4 py-2 rounded text-sm font-bold"><i class="fa-solid fa-pen mr-2"></i>Editar missão</button><button onclick="window.closeTaskDetail()" class="px-4 py-2 rounded border border-ctonia-darkmint text-ctonia-salmon text-sm">Fechar</button></div>
            </div>${chkPanel}</div>`;
            (function(){const sc=document.getElementById('ct-chk-scroll');if(!sc)return;const r=[...sc.children];if(r.length<=10)return;const x=r[0].getBoundingClientRect(),y=r[9].getBoundingClientRect();sc.style.maxHeight=(Math.ceil(y.bottom-x.top)+32)+'px';})();
        };
        window.closeTaskDetail=function(){const m=document.getElementById('ct-task-detail-modal');if(m)m.remove();};
        window.toggleTarefaChecklist=async function(id,index,checked){
            const item=window.tarefasItems.find(t=>String(t.id)===String(id)); if(!item||!item.checklist||!item.checklist[index])return;
            const c=item.checklist[index]; if(!!c.done===!!checked)return;
            c.done=!!checked; c.completedAt=checked?new Date().toISOString():null;
            window.ctTaskLog(item,`${checked?'Etapa concluída':'Etapa reaberta'}: ${c.text}`,'checklist');
            const sc0=document.getElementById('ct-chk-scroll'),st0=sc0?sc0.scrollTop:0;
            await window.persistTarefa(item); window.renderTarefasKanban(); window.renderUrgentes(); window.openTaskDetail(id);
            const sc1=document.getElementById('ct-chk-scroll'); if(sc1) sc1.scrollTop=st0;
        };
        window.ctChkOpen=window.ctChkOpen||new Set();
        window.ctChkRowHtml=function(item,c,i){
            const E=window.ctEscape,id=E(item.id),subs=Array.isArray(c.sub)?c.sub:[],sd=subs.filter(s=>s.done).length,open=window.ctChkOpen.has(String(item.id)+':'+i);
            let h=`<div class="ct-chk-wrap"><label class="ct-chk-row flex gap-3 items-start p-2 rounded cursor-pointer"><input type="checkbox" ${c.done?'checked':''} ${subs.length?'disabled title="Concluída automaticamente pelas subtarefas"':''} onchange="window.toggleTarefaChecklist('${id}',${i},this.checked)" class="ct-chk-box mt-1"><span class="ct-chk-text text-sm flex-1 ${c.done?'is-done':''}">${E(c.text)}</span><button type="button" title="Subtarefas desta etapa" onclick="event.preventDefault();event.stopPropagation();window.toggleSubOpen('${id}',${i})" class="ct-sub-btn shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded border border-current opacity-80 hover:opacity-100"><i class="fa-solid fa-list-ul"></i>${subs.length?' '+sd+'/'+subs.length:''}</button></label>`;
            if(subs.length)h+=`<div class="ct-chk-track h-1 rounded-full overflow-hidden mx-2 mt-1"><div class="ct-chk-fill h-full" style="width:${sd/subs.length*100}%"></div></div>`;
            if(open)h+=`<div class="ml-6 mt-2 mb-1 pl-3 border-l-2 border-emerald-600/50 space-y-1.5">${subs.map((s,j)=>`<div class="flex gap-2 items-start"><input type="checkbox" ${s.done?'checked':''} onchange="window.toggleSub('${id}',${i},${j},this.checked)" class="ct-chk-box mt-0.5"><span class="ct-chk-text text-xs flex-1 ${s.done?'is-done':''}">${E(s.text)}</span><button type="button" onclick="window.delSub('${id}',${i},${j})" class="opacity-50 hover:opacity-100 text-xs" aria-label="Remover subtarefa">×</button></div>`).join('')}<div class="flex gap-1 pt-1"><input id="ct-sub-in" type="text" placeholder="Nova subtarefa…" onkeydown="if(event.key==='Enter'){event.preventDefault();window.addSub('${id}',${i})}" class="flex-1 min-w-0 border border-ctonia-darkmint bg-ctonia-indigo/50 rounded px-2 py-1 text-xs"><button type="button" onclick="window.addSub('${id}',${i})" class="ct-btn-emerald px-2 rounded text-xs font-bold">+</button></div></div>`;
            return h+'</div>';
        };
        window.ctKeepReopen=function(id,focus){
            const sc=document.getElementById('ct-chk-scroll'),st=sc?sc.scrollTop:0; window.openTaskDetail(id);
            const n=document.getElementById('ct-chk-scroll'); if(n)n.scrollTop=st;
            if(focus){const f=document.getElementById('ct-sub-in'); if(f)f.focus();}
        };
        window.ctSyncSub=function(item,c){
            if(!c.sub||!c.sub.length)return; const all=c.sub.every(s=>s.done);
            if(all!==!!c.done){c.done=all;c.completedAt=all?new Date().toISOString():null;window.ctTaskLog(item,`${all?'Etapa concluída':'Etapa reaberta'}: ${c.text}`,'checklist');}
        };
        window.ctSubCommit=async function(item,focus){
            await window.persistTarefa(item); window.renderTarefasKanban(); window.renderUrgentes(); window.ctKeepReopen(item.id,focus);
        };
        window.toggleSubOpen=function(id,i){const k=String(id)+':'+i; if(window.ctChkOpen.has(k))window.ctChkOpen.delete(k); else window.ctChkOpen.add(k); window.ctKeepReopen(id,true);};
        window.toggleSub=async function(id,i,j,checked){
            const item=window.tarefasItems.find(t=>String(t.id)===String(id)); const c=item&&item.checklist&&item.checklist[i]; if(!c||!c.sub||!c.sub[j])return;
            c.sub[j].done=!!checked; window.ctTaskLog(item,`${checked?'Subtarefa concluída':'Subtarefa reaberta'}: ${c.sub[j].text} (${c.text})`,'checklist');
            window.ctSyncSub(item,c); await window.ctSubCommit(item,false);
        };
        window.addSub=async function(id,i){
            const item=window.tarefasItems.find(t=>String(t.id)===String(id)); const c=item&&item.checklist&&item.checklist[i]; const inp=document.getElementById('ct-sub-in'); if(!c||!inp)return;
            const v=inp.value.trim(); if(!v)return; c.sub=Array.isArray(c.sub)?c.sub:[]; c.sub.push({text:v,done:false});
            window.ctTaskLog(item,`Subtarefa adicionada: ${v} (${c.text})`,'checklist'); window.ctChkOpen.add(String(id)+':'+i);
            window.ctSyncSub(item,c); await window.ctSubCommit(item,true);
        };
        window.delSub=async function(id,i,j){
            const item=window.tarefasItems.find(t=>String(t.id)===String(id)); const c=item&&item.checklist&&item.checklist[i]; if(!c||!c.sub||!c.sub[j])return;
            const [r]=c.sub.splice(j,1); window.ctTaskLog(item,`Subtarefa removida: ${r.text} (${c.text})`,'checklist');
            if(!c.sub.length)delete c.sub; else window.ctSyncSub(item,c); await window.ctSubCommit(item,true);
        };
        window.saveChecklistInline=async function(id){
            const item=window.tarefasItems.find(t=>String(t.id)===String(id)); const ta=document.getElementById('ct-chk-inline'); if(!item||!ta)return;
            const lines=ta.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean); if(!lines.length)return;
            item.checklist=lines.map(l=>({text:l.replace(/^\[(?:x| )\]\s*/i,'').trim(),done:/^\[x\]\s*/i.test(l)})).filter(c=>c.text);
            item.checklist.forEach(c=>window.ctTaskLog(item,'Etapa adicionada ao checklist: '+c.text,'checklist'));
            await window.persistTarefa(item); window.renderTarefasKanban(); window.openTaskDetail(id); window.showToast('Checklist salvo.');
        };
        window.askConclusao=function(id){
            const item=window.tarefasItems.find(t=>String(t.id)===String(id)); if(!item)return;
            const old=document.getElementById('ct-conclusao-modal'); if(old)old.remove();
            const m=document.createElement('div'); m.id='ct-conclusao-modal'; m.className='fixed inset-0 z-[80] bg-[#0f0917]/90 flex items-center justify-center p-4';
            const eid=window.ctEscape(item.id);
            m.innerHTML=`<div class="w-full max-w-lg rounded-xl bg-ctonia-abyssal shadow-2xl overflow-hidden" style="border:1px solid rgba(118,199,161,.38)"><div class="p-4 bg-ctonia-indigo border-b border-ctonia-darkmint"><p class="text-[10px] uppercase tracking-widest text-ctonia-luminous mb-1">Missão concluída</p><h2 class="text-lg font-medieval text-ctonia-salmon font-bold break-words">${window.ctEscape(item.title)}</h2></div><div class="p-4"><label class="block text-sm font-bold text-ctonia-salmon mb-2"><i class="fa-solid fa-flag-checkered mr-1"></i>Conclusão: o que deu no final?</label><textarea id="ct-conclusao-input" rows="5" placeholder="Resuma o resultado desta missão…" class="w-full border border-ctonia-darkmint bg-ctonia-indigo/50 rounded px-3 py-2 text-sm">${window.ctEscape(item.conclusao||'')}</textarea></div><div class="p-4 bg-ctonia-indigo border-t border-ctonia-darkmint flex justify-end gap-2"><button onclick="document.getElementById('ct-conclusao-modal').remove()" class="px-4 py-2 rounded border border-ctonia-darkmint text-ctonia-salmon text-sm">Depois</button><button onclick="window.saveConclusao('${eid}')" class="ct-btn-emerald px-4 py-2 rounded text-sm font-bold">Salvar conclusão</button></div></div>`;
            document.body.appendChild(m); setTimeout(()=>{const t=document.getElementById('ct-conclusao-input'); if(t)t.focus();},60);
        };
        window.saveConclusao=async function(id){
            const t=document.getElementById('ct-conclusao-input'); const v=t?t.value.trim():''; const md=document.getElementById('ct-conclusao-modal'); if(md)md.remove();
            const item=window.tarefasItems.find(x=>String(x.id)===String(id)); if(!item||v===(item.conclusao||''))return;
            item.conclusao=v; window.ctTaskLog(item,v?'Conclusão registrada: '+v:'Conclusão removida','status');
            await window.persistTarefa(item); window.renderTarefasKanban(); if(document.getElementById('ct-task-detail-modal'))window.openTaskDetail(id); window.showToast('Conclusão registrada.');
        };
        window.focusModeActive=false;window.focusDateFilter=null;
        window.toggleFocusMode=function(){window.focusModeActive=!window.focusModeActive;const b=document.getElementById('focus-mode-btn');if(b){b.classList.toggle('active',window.focusModeActive);b.innerHTML=window.focusModeActive?'◎ Foco Hoje: ativo':'◎ O Meu Foco Hoje';}window.renderTarefasKanban();window.renderKanban();window.renderUrgentes();};
        window.renderTarefasKanban = function() {
            const statusCols = {'Pendente':'col-tarefa-pendente','Em Andamento':'col-tarefa-andamento','Aguardando Terceiros':'col-tarefa-terceiros','Concluído':'col-tarefa-concluido'};
            const cols={}; Object.keys(statusCols).forEach(s=>cols[s]=document.getElementById(statusCols[s]));
            if(!cols['Pendente'])return; Object.values(cols).forEach(c=>{if(c)c.innerHTML='';});
            const all=window.tarefasItems.filter(t=>t.module===window.currentTarefasModule);
            const filter=document.getElementById('tarefas-responsavel-filter'), search=document.getElementById('tarefas-search');
            const currentResp=filter?filter.value:'';
            const respList=[...new Set(all.map(t=>(t.responsavel||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
            if(filter){const keep=filter.value;filter.innerHTML='<option value="">Todos responsáveis</option>'+respList.map(r=>`<option value="${window.ctEscape(r)}">${window.ctEscape(r)}</option>`).join('');filter.value=respList.includes(keep)?keep:'';}
            const q=(search?search.value:'').trim().toLocaleLowerCase('pt-BR');
            const today=window.ctTaskToday();const items=all.filter(t=>(!window.focusModeActive||(t.status==='Em Andamento'&&t.status!=='Aguardando Terceiros'&&(!t.date||new Date(t.date+'T00:00:00')<=today)))&&(!window.focusDateFilter||t.date===window.focusDateFilter||t.followup===window.focusDateFilter)&&(!filter||!filter.value||(t.responsavel||'')===filter.value)&&(!q||[t.title,t.desc,t.responsavel,t.terceiro,t.nextAction].some(v=>String(v||'').toLocaleLowerCase('pt-BR').includes(q))));
            const counts={};Object.keys(cols).forEach(s=>counts[s]=0);
            items.forEach(item=>{
                const status=cols[item.status]?item.status:'Pendente'; counts[status]++;
                const card=document.createElement('article');
                card.className='ct-task-card bg-ctonia-indigo/90 p-4 rounded-lg shadow-sm border border-ctonia-nightsky hover:border-ctonia-mystic transition-colors relative group pointer-events-auto text-white cursor-pointer';
                card.draggable=true;card.ondragstart=e=>window.handleDragStart(e,item.id,'tarefa');card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label','Abrir missão '+(item.title||''));
                card.onclick=e=>{if(e.target.closest('button,select,input,label'))return;window.openTaskDetail(item.id);};
                card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();window.openTaskDetail(item.id);}};
                const today=window.ctTaskToday(); const due=item.date?new Date(item.date+'T00:00:00'):null;const follow=item.followup?new Date(item.followup+'T00:00:00'):null;
                const overdue=due&&due<today&&status!=='Concluído';const followDue=follow&&follow<=today&&status!=='Concluído';
                const checklist=Array.isArray(item.checklist)?item.checklist:[];const done=checklist.filter(c=>c.done).length;
                card.innerHTML=`<div class="flex justify-between items-start gap-2 mb-2"><h3 class="font-bold text-sm text-ctonia-salmon leading-tight break-words">${window.ctEscape(item.title||'Missão sem título')}</h3><div class="flex gap-1 shrink-0"><button aria-label="Enviar missão ao Fosso" title="Enviar missão ao Fosso" onclick="event.stopPropagation();window.confirmDelete('${window.ctEscape(item.id)}','tarefa',event)" class="w-7 h-7 rounded bg-[#310d1b] text-[#ff637b] border border-[#9e1832] flex items-center justify-center hover:shadow-[0_0_10px_#b5122a]"><i class="fa-solid fa-skull text-xs"></i></button><button aria-label="Editar missão" title="Editar missão" onclick="event.stopPropagation();window.editTarefa('${window.ctEscape(item.id)}')" class="w-7 h-7 rounded bg-ctonia-abyssal text-ctonia-luminous border border-ctonia-darkmint flex items-center justify-center"><i class="fa-solid fa-pen text-xs"></i></button></div></div>
                ${item.desc?`<p class="ct-f-desc text-xs mb-2 italic line-clamp-2">${window.ctEscape(item.desc)}</p>`:''}
                <div class="flex flex-wrap gap-1 mb-2">${overdue?'<span class="text-[10px] px-2 py-1 rounded bg-rose-900/60 text-rose-200 border border-rose-500/50">Prazo atrasado</span>':''}${followDue?'<span class="text-[10px] px-2 py-1 rounded bg-amber-900/50 text-amber-200 border border-amber-500/40">Acompanhar agora</span>':''}</div>
                <div class="ct-f ct-f-prazo ${overdue?'is-overdue':''} text-xs font-bold mb-1"><i class="fa-regular fa-calendar mr-1"></i> Prazo: ${window.ctEscape(window.formatDate(item.date)||'—')}</div>
                ${item.followup?`<div class="ct-f ct-f-follow text-xs font-semibold mb-1"><i class="fa-solid fa-bell mr-1"></i> Acompanhar: ${window.ctEscape(window.formatDate(item.followup))}</div>`:''}
                ${item.responsavel?`<div class="ct-f ct-f-resp text-xs font-semibold mb-1"><i class="fa-solid fa-user mr-1"></i>${window.ctEscape(item.responsavel)}</div>`:''}
                ${item.terceiro?`<div class="ct-f ct-f-terc text-xs font-semibold mb-2"><i class="fa-solid fa-people-arrows-left-right mr-1"></i>${window.ctEscape(item.terceiro)}</div>`:''}
                ${item.status==='Concluído'?`<div class="ct-concl rounded p-2 text-xs mb-2"><span class="ct-concl-label"><i class="fa-solid fa-flag-checkered mr-1"></i>Conclusão:</span> <span class="ct-concl-text">${window.ctEscape(item.conclusao||'Sem resumo registrado.')}</span></div>`:(item.nextAction?`<div class="ct-next rounded p-2 text-xs mb-2"><span class="ct-next-label font-bold"><i class="fa-solid fa-arrow-right mr-1"></i>Próxima ação:</span> <span class="ct-next-text">${window.ctEscape(item.nextAction)}</span></div>`:'')}
                ${checklist.length?`<div class="mt-2 mb-3"><div class="ct-chk-meta flex justify-between text-[10px] font-semibold mb-1"><span>Checklist</span><span>${done}/${checklist.length}</span></div><div class="ct-chk-track h-1 rounded overflow-hidden"><div class="ct-chk-fill h-full" style="width:${done/checklist.length*100}%"></div></div></div>`:''}
                <select aria-label="Alterar status da missão" onclick="event.stopPropagation()" onchange="window.updateTarefaStatus('${window.ctEscape(item.id)}',this.value)" class="w-full text-xs bg-ctonia-abyssal border border-ctonia-darkmint text-ctonia-salmon rounded px-2 py-2 outline-none cursor-pointer"><option value="Pendente" ${status==='Pendente'?'selected':''}>Pendente</option><option value="Em Andamento" ${status==='Em Andamento'?'selected':''}>Em Andamento</option><option value="Aguardando Terceiros" ${status==='Aguardando Terceiros'?'selected':''}>Aguardando Terceiros</option><option value="Concluído" ${status==='Concluído'?'selected':''}>Concluído</option></select>`;
                cols[status].appendChild(card);
            });
            Object.keys(cols).forEach(s=>{const el=document.getElementById(s==='Pendente'?'count-tarefa-pendente':s==='Em Andamento'?'count-tarefa-andamento':s==='Aguardando Terceiros'?'count-tarefa-terceiros':'count-tarefa-concluido');if(el)el.textContent=counts[s]||0;});
        };

        // Drag and Drop Lógica - Kanban
        window.handleDragStart = function(e, id, type) { e.dataTransfer.setData('text/plain', JSON.stringify({id, type})); }
        window.handleDragOver = function(e) { 
            e.preventDefault(); 
            e.currentTarget.classList.add('border-ctonia-luminous', 'bg-ctonia-mystic/20', 'border-dashed'); 
            e.currentTarget.classList.remove('border-ctonia-darkmint'); 
        }
        window.handleDragLeave = function(e) { 
            e.currentTarget.classList.remove('border-ctonia-luminous', 'bg-ctonia-mystic/20', 'border-dashed'); 
            e.currentTarget.classList.add('border-ctonia-darkmint'); 
        }
        window.handleDrop = function(e, newStatus, columnType) {
            e.preventDefault();
            e.currentTarget.classList.remove('border-ctonia-luminous', 'bg-ctonia-mystic/20', 'border-dashed');
            e.currentTarget.classList.add('border-ctonia-darkmint');
            try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                if(data.type !== columnType) return window.showToast("Você não pode misturar pergaminhos de guilda diferente!", "error");
                
                if (columnType === 'contabil') {
                    const item = window.contabilItems.find(i => i.id === data.id);
                    if (newStatus === 'Concluído' && (!item.nu || item.nu.trim() === '')) {
                        window.editItem(data.id); document.getElementById('input-status').value = 'Concluído'; window.toggleNuField();
                        return window.showToast("O Tesouro exige o Número Único (NU) para selar!", "error");
                    }
                    window.updateStatus(data.id, newStatus);
                } else if (columnType === 'tarefa') window.updateTarefaStatus(data.id, newStatus);
            } catch(err) {}
        }

        // PDF e Form Lógica
        let currentPreviewUrl = null;
        window.resetPreview = function() {
            const frame = document.getElementById('pdf-preview-frame'), placeholder = document.getElementById('preview-placeholder');
            if(currentPreviewUrl) { URL.revokeObjectURL(currentPreviewUrl); currentPreviewUrl = null; }
            if(frame) { frame.src = ''; frame.classList.add('hidden'); }
            if(placeholder) {
                placeholder.classList.remove('hidden');
                placeholder.innerHTML = `<i class="fa-solid fa-file-pdf text-7xl mb-4 opacity-50 drop-shadow-md text-ctonia-mystic"></i><p class="font-medieval text-xl font-bold text-ctonia-salmon">O pergaminho aparecerá aqui</p><p class="text-sm font-body italic mt-2 opacity-80">Arraste um PDF ou XML ao lado</p>`;
            }
        }
        window.previewFile = function(file) {
            const frame = document.getElementById('pdf-preview-frame'), placeholder = document.getElementById('preview-placeholder');
            if(currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
            if (file.type === 'application/pdf') {
                currentPreviewUrl = URL.createObjectURL(file);
                frame.src = currentPreviewUrl; frame.classList.remove('hidden'); placeholder.classList.add('hidden');
            } else if (file.type === 'text/xml' || file.name.endsWith('.xml')) {
                frame.classList.add('hidden'); placeholder.classList.remove('hidden');
                placeholder.innerHTML = `<i class="fa-solid fa-file-code text-7xl mb-4 text-ctonia-luminous opacity-80 drop-shadow-md"></i><p class="font-medieval text-xl font-bold text-ctonia-luminous">XML Carregado</p>`;
            }
        }

        const dropzone = document.getElementById('upload-dropzone'), dropOverlay = document.getElementById('drop-overlay');
        if(dropzone) {
            dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropOverlay.classList.remove('hidden'); });
            dropzone.addEventListener('dragleave', (e) => { e.preventDefault(); if(e.relatedTarget === dropzone || dropzone.contains(e.relatedTarget)) return; dropOverlay.classList.add('hidden'); });
            dropzone.addEventListener('drop', (e) => {
                e.preventDefault(); dropOverlay.classList.add('hidden');
                if(e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    const file = e.dataTransfer.files[0];
                    if (file.type === 'application/pdf') { window.previewFile(file); window.processPdfFileLocal(file, 'auto'); } 
                    else if (file.type === 'text/xml' || file.name.endsWith('.xml')) { window.previewFile(file); window.processXmlFileLocal(file); } 
                    else window.showToast("Use apenas PDF ou XML.", "error");
                }
            });
        }

        window.calculateNextPaymentDate = function(baseDate = new Date()) {
            const d = new Date(baseDate); const day = d.getDay();
            let daysToAdd = day <= 2 ? (4 - day) + 7 : (4 - day) + 14;
            d.setDate(d.getDate() + daysToAdd); return d.toISOString().split('T')[0];
        }
        document.getElementById('input-data-emissao')?.addEventListener('change', (e) => {
            if(!document.getElementById('input-id').value && !document.getElementById('input-vencimento-boleto').value) document.getElementById('input-data-pagamento').value = window.calculateNextPaymentDate(new Date());
        });
        window.toggleNuField = function() {
            const s = document.getElementById('input-status').value, c = document.getElementById('container-nu');
            if(s === 'Concluído') { c.classList.remove('hidden'); document.getElementById('input-nu').focus(); } else c.classList.add('hidden');
        }
        document.getElementById('input-valor-doc')?.addEventListener('input', (e) => {
            if((parseFloat(e.target.value) || 0) > 1000) document.getElementById('container-oc').classList.remove('hidden'); 
            else { document.getElementById('container-oc').classList.add('hidden'); document.getElementById('input-oc').value = ''; }
        });

        // Catálogo de naturezas carregado de naturezas.xlsx (código -> descrição).
        const CT_NATUREZA_CATALOGO = {"8030101":"PRÉDIOS DE USO","2060104":"CONTRA PARTIDAS","2060103":"CERCAMENTO DA APP","2060102":"MONITORAMENTO AMBIENTAL","2060101":"COMPENSAÇÕES AMBIENTAIS","2050101":"RATEIO ADM","2040603":"EQUIPAMENTOS SALA DE JOGOS","2040602":"EQUIPAMENTOS DE ACADEMIA","2040601":"MÓVEIS E UTENSILIOS","2040505":"SKATE - FORNECIMENTO/EXECUÇÃO","2040504":"ACADEMIA A CÉU ABERTO - FORNEC/EXECUÇÃO","2040503":"ESPAÇO PET - FORNECIMENTO/EXECUÇÃO","2040502":"PISTAS DE CAMINHADA - FORNEC/EXECUÇÃO","2040501":"PLAYGROUND - FORNECIMENTO/EXECUÇÃO","2040404":"QUADRA DE TÊNIS - FORNECIMENTO/EXECUÇÃO","2040403":"QUADRA DE AREIA - FORNECIMENTO/EXECUÇÃO","2040402":"CAMPO DE FUTEBOL - FORNECIMENTO/EXECUÇÃO","2040401":"QUADRA POLIESPORTIVA - FORNEC/EXECUÇÃO","2040301":"PISCINA - FORNECIMENTO E EXECUÇÃO","2040211":"COWORKING - FORNECIMENTO E EXECUÇÃO","2040210":"QUIOSQUE/PERGOLADO - FORNEC EXECUÇÃO","2040209":"BANHEIROS/VESTIÁRIOS - FORNEC EXECUÇÃO","2040208":"SALA GERADOR/CASA MÁQ - FORNEC EXECUÇÃO","2040207":"ESPAÇO DE JOGOS -FORNECIMENTO E EXECUÇÃO","2040206":"ESPAÇO KIDS - FORNECIMENTO E EXECUÇÃO","2040205":"FITNESS - FORNECIMENTO E EXECUÇÃO","2040204":"ESPAÇO GOURMET - FORNECIMENTO E EXECUÇÃO","2040203":"SALÃO DE FESTAS -FORNECIMENTO E EXECUÇÃO","2040202":"GUARITA - FORNECIMENTO E EXECUÇÃO","2040201":"CALÇADAS - FORNECIMENTO E EXECUÇÃO","2040101":"MURO PERIMETRAL - FORNECIMENTO/EXECUÇÃO","2031203":"SINALIZAÇÃO SEMAFÓRICA","2031202":"SINALIZAÇÃO VERTICAL","2031201":"SINALIZAÇÃO HORIZONTAL","2031104":"PRAÇAS E MONUMENTOS - CONSTRUÇÃO/EQUIP","2031103":"ENLEIVAMENTO - FORNECIMENTO E EXECUÇÃO","2031102":"ARBORIZAÇÃO - FORNECIMENTO E EXECUÇÃO","2031101":"PAISAGISMO - FORNECIMENTO E EXECUÇÃO","2031011":"OBRAS DE ARTE ESPECIAIS","2031010":"OBRA EXTERNA (ACESSO)","2031009":"MACRODENAGEM","2031008":"CARREGADOR VEICULAR ELÉTRICO","2031007":"PAINEL SOLAR","2031006":"POÇO ARTESIANO","2031005":"MANTA PEAD(0,8MM)LAGOS/SISTEMA FILTRAGEM","2031004":"REFORMA DA CASA DE BOMBAS 06","2031003":"MEIO FIO - CONTENÇÃO","2031002":"ESPELHO DA ÁGUA","2031001":"MURO DE CONTENÇÃO","2030902":"TELEFONIA/INTERNET FORNECIMENTO EXECUÇÃO","2030901":"SEGURANÇA -FORNECIMENTO E EXECUÇÃO","2030802":"EXECUÇÃO DO SISTEMA DE ELETRIFICAÇÃO","2030801":"FORNECIMENTO DE MATERIAL ELÉTRICO","2030721":"CALÇADAS - FORNECIMENTO E EXECUÇÃO","2030720":"GEOGRELHA PARA REFORÇO DE SOLO","2030719":"REGULARIZ E COMPACTAÇÃO SUB-LEITO 100%PN","2030718":"CAMADA DE CBUQ - FORNECIMENTO E EXECUÇÃO","2030717":"PINTURA LIGAÇÃO FORNECIMENTO E EXECUÇÃO","2030716":"IMPRIMAÇÃO CM30  FORNECIMENTO E EXECUÇÃO","2030715":"ASSENTAMENTO DE BLOCO DE CONCRETO PAVER","2030714":"ASSENT MEIO FIO DE CONCRETO PRÉ MOLDADO","2030713":"EXECUÇÃO DE MEIO FIO EXTRUSADO","2030712":"EXECUÇÃO DE SUB-BASE","2030711":"EXECUÇÃO DE BASE","2030710":"EXECUÇÃO DE REFORÇO DO SUB LEITO","2030709":"FORNECIMENTO DE AREIA PARA REJUNTAMENTO","2030708":"FORNECIMENTO DE BLOCO DE CONCRETO PAVER","2030707":"FORNECIMENTO MATERIAL MEIO FIO EXTRUSADO","2030706":"FORNECIMENTO DE MEIO FIO PRÉ MOLDADO","2030705":"FORNEC PÓ DE BRITA-COLCHÃO ASSENT BLOCO","2030704":"FORNECIMENTO DE BRITA GRADUADA","2030703":"FORNECIMENTO DE BICA CORRIDA","2030702":"FORNECIMENTO DE RACHÃO","2030701":"FORNECIMENTO SOLO P/ REFORÇO SUB LEITO","2030604":"EXECUÇÃO DE RAMAIS DE ÁGUA INDIVIDUAIS","2030603":"ASSENT REDE DISTRIBUIÇÃO ÁGUA C/ACESSO","2030602":"SISTEMA ELEVAÇÃO E RESERV-EXEC MATERIAIS","2030601":"FORNECIMENTO MATERIAIS REDE DE ÁGUA","2030503":"EXECUÇÃO ESTAÇÃO TRATAMENTO ESGOTO - ETE","2030502":"EXECUÇÃO ESTAÇÃO ELEVATÓRIA ESGOTO - EBE","2030501":"FORNEC. MAT. TRATAMENTO ESGOTO CLOACAL","2030405":"ASSENTAMENTO DA REDE DE ESGOTO CLOACAL","2030404":"EXECUÇÃO DE TIL","2030403":"EXECUÇÃO DE CAIXA C/ RAMAL DO CLOACAL","2030402":"EXECUÇÃO DE P.V. PARA REDE CLOACAL","2030401":"FORNECIMENTO MATERIAIS ESGOTO CLOACAL","2030315":"ASSENTAMENTO DE TUBOS DE CONCRETO 300MM","2030314":"ASSENTAMENTO DE TUBO DE CONCRETO 1500MM","2030313":"ASSENTAMENTO DE TUBO DE CONCRETO 1200MM","2030312":"EXCEUÇÃO DE EBA PLUVIAL","2030311":"EXECUÇÃO DE ALA DA DRENAGEM","2030310":"EXECUÇÃO DESCIDA DÁGUA ATERRO EM DEGRAUS","2030309":"EXECUÇÃO DE POÇO DE VISITA","2030308":"EXECUÇÃO DE BOCAS DE LOBO","2030307":"ASSENTAMENTO DE GALERIA DE CONCRETO","2030306":"ASSENTAMENTO DE TUBO DE CONCRETO 1000MM","2030305":"ASSENTAMENTO DE TUBOS DE CONCRETO 800MM","2030304":"ASSENTAMENTO DE TUBOS DE CONCRETO 600MM","2030303":"ASSENTAMENTO DE TUBOS DE CONCRETO 500MM","2030302":"ASSENTAMENTO DE TUBOS DE CONCRETO 400MM","2030301":"FORNECIMENTO MATERIAIS DRENAGEM PLUVIAL","2030209":"RECEBIMENTO DE ATERRO","2030208":"LOCAÇÃO DE EQUIPAMENTOS TERRAPLANAGEM","2030207":"COMPACTAÇÃO DE ATERROS A 95% P.N.","2030206":"ESPALHAMENTO DE ATERRO","2030205":"ESCAVAÇÃO ESPELHAM SOLO MOLE S/ TRANSP","2030204":"ESCAV CARGA TRANSP MAT 1A CAT DMT >200M","2030203":"ESCAV CARGA TRANSP MAT 1A CAT DMT <200M","2030202":"ESCAV CARGA TRANSP MAT 1A CAT DMT < 50M","2030201":"DESM. DEST. LIMPEZA ÁREAS","2030107":"TAXAS DE FISCALIZAÇÕES","2030106":"LOCAÇÃO DE APOIO","2030105":"SEGURANÇA DA OBRA","2030104":"SERVIÇOS DE TOPOGRAFIA","2030103":"SERVIÇOS ÁGUA/ENERGIA/COMUNICAÇÃO","2030102":"PLACAS DE OBRAS, SINALIZAÇÃO","2030101":"DESPESAS INICIAIS","2020203":"IPTU / ITR","2020202":"REGISTRO DE IMÓVEIS","2020201":"LEGALIZAÇÃO DA ÁREA","2020105":"PROJETOS COMPLEMENTARES","2020104":"PROJETOS DE EDIFICAÇÕES","2020103":"PROJETOS URBANÍSTICOS","2020102":"PROJETOS AMBIENTAIS","2020101":"PROJETOS ANÁLISE PRÉVIA DE VIABILIDADE","2010104":"DESAPROPRIAÇÃO","2010103":"COMISSÃO/INTERMEDIAÇÃO","2010102":"DESPESAS LEGAIS","2010101":"CUSTO DA ÁREA","1050104":"AFETAÇÃO PATRIMONIAL","1050103":"IR E GANHO DE CAPITAL","1050102":"CONTRIBUIÇÃO SOCIAL SOBRE LL","1050101":"IRPJ","1040114":"RECUPERAÇÃO CUSTAS CARTÓRIO/NOTIFICAÇÕES","1040113":"RECUPERAÇÃO DE CONDOMÍNIOS E ASSOCIAÇÕES","1040112":"RECUPERAÇÃO DE IPTU","1040111":"RECUPERAÇÃO DE SEGUROS","1040110":"RECEITA TAXAS/CUSTAS (NOTIF/IPTU/OUTROS)","1040109":"RECEITAS FINANCEIRAS","1040108":"RECEITA INDENIZATÓRIA","1040107":"OUTRAS RECEITAS NÃO OPERACIONAIS","1040106":"RECEITAS DE SENTENÇAS JUDICIAIS","1040105":"CUSTOS RECUPERADOS/RECUPERAÇÃO DESPESAS","1040104":"VENDA DE IMOBILIZADO","1040103":"VENDA DE PARTICIPAÇÕES SOCIETÁRIAS","1040102":"RESULTADO DE PART. SOCIETÁRIAS-RECEBER","1040101":"DIVIDENDOS E BONIFICAÇÕES","1030609":"OUTRAS DESPESAS COM VEÍCULOS","1030608":"SEGURO DE VEÍCULOS/EQUIPAMENTOS","1030607":"MULTAS DE TRÂNSITO","1030606":"MANUTENÇÃO - VEÍCULOS/EQUIPAMENTOS","1030605":"LUBRIFICANTES, ÓLEOS, FILTROS E LAVAGEM","1030604":"RENTAL/LOCAÇÕES","1030603":"PNEUS E RODANTES","1030602":"SERV. DE DESPACH./IPVA/LICENC/TAXAS EXTR","1030601":"COMBUSTÍVEL","1030505":"OUTRAS DESPESAS DE VIAGEM","1030504":"CONDUÇÃO","1030503":"REFEIÇÕES","1030502":"HOSPEDAGENS","1030501":"PASSAGENS","1030407":"COMPRA DE PLANTAS","1030406":"EVENTOS / CONFRATERNIZAÇÃO / FEIRAS","1030405":"BRINDES E PRESENTES","1030404":"BENS DE PEQUENO VALOR","1030403":"MATERIAL DE EXPEDIENTE","1030402":"MATERIAL DE CONSUMO","1030401":"COPA E COZINHA","1030326":"TREINAMENTO","1030325":"HORAS TÉCNICAS SANKHYA","1030324":"LOCAÇÃO DE BENS MÓVEIS","1030323":"CONDENAÇÕES CIVEIS","1030322":"PROVISÕES","1030321":"SEGUROS E GARANTIAS","1030320":"DEPRECIAÇÃO","1030319":"DOAÇÕES","1030318":"LOCAÇÃO DE MÁQUINAS E EQUIPAMENTOS","1030317":"LOCAÇÃO DE IMÓVEIS","1030316":"RATEIO DE DESPESAS ADMINISTRATIVAS","1030315":"FRETES, CORREIOS E POSTAIS","1030314":"ASSINATURA DIGITAL, CERTIFICAÇÃO","1030313":"CÓPIAS E REPRODUÇÕES","1030312":"CUSTAS PROCESSUAIS E JUDICIAIS","1030311":"CUSTAS DE CARTÓRIO E REGISTROS","1030310":"TAXAS E CONTRIBUIÇÕES","1030309":"SIND. PATRONAL/ASSOC. DE CLASSE /CREA","1030308":"LICENÇAS E SERVIÇOS DE INFORMÁTICA","1030307":"SERVIÇO DE CONTRATO E COBRANÇA","1030306":"PUBLICIDADE INSTITUCIONAL","1030305":"MANUTENÇÃO E CONSERVAÇÃO DE EDIFICIOS","1030304":"MANUTENÇÃO MÁQUINAS E EQUIPAMENTOS","1030303":"VIGILÂNCIA E SEGURANÇA","1030302":"TELEFONE/INTERNET","1030301":"ENERGIA ELÉTRICA/ÁGUA","1030206":"MARINA/MARINHEIRO","1030205":"ASSESSORIA TÉCNICA","1030204":"ASSESSORIA JURÍDICA","1030203":"ASSESSORIA CONTÁBIL","1030202":"MOTO BOY","1030201":"ASSESSORIA DE INFORMÁTICA","1030128":"Uniformes e EPI's","1020811":"CONDUÇÃO-DESASTRES NATURAIS","1020810":"PASSAGENS-DESASTRES NATURAIS","1020809":"LOCAÇÃO VEÍCULOS-DESASTRES NATURAIS","1020808":"MEDICINA NO TRABALHO-DESASTRES NATURAIS","1020807":"MÍDIAS-DESASTRES NATURAIS","1020806":"CUSTAS PROCES/JUDIC-DESASTRES NATURAIS","1020805":"INDENIZAÇÃO-DESASTRES NATURAIS","1020804":"HOSPEDAGEM-DESASTRES NATURAIS","1020803":"ALIMENTAÇÃO-DESASTRES NATURAIS","1020802":"MO/SERVIÇOS-DESASTRES NATURAIS","1020801":"MATERIAL-DESASTRES NATURAIS","1020703":"MATERIAL - OBRAS Ñ REALIZADAS","1020702":"MO TERCEIRAZ/SERVIÇO-OBRAS Ñ REALIZADAS","1020701":"MO PRÓPRIA-OBRAS Ñ REALIZADAS","1020601":"COMISSAO CORRETORES","1020508":"INDENIZACOES CLIENTES","1020507":"INDENIZACOES TRABALHISTAS","1020506":"SEGURO PRESTAMISTA","1020505":"CUSTOS CARTÓRIO/REGISTRO/NOTIF/JUDICIAL","1020504":"DESP. HONORÁRIOS ADVOCATÍCIOS/PERICIAIS","1020503":"DESPESAS DE FINANCIAMENTO","1020502":"SEGURANÇA/SERVIÇOS","1020501":"TAXAS E IMPOSTOS (IPTU/ITBI/ITR/OUTROS)","1020402":"COND E ASSOCIAÇÕES-DISTRATOS","1020401":"COND E ASSOCIAÇÕES-REGULAR","1020304":"RATEIO ADM POS OBRAS","1020303":"MATERIAL","1020302":"MO TERCEIRIZADA/SERVIÇOS","1020301":"MO PRÓPRIA","1020219":"RATEIO MO PROPRIA","1020218":"COMISSÃO VENDAS TERCEIRIZADA","1020217":"MÍDIAS SOCIAIS-REEMB REDES SOCIAIS PARC","1020216":"INSTALAÇÃO PLANTÃO DE VENDAS","1020215":"MATERIAL DE APOIO","1020214":"MATERIAL LANÇAMENTO","1020213":"EVENTOS - FEIRAS, AÇÕES GERAIS","1020212":"EVENTOS - LANÇAMENTOS E ENTREGA","1020211":"AÇÕES PROMOCIONAIS","1020210":"COMUNICAÇÃO PDV","1020209":"MÍDIA EXTERIOR","1020208":"IMPRESSOS","1020207":"MÍDIAS SOCIAIS - GOOGLE","1020206":"MÍDIAS SOCIAIS - FACEBOOK/INSTAGRAM/OLX","1020205":"ONLINE","1020204":"TV","1020203":"JORNAL","1020202":"RÁDIO","1020201":"MO TERCEIRIZADA (FEE AGÊNCIAS)","1020102":"CUSTO UNID VENDIDAS - INCORP. IMÓVEIS","1020101":"PARTICIPAÇÃO SCPS","1010404":"ISSQN","1010403":"ICMS","1010402":"COFINS","1010401":"PIS","1010302":"DEVOLUÇÃO DIF. HONORÁRIOS ADVOCATÍCIOS","1010301":"DEVOLUÇÃO CONTRATO DE VENDA","1010213":"RECEITA LOCAÇÃO DE IMOVEIS","1010212":"RECEITA TAXAS (CESSAO/HON/TRANSF/ANUENC)","1010211":"RECEITA DE GESTÃO ADMINISTRATIVA","1010210":"RECEITA DE MONITORAMENTO ELETRONICO","1010209":"RECEITA - LOCAÇÃO DE EQUIPAMENTOS","1010208":"RECEITA - HONORÁRIOS DE SUCUMBÊNCIAS","1010207":"RECEITA - CORRETAGEM","1010206":"RECEITA DE INVESTIMENTOS TRANSITÓRIOS","1010205":"RECEITA - TAXA ADMINISTRAÇÃO CONTRATOS","1010204":"RECEITA - CONSULTORIA FINANCEIRA","1010203":"RECEITA - HONORÁRIOS ADVOCATÍCIOS","1010202":"RECEITA - SERVIÇOS PRESTADOS ATERRO","1010201":"RECEITA - OBRAS PÚBLICAS","1010104":"RECEITA IMOBILIÁRIA","1010103":"RECEITA IMOBILIÁRIA LOTEAMENTO","1010101":"RECEITA IMOBILIÁRIA INCORPORAÇÃO","2060105":"DOAÇÕES RECEBIDAS","2030336":"ASSENTAMENTO DE CANALETA DE CONCRETO DN400","2030335":"ASSENTAMENTO DE CANALETA DE CONCRETO DN300","2040212":"PRÉDIOS- FORNECIMENTO E EXECUÇÃO","2040701":"PRAIA ARTIFICIAL-FORNEC E EXECUÇÃO","8011022":"VALORES A RECUPERAR - LAGO AZUL","2040213":"APOIO DE SERVIÇO - FORNECIMENTO E EXECUÇÃO","1020220":"EVENTOS - AÇÕES DO COMERCIAL"};
        window.lookupNatureDescription = function(tipo) {
            const real = tipo === 'real';
            const input = document.getElementById(real ? 'input-natureza-real' : 'input-natureza-lancada');
            const output = document.getElementById(real ? 'natureza-real-descricao' : 'natureza-lancada-descricao');
            if (!input || !output) return;
            const raw = String(input.value || '').trim();
            const codigo = raw.replace(/\.0$/, '');
            if (!raw) { output.textContent = ''; output.style.color = ''; return; }
            const nome = CT_NATUREZA_CATALOGO[codigo];
            if (nome) { output.textContent = nome; output.style.color = '#7bf0c3'; }
            else if (/^\d+$/.test(codigo)) { output.textContent = 'Código de natureza não encontrado'; output.style.color = '#f5a4a4'; }
            else { output.textContent = 'Digite o código numérico da natureza'; output.style.color = ''; }
        };

        // Extração de dados do lançamento (OC, natureza, descrição, CR, TOP) em texto pronto para copiar.
        window.buildExtractText = function(item) {
            const up = v => String(v ?? '').replace(/\s+/g, ' ').trim().toLocaleUpperCase('pt-BR');
            const oc = up(item.oc) || 'SEM OC';
            const cod = String(item.naturezaLancada || '').trim().replace(/\.0$/, '');
            const nome = cod ? CT_NATUREZA_CATALOGO[cod] : '';
            const natureza = cod ? up(cod + (nome ? ' - ' + nome : '')) : 'SEM NATUREZA LANÇADA';
            const descricao = up(item.descricao || item.title) || 'SEM DESCRIÇÃO';
            const crCod = String(item.cr || item.centroResultado || '').trim();
            let cr = 'SEM CR';
            if (crCod) {
                const opt = [...document.querySelectorAll('#input-cr option')].find(o => o.value === crCod);
                cr = up(opt ? opt.textContent : crCod);
            }
            let top = String(item.top || '').trim();
            if (!top) {
                const achou = String((item.descricao || '') + ' ' + (item.title || '')).match(/\bTOP\s*[:\-–#nº°.]*\s*(\d{1,3})\b/i);
                if (achou) top = achou[1];
            }
            top = up(top) || 'SEM TOP';
            return 'OC: ' + oc + '\n\nNATUREZA: ' + natureza + '\n\nDESCRIÇÃO: ' + descricao + '\n\nCR: ' + cr + '\n\nTOP: ' + top;
        };
        window.closeExtractModal = function() { const m = document.getElementById('ct-extract-modal'); if (m) m.remove(); document.removeEventListener('keydown', window._ctExtractEsc); };
        window._ctExtractEsc = function(e) { if (e.key === 'Escape') window.closeExtractModal(); };
        window.copyExtractText = function() {
            const ta = document.getElementById('ct-extract-text'); if (!ta) return;
            const done = () => window.showToast('Texto copiado!');
            ta.focus(); ta.select();
            try { if (document.execCommand('copy')) return done(); } catch (e) {}
            if (navigator.clipboard) navigator.clipboard.writeText(ta.value).then(done).catch(() => window.showToast('Não foi possível copiar. Selecione o texto e copie manualmente.', 'error'));
        };
        window.extractItem = function(id, event) {
            if (event) event.stopPropagation();
            const item = window.contabilItems.find(i => String(i.id) === String(id));
            if (!item) return;
            window.closeExtractModal();
            const modal = document.createElement('div');
            modal.id = 'ct-extract-modal';
            modal.className = 'fixed inset-0 bg-[#0f0917]/90 z-[70] flex items-center justify-center p-4';
            modal.onclick = e => { if (e.target === modal) window.closeExtractModal(); };
            modal.innerHTML = `<div class="bg-ctonia-abyssal rounded-xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden border border-ctonia-magenta" role="dialog" aria-modal="true" aria-label="Dados extraídos do lançamento">
                <div class="p-4 bg-ctonia-indigo border-b border-ctonia-darkmint flex justify-between items-start gap-3"><div><p class="text-[10px] uppercase tracking-widest text-ctonia-luminous mb-1">Extração de dados</p><h3 class="text-lg font-medieval font-bold text-ctonia-salmon break-words">${window.ctEscape(item.title || 'Lançamento')}</h3></div><button onclick="window.closeExtractModal()" class="text-ctonia-mystic hover:text-ctonia-magenta" aria-label="Fechar"><i class="fa-solid fa-xmark text-xl"></i></button></div>
                <div class="p-4 overflow-y-auto"><textarea id="ct-extract-text" readonly rows="12" class="w-full border border-ctonia-darkmint bg-ctonia-indigo/50 rounded px-3 py-3 text-sm text-white font-semibold leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-ctonia-mystic"></textarea></div>
                <div class="p-4 bg-ctonia-indigo border-t border-ctonia-darkmint flex flex-wrap justify-end gap-2"><button onclick="window.copyExtractText()" class="ct-btn-emerald px-4 py-2 rounded text-sm font-bold"><i class="fa-solid fa-copy mr-2"></i>Copiar texto</button><button onclick="window.closeExtractModal()" class="px-4 py-2 rounded border border-ctonia-darkmint text-ctonia-salmon text-sm">Fechar</button></div>
            </div>`;
            document.body.appendChild(modal);
            const ta = document.getElementById('ct-extract-text');
            ta.value = window.buildExtractText(item);
            ta.rows = Math.min(16, ta.value.split('\n').length + 1);
            document.addEventListener('keydown', window._ctExtractEsc);
        };

        // Crud
        window.saveItem = async function() {
            const form = document.getElementById('form-novo-item');
            if(!form.checkValidity()) { form.reportValidity(); return; }
            const id = document.getElementById('input-id').value, status = document.getElementById('input-status').value, nu = document.getElementById('input-nu').value;
            if(status === 'Concluído' && !nu.trim()) return window.showToast("Preencha o NU!", "error");
            
            const itemData = {
                title: document.getElementById('input-title').value, descricao: document.getElementById('input-description').value,
                pedido: document.getElementById('input-pedido').value, nu: nu, status: status, top: document.getElementById('input-top').value,
                cr: document.getElementById('input-cr').value, naturezaReal: document.getElementById('input-natureza-real').value.trim(),
                naturezaLancada: document.getElementById('input-natureza-lancada').value.trim(),
                valorDoc: document.getElementById('input-valor-doc').value, emissor: document.getElementById('input-emissor').value,
                cnpjEmissor: document.getElementById('input-cnpj-emissor').value, cnpjDest: document.getElementById('input-cnpj-dest').value,
                dataEmissao: document.getElementById('input-data-emissao').value, dataPagamento: document.getElementById('input-data-pagamento').value,
                oc: document.getElementById('input-oc').value, valorBoleto: document.getElementById('input-valor-boleto').value,
                vencimentoBoleto: document.getElementById('input-vencimento-boleto').value, linhaDigitavel: document.getElementById('input-linha').value,
                updatedAt: new Date().toISOString(), id: id || window.generateId()
            };
            
            const idx = window.contabilItems.findIndex(i => i.id === itemData.id);
            if (idx !== -1) window.contabilItems[idx] = { ...window.contabilItems[idx], ...itemData }; else window.contabilItems.push(itemData);
            localStorage.setItem('contabil_items', JSON.stringify(window.contabilItems));
            window.renderKanban(); window.renderUrgentes(); window.renderPieChart(); window.showToast("Lançamento Registrado!");
            
            try { if(userId) await setDoc(doc(db, 'artifacts', appId, 'users', userId, 'contabil_items', itemData.id), itemData); } catch(e){}
            
            window.closeModal('modal-novo-item'); form.reset(); document.getElementById('input-id').value = ''; document.getElementById('input-status').value = 'Pendente'; window.toggleNuField(); document.getElementById('container-oc').classList.add('hidden');
        }

        window.editItem = function(id, event) {
            if(event) event.stopPropagation();
            const item = window.contabilItems.find(i => i.id === id);
            if (item) {
                // Preenche os campos do formulário
                ['id','title','description','pedido','status','nu','top','valor-doc','emissor','cnpj-emissor','cnpj-dest','data-emissao','data-pagamento','oc','valor-boleto','vencimento-boleto','linha'].forEach(k => {
                    const el = document.getElementById(`input-${k}`); if(el) el.value = item[k==='description'?'descricao':k==='valor-doc'?'valorDoc':k==='cnpj-emissor'?'cnpjEmissor':k==='cnpj-dest'?'cnpjDest':k==='data-emissao'?'dataEmissao':k==='data-pagamento'?'dataPagamento':k==='valor-boleto'?'valorBoleto':k==='vencimento-boleto'?'vencimentoBoleto':k==='linha'?'linhaDigitavel':k] || '';
                });
                document.getElementById('input-cr').value = item.cr || item.centroResultado || '';
                document.getElementById('input-natureza-real').value = item.naturezaReal || '';
                document.getElementById('input-natureza-lancada').value = item.naturezaLancada || '';
                window.lookupNatureDescription('real'); window.lookupNatureDescription('lancada');
                window.toggleNuField();
                if(parseFloat(item.valorDoc||0) > 1000) document.getElementById('container-oc').classList.remove('hidden'); else document.getElementById('container-oc').classList.add('hidden');
                document.getElementById('modal-title').innerText = "Editar Documento"; window.openModal('modal-novo-item');
            }
        }

        window.updateStatus = async function(id, newStatus, event) {
            if(event) event.stopPropagation();
            if(newStatus === 'Concluído') { window.editItem(id); document.getElementById('input-status').value = 'Concluído'; window.toggleNuField(); window.showToast("Insira o NU para finalizar.", "error"); } 
            else {
                const item = window.contabilItems.find(i => i.id === id);
                if(item) {
                    item.status = newStatus; localStorage.setItem('contabil_items', JSON.stringify(window.contabilItems));
                    window.renderKanban(); window.renderUrgentes(); window.renderPieChart();
                    try { if(userId) await setDoc(doc(db, 'artifacts', appId, 'users', userId, 'contabil_items', id), item); } catch(e){}
                }
            }
        }

        window.saveTarefa = async function() {
            const form=document.getElementById('form-nova-tarefa');
            if(!form.checkValidity()){form.reportValidity();return;}
            const existingId=document.getElementById('input-tarefa-id').value;
            const item=existingId?window.tarefasItems.find(t=>String(t.id)===String(existingId)):null;
            const title=document.getElementById('input-tarefa-title').value.trim();
            if(!title){window.showToast('Informe um título para a missão.','error');return;}
            const rawChecklist=document.getElementById('input-tarefa-checklist').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
            const oldChecklist=item&&Array.isArray(item.checklist)?item.checklist:[];
            const checklist=rawChecklist.map(line=>{
                const done=/^\[x\]\s*/i.test(line);const text=line.replace(/^\[(?:x| )\]\s*/i,'').trim();
                const old=oldChecklist.find(c=>c.text.toLocaleLowerCase('pt-BR')===text.toLocaleLowerCase('pt-BR'));
                const r={text,done:old?!!old.done:done};
                if(old&&Array.isArray(old.sub)&&old.sub.length){r.sub=old.sub;r.done=old.sub.every(s=>s.done);}
                return r;
            }).filter(c=>c.text);
            const nextStatus=document.getElementById('input-tarefa-status').value;
            const itemData={
                ...(item||{}), id:existingId||window.generateId(), module:(document.getElementById('input-tarefa-module')||{}).value||(item?item.module:window.currentTarefasModule),
                title, desc:document.getElementById('input-tarefa-desc').value.trim(),
                date:document.getElementById('input-tarefa-date').value, status:nextStatus,
                responsavel:document.getElementById('input-tarefa-responsavel').value.trim(),
                terceiro:document.getElementById('input-tarefa-terceiro').value.trim(),
                followup:document.getElementById('input-tarefa-followup').value,
                nextAction:document.getElementById('input-tarefa-next').value.trim(),
                conclusao:document.getElementById('input-tarefa-conclusao').value.trim(),
                checklist, createdAt:item?.createdAt||new Date().toISOString(), updatedAt:new Date().toISOString(),
                history:Array.isArray(item?.history)?item.history:[]
            };
            if(item){
                const changed=[];
                const ctModNomes={obra:'Construções',adm:'Burocracia',outros:'Outras Missões'};
                if(item.module!==itemData.module)changed.push(`Missão movida de ${ctModNomes[item.module]||item.module||'—'} para ${ctModNomes[itemData.module]||itemData.module}`);
                if(item.title!==itemData.title)changed.push('Título atualizado');
                if(item.status!==itemData.status)changed.push(`Status alterado: ${item.status||'Pendente'} → ${itemData.status}`);
                if(item.date!==itemData.date)changed.push(`Prazo alterado para ${window.formatDate(itemData.date)||'não definido'}`);
                if(item.responsavel!==itemData.responsavel)changed.push(`Responsável: ${itemData.responsavel||'não atribuído'}`);
                if(item.terceiro!==itemData.terceiro)changed.push(`Terceiro/órgão: ${itemData.terceiro||'removido'}`);
                if(item.followup!==itemData.followup)changed.push(`Acompanhamento: ${window.formatDate(itemData.followup)||'removido'}`);
                if(item.nextAction!==itemData.nextAction)changed.push(`Próxima ação atualizada: ${itemData.nextAction||'não definida'}`);
                const before=Array.isArray(item.checklist)?item.checklist:[];
                const beforeMap=new Map(before.map(c=>[String(c.text).toLocaleLowerCase('pt-BR'),c]));
                itemData.checklist.forEach(c=>{const prev=beforeMap.get(c.text.toLocaleLowerCase('pt-BR'));if(!prev)changed.push(`Etapa adicionada ao checklist: ${c.text}`);else if(!!prev.done!==!!c.done)changed.push(`${c.done?'Etapa concluída':'Etapa reaberta'}: ${c.text}`);});
                before.forEach(c=>{if(!itemData.checklist.some(n=>n.text.toLocaleLowerCase('pt-BR')===String(c.text).toLocaleLowerCase('pt-BR')))changed.push(`Etapa removida do checklist: ${c.text}`);});
                if(item.status!==itemData.status){if(itemData.status==='Aguardando Terceiros')itemData.waitingSince=new Date().toISOString();else itemData.waitingSince=null;}
                changed.forEach(t=>window.ctTaskLog(itemData,t,'alteracao'));
                const note=document.getElementById('input-tarefa-note').value.trim();if(note)window.ctTaskLog(itemData,note,'nota');
                const idx=window.tarefasItems.findIndex(t=>String(t.id)===String(existingId));window.tarefasItems[idx]=itemData;
            } else {
                if(itemData.status==='Aguardando Terceiros')itemData.waitingSince=new Date().toISOString();
                window.ctTaskLog(itemData,'Missão criada.','sistema');
                const note=document.getElementById('input-tarefa-note').value.trim();if(note)window.ctTaskLog(itemData,note,'nota');
                window.tarefasItems.push(itemData);
            }
            await window.persistTarefa(itemData);
            window.renderTarefasKanban();window.renderUrgentes();window.renderPieChart();
            window.closeModal('modal-nova-tarefa');
            const ctMovida=item&&item.module!==itemData.module;
            window.showToast(ctMovida?'Missão movida para a nova categoria, com todo o histórico preservado.':(item?'Missão atualizada e histórico registrado.':'Missão criada com sucesso.'));
            if(ctMovida||(!item&&itemData.module!==window.currentTarefasModule)){window.openTarefas(itemData.module);}
            if(itemData.status==='Concluído'&&(!item||item.status!=='Concluído')&&!itemData.conclusao)setTimeout(()=>window.askConclusao(itemData.id),200);
        };
        window.updateTarefaStatus = async function(id,s) {
            const item=window.tarefasItems.find(i=>String(i.id)===String(id));if(!item)return;
            if(item.status===s)return;
            const old=item.status||'Pendente';item.status=s;
            if(s==='Aguardando Terceiros')item.waitingSince=new Date().toISOString();else item.waitingSince=null;
            window.ctTaskLog(item,`Status alterado: ${old} → ${s}`,'status');
            if(s==='Concluído')item.completedAt=new Date().toISOString();else item.completedAt=null;
            await window.persistTarefa(item);window.renderTarefasKanban();window.renderUrgentes();window.renderPieChart();
            window.showToast(`Status atualizado: ${s}`);
            if(s==='Concluído')window.askConclusao(id);
        }

        window.confirmDelete = function(id, type, event) { if(event) event.stopPropagation(); itemToDeleteId = String(id); deleteType = type; window.openModal('modal-confirm-delete'); }
        window.confirmDeleteExec = async function() {
            try {
                const isTreasury = deleteType === 'contabil';
                const source = isTreasury ? window.contabilItems : window.tarefasItems;
                const item = source.find(i => String(i.id) === String(itemToDeleteId));
                if (!item) { window.closeModal('modal-confirm-delete'); return; }
                const deletedAt = new Date().toISOString();
                const trashKey = `${deleteType}_${item.id}`;
                const trashItem = {...item, trashType: deleteType, deletedAt, trashKey};
                window.trashItems = (window.trashItems || []).filter(t => t.trashKey !== trashKey);
                window.trashItems.push(trashItem);
                if (isTreasury) { window.contabilItems = window.contabilItems.filter(i => String(i.id) !== String(itemToDeleteId)); localStorage.setItem('contabil_items', JSON.stringify(window.contabilItems)); window.renderKanban(); }
                else { window.tarefasItems = window.tarefasItems.filter(i => String(i.id) !== String(itemToDeleteId)); localStorage.setItem('tarefas_items', JSON.stringify(window.tarefasItems)); window.renderTarefasKanban(); }
                localStorage.setItem('ctonia_fosso_items', JSON.stringify(window.trashItems));
                if (userId && db) {
                    await setDoc(doc(db, 'artifacts', appId, 'users', userId, 'trash_items', trashKey), trashItem);
                    await deleteDoc(doc(db, 'artifacts', appId, 'users', userId, isTreasury ? 'contabil_items' : 'tarefas_items', String(itemToDeleteId)));
                }
                window.renderUrgentes(); window.renderPieChart(); window.renderFossoCount();
                window.closeModal('modal-confirm-delete'); window.showToast('Entregue ao Fosso. As almas terão 30 dias.', 'success');
            } catch(e) { console.error('Falha ao enviar ao Fosso',e); window.showToast('Não foi possível mover o registro para a lixeira.', 'error'); }
        }

        window.openFosso = function(){ window.purgeExpiredTrash(); window.renderFosso(); document.getElementById('fosso-overlay').classList.remove('hidden'); };
        window.closeFosso = function(){ document.getElementById('fosso-overlay').classList.add('hidden'); };
        window.renderFossoCount = function(){ const el=document.getElementById('fosso-count');if(el)el.textContent=(window.trashItems||[]).length; };
        window.purgeExpiredTrash = async function(){
            const now=Date.now(), keep=[];
            for(const item of (window.trashItems||[])){
                const deleted=Date.parse(item.deletedAt||'');
                if(!deleted || now-deleted < 30*24*60*60*1000){keep.push(item);continue;}
                if(userId&&db){try{await deleteDoc(doc(db,'artifacts',appId,'users',userId,'trash_items',item.trashKey||`${item.trashType}_${item.id}`));}catch(e){keep.push(item);}}
            }
            window.trashItems=keep;localStorage.setItem('ctonia_fosso_items',JSON.stringify(keep));window.renderFossoCount();
        };
        window.renderFosso = function(){
            const host=document.getElementById('fosso-items'),summary=document.getElementById('fosso-summary');if(!host)return;
            const items=[...(window.trashItems||[])].sort((a,b)=>Date.parse(b.deletedAt||0)-Date.parse(a.deletedAt||0));
            if(summary)summary.textContent=`${items.length} ${items.length===1?'registro':'registros'}`;
            if(!items.length){host.innerHTML='<div class="fosso-empty"><div class="text-4xl mb-4 opacity-60">☠</div>O Fosso está silencioso... nenhuma alma aguarda por aqui.</div>';return;}
            host.innerHTML=items.map(item=>{const days=Math.max(0,30-Math.floor((Date.now()-Date.parse(item.deletedAt||Date.now()))/86400000));const title=item.title||item.emissor||'Registro sem título';const type=item.trashType==='contabil'?'Tesouraria':'Missão';return `<article class="fosso-item"><div class="fosso-item-main"><div class="fosso-item-title"><i class="fa-solid fa-skull mr-2 text-[#8c85bd]"></i>${window.ctEscape(title)}</div><div class="fosso-item-meta">${type} · Enviado em ${window.ctEscape(window.formatDate((item.deletedAt||'').slice(0,10))||'data desconhecida')} · ${days} ${days===1?'dia':'dias'} até o banimento definitivo</div></div><div class="relative z-10 flex gap-2 flex-wrap justify-end"><button class="fosso-action restore" onclick="window.restoreFromFosso('${window.ctEscape(item.trashKey)}')"><i class="fa-solid fa-arrow-rotate-left mr-1"></i>Resgatar</button><button class="fosso-action purge" onclick="window.permanentlyBanish('${window.ctEscape(item.trashKey)}')"><i class="fa-solid fa-skull-crossbones mr-1"></i>Banir agora</button></div></article>`;}).join('');
        };
        window.restoreFromFosso = async function(key){
            const item=(window.trashItems||[]).find(t=>t.trashKey===key);if(!item)return;
            const restored={...item};delete restored.trashType;delete restored.deletedAt;delete restored.trashKey;
            const isTreasury=item.trashType==='contabil';const target=isTreasury?window.contabilItems:window.tarefasItems;
            if(!target.some(i=>String(i.id)===String(item.id)))target.push(restored);
            if(isTreasury){localStorage.setItem('contabil_items',JSON.stringify(window.contabilItems));window.renderKanban();}else{localStorage.setItem('tarefas_items',JSON.stringify(window.tarefasItems));window.renderTarefasKanban();}
            window.trashItems=window.trashItems.filter(t=>t.trashKey!==key);localStorage.setItem('ctonia_fosso_items',JSON.stringify(window.trashItems));
            if(userId&&db){await setDoc(doc(db,'artifacts',appId,'users',userId,isTreasury?'contabil_items':'tarefas_items',String(item.id)),restored);await deleteDoc(doc(db,'artifacts',appId,'users',userId,'trash_items',key));}
            window.renderFosso();window.renderFossoCount();window.renderUrgentes();window.renderPieChart();window.showToast('Alma resgatada do Fosso.','success');
        };
        window.permanentlyBanish = async function(key){
            const item=(window.trashItems||[]).find(t=>t.trashKey===key);if(!item)return;
            if(!window.confirm('Tem certeza? Esta ação alimentará as almas imediatamente e não poderá ser desfeita.'))return;
            window.trashItems=window.trashItems.filter(t=>t.trashKey!==key);localStorage.setItem('ctonia_fosso_items',JSON.stringify(window.trashItems));
            if(userId&&db){try{await deleteDoc(doc(db,'artifacts',appId,'users',userId,'trash_items',key));}catch(e){window.showToast('Falha ao banir definitivamente.','error');return;}}
            window.renderFosso();window.renderFossoCount();window.showToast('As almas foram alimentadas.','success');
        };
        window.renderFossoCount();


        // --- Varredura Expressa Regex Offline ---
        window.handlePdfUpload = async function(e, tipo) { const f = e.target.files[0]; if(!f) return; window.previewFile(f); await window.processPdfFileLocal(f, tipo); e.target.value = ''; }
        window.processPdfFileLocal = async function(file, tipo) {
            document.getElementById('ai-loading').classList.remove('hidden'); document.getElementById('ai-loading').classList.add('flex');
            try {
                const pdf = await pdfjsLib.getDocument({data: await file.arrayBuffer()}).promise;
                let text = ''; for (let i = 1; i <= pdf.numPages; i++) { const page = await pdf.getPage(i); const content = await page.getTextContent(); text += content.items.map(i => i.str).join(' ') + '\n'; }
                if (!text.trim()) { window.showToast("PDF é imagem sem texto.", "error"); return; }
                const t = text.replace(/\s+/g, ' ');
                
                if (tipo === 'nf' || tipo === 'auto') {
                    const cnpjs = t.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g) || [];
                    if (cnpjs[0]) document.getElementById('input-cnpj-emissor').value = cnpjs[0];
                    if (cnpjs[1]) document.getElementById('input-cnpj-dest').value = cnpjs[1];
                    const numMatch = t.match(/(?:N[oº°]|N[Uú]MERO|NF-E|NOTA FISCAL)\s*[:.-]?\s*0*([\d\.\-]+)/i);
                    let num = numMatch ? numMatch[1].replace(/[\.\-]/g, '') : '';
                    let emi = '';
                    const emiMatch = t.match(/(?:RAZÃO SOCIAL|NOME|EMITENTE)\s*[:.-]?\s*([A-Z0-9\s\.\-\&]+?(?:LTDA|S\/?A|M\.?E|EIRELI|EPP|INC))/i);
                    if (emiMatch) emi = emiMatch[1].trim();
                    else if(cnpjs.length>0) { const idx = t.search(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/); if(idx>20) emi = t.substring(idx-50, idx).split(' ').slice(-5).join(' ').replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s\&]/g, '').trim(); }
                    if (emi) document.getElementById('input-emissor').value = emi;
                    const valMatch = t.match(/R\$\s*([\d\.]+(?:,\d{2}))/i);
                    if (valMatch) { const val = valMatch[1].replace(/\./g, '').replace(',', '.'); document.getElementById('input-valor-doc').value = val; if(parseFloat(val)>1000) document.getElementById('container-oc').classList.remove('hidden'); }
                    const dMatch = t.match(/\d{2}\/\d{2}\/\d{4}/g);
                    if (dMatch && dMatch.length > 0) document.getElementById('input-data-emissao').value = dMatch[0].split('/').reverse().join('-');
                    const descMatch = t.match(/(?:DISCRIMINAÇÃO DOS SERVIÇOS|DADOS DOS PRODUTOS|DESCRIÇÃO DOS SERVIÇOS|HISTÓRICO)\s*[:.-]?\s*([A-Za-z0-9\s\.,\-\/]+?)(?:VALOR|CÁLCULO|DEDUÇÕES|TRIBUTOS|$)/i);
                    if(descMatch && descMatch[1].length > 10) document.getElementById('input-description').value = descMatch[1].substring(0, 150).trim() + "...";
                    const ocMatch = t.match(/\b(?:87|102)\d{8}\b/g);
                    if(ocMatch) document.getElementById('input-oc').value = ocMatch[0];
                    let top = '', nomeT = 'NF'; const up = t.toUpperCase();
                    if(up.includes("DANFE")) { top='9'; nomeT='DANFe'; } else if(up.includes("NFS-E")||up.includes("SERVIÇOS")) { top='40'; nomeT='NFS-e'; } else if(up.includes("DACTE")) { top='161'; nomeT='DACTE'; } else if(up.includes("RECIBO")) { top='55'; nomeT='Recibo'; }
                    document.getElementById('input-top').value = top;
                    if(num) document.getElementById('input-title').value = `${nomeT} ${num}`; else if(emi) document.getElementById('input-title').value = `${nomeT} - ${emi.substring(0,20)}`;
                    if(!document.getElementById('input-vencimento-boleto').value) document.getElementById('input-data-pagamento').value = window.calculateNextPaymentDate(new Date());
                }
                if (tipo === 'boleto' || tipo === 'auto') {
                    const lMatch = t.match(/(\d{5}[\.\s]?\d{5}[\s]?\d{5}[\.\s]?\d{6}[\s]?\d{5}[\.\s]?\d{6}[\s]?\d[\s]?\d{14})/g);
                    if (lMatch) document.getElementById('input-linha').value = lMatch[0].replace(/[\.\s]/g, '');
                    const vencMatch = t.match(/(?:VENCIMENTO|Venc\.|Data de Vencimento)\s*[:.-]?\s*(\d{2}\/\d{2}\/\d{4})/i);
                    if (vencMatch) { const v = vencMatch[1].split('/').reverse().join('-'); document.getElementById('input-vencimento-boleto').value = v; document.getElementById('input-data-pagamento').value = v; }
                    const valBol = t.match(/(?:Valor do Documento|Total|Valor Cobrado|Valor)\s*[:.-]?\s*(?:R\$)?\s*([\d\.]+(?:,\d{2}))/i);
                    if(valBol && (tipo==='boleto' || !document.getElementById('input-valor-boleto').value)) document.getElementById('input-valor-boleto').value = valBol[1].replace(/\./g, '').replace(',','.');
                }
                window.showToast("Dados Extraídos!", "success");
            } catch(e) { window.showToast("Falha local.", "error"); }
            finally { document.getElementById('ai-loading').classList.add('hidden'); document.getElementById('ai-loading').classList.remove('flex'); }
        }

        window.handleXmlUpload = async function(e) { const f = e.target.files[0]; if(!f) return; window.previewFile(f); await window.processXmlFileLocal(f); e.target.value=''; }
        window.processXmlFileLocal = async function(file) {
            document.getElementById('ai-loading').classList.remove('hidden'); document.getElementById('ai-loading').classList.add('flex');
            try {
                const xmlDoc = new DOMParser().parseFromString(await file.text(), "text/xml");
                const ide = xmlDoc.getElementsByTagName("ide")[0], emit = xmlDoc.getElementsByTagName("emit")[0], dest = xmlDoc.getElementsByTagName("dest")[0], tot = xmlDoc.getElementsByTagName("total")[0];
                if(ide && emit) {
                    const nNF = ide.getElementsByTagName("nNF")[0]?.textContent; if(nNF) { document.getElementById('input-title').value = "DANFe " + nNF; document.getElementById('input-top').value = "9"; }
                    const dhEmi = ide.getElementsByTagName("dhEmi")[0]?.textContent; if(dhEmi) document.getElementById('input-data-emissao').value = dhEmi.substring(0,10);
                    const xNome = emit.getElementsByTagName("xNome")[0]?.textContent; if(xNome) document.getElementById('input-emissor').value = xNome;
                    const cnpjE = emit.getElementsByTagName("CNPJ")[0]?.textContent; if(cnpjE) document.getElementById('input-cnpj-emissor').value = cnpjE.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
                    if(dest) { const cD = dest.getElementsByTagName("CNPJ")[0]?.textContent; if(cD) document.getElementById('input-cnpj-dest').value = cD.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5"); }
                    if(tot) { const vNF = tot.getElementsByTagName("vNF")[0]?.textContent; if(vNF) { document.getElementById('input-valor-doc').value = parseFloat(vNF).toFixed(2); if(parseFloat(vNF)>1000) document.getElementById('container-oc').classList.remove('hidden'); } }
                    const xPed = xmlDoc.getElementsByTagName("xPed")[0]?.textContent; if(xPed) document.getElementById('input-oc').value = xPed;
                    const prods = xmlDoc.getElementsByTagName("xProd"); let d = ""; for(let i=0;i<Math.min(prods.length,3);i++) d+=prods[i].textContent+", "; if(d) document.getElementById('input-description').value = d.slice(0,-2);
                    if(!document.getElementById('input-vencimento-boleto').value) document.getElementById('input-data-pagamento').value = window.calculateNextPaymentDate(new Date());
                    window.showToast("XML Nacional Extraído!", "success");
                } else {
                    const nNFSe = xmlDoc.getElementsByTagName("Numero")[0]?.textContent;
                    if(nNFSe) {
                        document.getElementById('input-title').value = "NFS-e " + nNFSe; document.getElementById('input-top').value = "40";
                        document.getElementById('input-emissor').value = xmlDoc.getElementsByTagName("RazaoSocial")[0]?.textContent || '';
                        document.getElementById('input-valor-doc').value = parseFloat(xmlDoc.getElementsByTagName("ValorServicos")[0]?.textContent||0).toFixed(2);
                        window.showToast("XML Municipal Extraído!", "success");
                    } else window.showToast("Formato XML não suportado.", "error");
                }
            } catch(e) { window.showToast("Erro no XML.", "error"); }
            finally { document.getElementById('ai-loading').classList.add('hidden'); document.getElementById('ai-loading').classList.remove('flex'); }
        }

        // Oráculo financeiro Ctônia: natureza, CR, trimestre e histórico.
        window.oracleQuarter = 0; window.oracleNature = null;
        const oracleMoney = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
        const oracleDate = i => { const raw=i.dataPagamento||i.dataEmissao||i.createdAt||i.updatedAt; const d=raw?new Date(raw):null; return d&&!isNaN(d)?d:null; };
        const oracleCR = i => String(i.cr||i.centroResultado||i.CR||'').trim();
        const oracleCRName = cr => ({'70920100':'70920100 - LA II Obra','70920200':'70920200 - LA II E.E.E.','70920300':'70920300 - LA II Água'}[cr]||cr||'CR não informado');
        const oracleNature = (i,kind) => kind==='launched'?String(i.naturezaLancada||i.top||'Não informada'):String(i.naturezaReal||i.natureza||'Não informada');
        const oracleNatureName = i => String(i.naturezaRealNome||i.naturezaNome||i.nomeNatureza||({'9':'DANFe','40':'NFSe','55':'Recibo','161':'DACTe'}[String(i.top)]||'Natureza não informada'));
        window.generateAIReport = function(){
          window.oracleQuarter=0; window.oracleNature=null;
          const years=[...new Set((window.contabilItems||[]).map(i=>oracleDate(i)?.getFullYear()).filter(Boolean))].sort((a,b)=>b-a);
          const y=document.getElementById('oracle-year'); if(y){y.innerHTML='<option value="all">Todos os anos</option>'+years.map(v=>`<option value="${v}">${v}</option>`).join(''); if(years.includes(new Date().getFullYear()))y.value=String(new Date().getFullYear());}
          window.openModal('modal-ia-summary'); window.renderTreasuryOracle();
        };
        window.setOracleQuarter=function(q){window.oracleQuarter=q;document.querySelectorAll('.oracle-gem').forEach(b=>b.classList.toggle('selected',Number(b.dataset.quarter)===q));window.renderTreasuryOracle();};
        window.selectOracleNature=function(n){window.oracleNature=window.oracleNature===n?null:n;window.renderTreasuryOracle();};
        window.renderTreasuryOracle=function(){
          const all=(window.contabilItems||[]).slice(); const now=new Date();
          const days=document.getElementById('oracle-days')?.value||'365', yr=document.getElementById('oracle-year')?.value||'all', kind=document.getElementById('oracle-nature-kind')?.value||'real', cr=(document.getElementById('oracle-cr')?.value||'').trim();
          let items=all.filter(i=>{const d=oracleDate(i);if(days!=='all'&&(!d||(now-d)/86400000>Number(days)))return false;if(yr!=='all'&&(!d||d.getFullYear()!==Number(yr)))return false;if(window.oracleQuarter&&(!d||Math.floor(d.getMonth()/3)+1!==window.oracleQuarter))return false;if(cr&&oracleCR(i)!==cr)return false;return true;});
          const natureKey=i=>oracleNature(i,kind);
          const total=items.reduce((s,i)=>s+(Number(i.valorDoc)||0),0);
          const groupBy=(arr,keyFn)=>{const g={};arr.forEach(i=>{const k=keyFn(i);(g[k]||(g[k]=[])).push(i)});return Object.entries(g).map(([key,rows])=>({key,items:rows,total:rows.reduce((s,i)=>s+(Number(i.valorDoc)||0),0)})).sort((a,b)=>b.total-a.total)};
          const entries=groupBy(items,natureKey);
          const kpi=document.getElementById('oracle-kpis');if(kpi)kpi.innerHTML=`<div class="oracle-kpi"><small>Total aplicado</small><strong>${oracleMoney(total)}</strong></div><div class="oracle-kpi"><small>Registros no período</small><strong>${items.length}</strong></div><div class="oracle-kpi"><small>Centros de resultado</small><strong>${new Set(items.map(oracleCR).filter(Boolean)).size}</strong></div>`;
          const list=document.getElementById('oracle-nature-list');if(list)list.innerHTML=entries.map(e=>`<button class="oracle-nature-row ${window.oracleNature===e.key?'active':''}" onclick="window.selectOracleNature(${JSON.stringify(e.key).replace(/'/g,'&#39;')})"><span class="oracle-bar-wrap"><i style="width:${total?Math.max(3,e.total/Math.max(1,...entries.map(x=>x.total))*100):0}%"></i></span><span class="oracle-nature-label"><b>${window.ctEscape(e.key)} · ${window.ctEscape(oracleNatureName(e.items[0]))}</b><strong>${oracleMoney(e.total)}</strong></span></button>`).join('')||'<p class="oracle-muted p-4">Nenhum registro para os filtros escolhidos.</p>';
          const selected=window.oracleNature?items.filter(i=>natureKey(i)===window.oracleNature):items;
          // Gráfico mensal em barras 2D com recorte trimestral.
          const monthHost=document.getElementById('oracle-month-chart');
          if(monthHost){const qs=window.oracleQuarter?[window.oracleQuarter]:[1,2,3,4];monthHost.innerHTML=qs.map(q=>{const ms=Array.from({length:3},(_,j)=>(q-1)*3+j);const vals=ms.map(m=>selected.filter(i=>{const d=oracleDate(i);return d&&d.getMonth()===m}).reduce((s,i)=>s+(Number(i.valorDoc)||0),0));const mx=Math.max(1,...vals);return `<div class="oracle-quarter-group"><label>Trimestre ${['I','II','III','IV'][q-1]} · ${yr==='all'?'todos os anos':yr}</label><div class="oracle-months">${ms.map((m,j)=>`<div class="oracle-month-col"><b>${oracleMoney(vals[j])}</b><i style="height:${Math.max(5,vals[j]/mx*100)}%"></i><small>${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][m]}</small></div>`).join('')}</div></div>`}).join('');}
          // Colunas 2D por ano.
          const years=[...new Set(selected.map(i=>oracleDate(i)?.getFullYear()).filter(Boolean))].sort((a,b)=>a-b), vals=years.map(y=>selected.filter(i=>oracleDate(i)?.getFullYear()===y).reduce((s,i)=>s+(Number(i.valorDoc)||0),0)),mx=Math.max(1,...vals);
          const yh=document.getElementById('oracle-year-chart');if(yh)yh.innerHTML=`<div class="oracle-pillars">${years.map((y,j)=>`<div class="oracle-pillar" title="${y}: ${oracleMoney(vals[j])}"><b>${oracleMoney(vals[j])}</b><i style="height:${Math.max(8,vals[j]/mx*100)}%"></i><small>${y}</small></div>`).join('')||'<p class="oracle-muted">Sem dados anuais.</p>'}</div>`;
          // Naturezas por CR: agrupamento separado para não misturar centros.
          const nh=document.getElementById('oracle-nature-chart');if(nh){
            if(kind==='all'){
              const crGroups=groupBy(selected,oracleCR);
              nh.innerHTML='<div class="oracle-compare-legend"><span><i style="background:#b85acb"></i>Natureza real</span><span><i style="background:#42a9c2"></i>Natureza lançada</span></div>'+crGroups.map(c=>{
                const rows=[]; c.items.forEach(i=>{const rn=String(i.naturezaReal||i.natureza||'Não informada');const ln=String(i.naturezaLancada||i.top||'Não informada');let a=rows.find(x=>x.name===rn);if(!a){a={name:rn,real:0,launched:0};rows.push(a)}a.real+=Number(i.valorDoc)||0;let b=rows.find(x=>x.name===ln);if(!b){b={name:ln,real:0,launched:0};rows.push(b)}b.launched+=Number(i.valorDoc)||0;});
                const mx=Math.max(1,...rows.flatMap(x=>[x.real,x.launched]));return `<div class="mb-4"><h4 class="font-bold text-xs mb-2">${window.ctEscape(oracleCRName(c.key))} · ${oracleMoney(c.total)}</h4>${rows.sort((a,b)=>(b.real+b.launched)-(a.real+a.launched)).slice(0,10).map(e=>`<div class="mb-3"><div class="text-xs mb-1">${window.ctEscape(e.name)}</div><div class="oracle-compare"><span>Real</span><i style="width:${Math.max(1,e.real/mx*100)}%;background:linear-gradient(90deg,#a54bc2,#d18be0)"></i><b>${oracleMoney(e.real)}</b></div><div class="oracle-compare"><span>Lançada</span><i style="width:${Math.max(1,e.launched/mx*100)}%;background:linear-gradient(90deg,#328ca8,#70d2df)"></i><b>${oracleMoney(e.launched)}</b></div></div>`).join('')}</div>`}).join('')||'<p class="oracle-muted">Sem dados por CR.</p>';
            } else {
              const crGroups=groupBy(selected,oracleCR);nh.innerHTML=crGroups.map(c=>`<div class="mb-4"><h4 class="font-bold text-xs mb-2">${window.ctEscape(oracleCRName(c.key))} · ${oracleMoney(c.total)}</h4>${groupBy(c.items,natureKey).slice(0,8).map(e=>`<div class="oracle-compare"><span>${window.ctEscape(e.key)}</span><i style="width:${Math.max(2,e.total/Math.max(1,...groupBy(c.items,natureKey).map(x=>x.total))*100)}%"></i><b>${oracleMoney(e.total)}</b></div>`).join('')}</div>`).join('')||'<p class="oracle-muted">Sem dados por CR.</p>';
            }}
          const detail=document.getElementById('oracle-detail');if(detail){const types={'DANFe':'9','NFSe':'40','Recibo':'55','DACTe':'161'};const sums=Object.entries(types).map(([name,code])=>{const rows=selected.filter(i=>String(i.top)===code||String(i.title||'').toLowerCase().includes(name.toLowerCase()));return [name,rows.length,rows.reduce((s,i)=>s+(Number(i.valorDoc)||0),0)]});const crSummary=groupBy(selected,oracleCR).map(c=>`${oracleCRName(c.key)}: ${oracleMoney(c.total)}`).join(' · ');detail.innerHTML=`<div class="flex flex-wrap items-center justify-between gap-3 mb-3"><h3 class="oracle-detail-title">${window.oracleNature?'Natureza selecionada: '+window.ctEscape(window.oracleNature):'Detalhamento Financeiro do Período'}</h3><div class="flex gap-2 flex-wrap"><button class="oracle-export" onclick="window.exportOracleXlsx()"><i class="fa-solid fa-file-excel"></i> Exportar .xlsx</button><button class="oracle-export" onclick="window.exportOraclePdf()"><i class="fa-solid fa-file-pdf"></i> Exportar PDF</button></div></div><p class="oracle-total-line">Total aplicado: <strong>${oracleMoney(selected.reduce((s,i)=>s+(Number(i.valorDoc)||0),0))}</strong> em ${selected.length} registro(s).</p><p class="oracle-muted mb-2">${sums.map(([n,c,v])=>`${n}: ${c} tarefa(s), ${oracleMoney(v)}`).join(' · ')}</p><p class="oracle-muted mb-3">Com boleto: ${selected.filter(i=>Number(i.valorBoleto)>0||i.linhaDigitavel||i.vencimentoBoleto).length} · Com OC: ${selected.filter(i=>i.oc).length}</p><div class="oracle-muted mb-3">${crSummary}</div><div class="overflow-x-auto"><table class="oracle-table"><thead><tr><th>Tarefa / documento</th><th>CR</th><th>Natureza real</th><th>Natureza lançada</th><th>Tipo</th><th>Data</th><th>Valor</th></tr></thead><tbody>${selected.slice().sort((a,b)=>(oracleDate(b)||0)-(oracleDate(a)||0)).map(i=>`<tr><td>${window.ctEscape(i.title||'Sem título')}</td><td>${window.ctEscape(oracleCRName(oracleCR(i)))}</td><td>${window.ctEscape(i.naturezaReal||i.natureza||'—')}</td><td>${window.ctEscape(i.naturezaLancada||i.top||'—')}</td><td>${window.ctEscape(({9:'DANFe',40:'NFSe',55:'Recibo',161:'DACTe'}[String(i.top)]||'Não informado'))}</td><td>${oracleDate(i)?oracleDate(i).toLocaleDateString('pt-BR'):'—'}</td><td>${oracleMoney(i.valorDoc)}</td></tr>`).join('')}</tbody></table></div>`}
        };
        window.exportOracleXlsx=async function(){
          const table=document.querySelector('#oracle-detail .oracle-table');
          if(!table){alert('Não há dados para exportar com os filtros atuais.');return;}
          const visibleTitles=[...table.querySelectorAll('tbody tr')].map(tr=>(tr.cells[0]?.innerText||'').trim());
          const all=(window.contabilItems||[]);
          const selected=all.filter(i=>visibleTitles.some(title=>title===String(i.title||'').trim()||title.includes(String(i.title||'').trim())));
          if(!selected.length){alert('Não foi possível relacionar os registros visíveis às tarefas seladas.');return;}
          if(!window.__CTONIA_XLSX_STYLE_LOADED){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.min.js';s.onload=()=>{window.__CTONIA_XLSX_STYLE_LOADED=true;resolve();};s.onerror=reject;document.head.appendChild(s)}).catch(()=>{});}
          if(!window.XLSX||!window.__CTONIA_XLSX_STYLE_LOADED){alert('Não foi possível carregar o exportador Excel com cores. Verifique sua conexão.');return;}
          const headers=['NU','STATUS','CNPJ DESTINO','SE TEM CONTRATO','NF','EMISSÃO','CNPJ EMITENTE','VENCIMENTO','VALOR','PAGAMENTO','TOP','CR','NATUREZA LANÇADA','DESCRIÇÃO','NATUREZA REAL'];
          const onlyNum=v=>{const m=String(v||'').match(/\d+/g);return m?m.join(''):''};
          const dateBR=v=>{
            if(!v)return '';
            const raw=String(v).trim();
            let m=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if(m)return `${m[3]}/${m[2]}/${m[1]}`;
            m=raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            if(m)return raw;
            const d=new Date(raw);
            return Number.isNaN(d.getTime())?'':`${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`;
          };
          const getNF=i=>{const title=String(i.title||'');const m=title.match(/(?:DANF[e]?|NFS[e]?|NF|NOTA\s*FISCAL|RECIBO|DACT[e]?)\D*(\d+)/i);return m?m[1]:onlyNum(title)};
          const oracleStatusForExport = i => {
            const candidates = [i.status, i.situacao, i.etapa, i.workflowStatus, i.taskStatus, i.fase, i.coluna, i.setor].filter(v => v != null).map(v => String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase());
            const raw = candidates.join(' | ');
            if (raw.includes('contabilidade')) return 'CONTABILIDADE';
            if (raw.includes('pendente')) return 'PENDENTE';
            if (raw.includes('selado') || raw.includes('lancado') || raw.includes('concluido')) return 'LANÇADO';
            return candidates.length ? String(i.status || i.situacao || i.etapa || i.workflowStatus || candidates[0]).toUpperCase() : 'PENDENTE';
          };
          // NATUREZA REAL: código + descrição do catálogo (usa a "Natureza real" da tarefa; se estiver vazia, usa a lançada).
          const natReal=i=>{const cod=onlyNum(i.naturezaReal||i.natureza||i.naturezaLancada||'');if(!cod)return '';const nome=(typeof CT_NATUREZA_CATALOGO!=='undefined'&&CT_NATUREZA_CATALOGO[cod])||'';return nome?cod+' - '+String(nome).toLocaleUpperCase('pt-BR'):cod;};
          const rows=selected.map(i=>{
            let top=String(i.top||'').trim();
            if(!top){const m=String(i.title||'').match(/\bTOP\D*(348|347|\d{1,4})/i);if(m)top=m[1];}
            return [i.nu||'', oracleStatusForExport(i), i.cnpjDestino||i.cnpjDest||'', 'NÃO', getNF(i), dateBR(i.dataEmissao), i.cnpjEmissor||i.cnpjDoEmissor||i.cnpjOrigem||'', dateBR(i.vencimentoBoleto||i.vencimento||i.dataVencimento||i.dataPagamento), Number(String(i.valorDoc||i.valor||0).replace(',','.'))||0, (i.valorBoleto||i.linhaDigitavel||i.vencimentoBoleto)?'BOLETO':'PIX', top, i.cr||i.centroResultado||'', onlyNum(i.naturezaLancada||''), i.descricao||i.description||i.title||'', natReal(i)];
          });
          const ws=XLSX.utils.aoa_to_sheet([headers,...rows]);
          ws['!cols']=[{wch:10},{wch:15},{wch:20},{wch:18},{wch:10},{wch:12},{wch:20},{wch:12},{wch:15},{wch:15},{wch:8},{wch:12},{wch:18},{wch:50},{wch:42}];
          const border={top:{style:'thin',color:{rgb:'FFB7A58B'}},bottom:{style:'thin',color:{rgb:'FFB7A58B'}},left:{style:'thin',color:{rgb:'FFB7A58B'}},right:{style:'thin',color:{rgb:'FFB7A58B'}}};
          for(let c=0;c<headers.length;c++){
            const cell=ws[XLSX.utils.encode_cell({r:0,c})];
            cell.s={fill:{patternType:'solid',fgColor:{rgb:c===14?'FF2F6F9F':'FFA25732'}},font:{bold:true,color:{rgb:'FFFFFFFF'}},alignment:{horizontal:'center',vertical:'center',wrapText:true},border};
          }
          for(let r=1;r<=rows.length;r++){
            for(let c=0;c<headers.length;c++){
              const cell=ws[XLSX.utils.encode_cell({r,c})];
              const bg=c===14?(r%2===1?'FFDCEBF5':'FFC9DFEE'):(r%2===1?'FFF0EAD8':'FFE4DCC4');
              cell.s={fill:{patternType:'solid',fgColor:{rgb:bg}},font:{color:{rgb:c===14?'FF12304A':'FF3A1F12'}},alignment:{horizontal:c>=13?'left':'center',vertical:'center',wrapText:c>=13},border};
            }
            [5,7].forEach(c=>{const cell=ws[XLSX.utils.encode_cell({r,c})];cell.z='@';});
            const valueCell=ws[XLSX.utils.encode_cell({r,c:8})];
            valueCell.z='"R$" #,##0.00';
          }
          ws['!rows']=[{hpt:28},...rows.map(()=>({hpt:22}))];
          const wb=XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb,ws,'Notas seladas');
          XLSX.writeFile(wb,'Ctonia_Tesouraria_Notas_Seladas.xlsx',{cellStyles:true});
        };
        window.exportOraclePdf=async function(){
          const table=document.querySelector('#oracle-detail .oracle-table');if(!table){alert('Não há dados para exportar.');return;}
          const rawRows=[...table.querySelectorAll('tr')].map(tr=>[...tr.children].map(td=>td.innerText.trim()));const head=rawRows.shift()||[];const rows=[head,...rawRows.sort((a,b)=>(a[1]||'').localeCompare(b[1]||'','pt-BR')||(a[2]||'').localeCompare(b[2]||'','pt-BR')||(a[3]||'').localeCompare(b[3]||'','pt-BR'))];
          if(!window.jspdf?.jsPDF){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)}).catch(()=>{});}
          if(!window.jspdf?.jsPDF){alert('Não foi possível carregar o exportador PDF. Verifique sua conexão.');return;}
          const doc=new window.jspdf.jsPDF({orientation:'landscape'});doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text('Detalhamento Financeiro do Período',14,15);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text(document.querySelector('#oracle-detail .oracle-total-line')?.innerText||'Detalhamento financeiro',14,22);
          const esc=v=>String(v).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
          let y=31; const widths=rows[0].map(()=>260/rows[0].length); rows.forEach((row,ri)=>{let x=14;const height=ri===0?9:8;row.forEach((cell,ci)=>{if(ri===0){doc.setFillColor(226,216,237);doc.rect(x,y-5,widths[ci],height,'F');doc.setFont('helvetica','bold')}else if(ci===1||ci===2||ci===3){doc.setFillColor(ci===1?225:ci===2?235:220,ci===1?235:ci===2?226:239,ci===1?242:ci===2?246:248);doc.rect(x,y-5,widths[ci],height,'F');doc.setFont('helvetica','bold')}else{doc.setFont('helvetica','normal')}doc.setFontSize(7);const lines=doc.splitTextToSize(String(cell||'—'),widths[ci]-3);doc.text(lines.slice(0,2),x+1,y);x+=widths[ci]});y+=height;if(y>185){doc.addPage();y=15}});doc.save('Ctonia_Detalhamento_Financeiro.pdf');
        };
        ['oracle-nature-kind','oracle-days','oracle-year','oracle-cr'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>window.renderTreasuryOracle()));
        document.getElementById('oracle-cr')?.addEventListener('keydown',e=>{if(e.key==='Enter')window.renderTreasuryOracle()});

    
