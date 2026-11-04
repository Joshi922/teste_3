// Configurações e Variáveis Globais
const K = 'ct_academia_v7';
const COR = ['#D93B5A', '#3F6FD8', '#1FA373', '#8E5BD9', '#D99A1E', '#17A5B8', '#E0709A'];
const OLD_COR = ['#d96846', '#1f7a5c', '#4a72b5', '#b37700', '#9b59b6', '#e67e22', '#34495e'];
const GEMA = {'#D93B5A':'Rubi','#3F6FD8':'Safira','#1FA373':'Esmeralda','#8E5BD9':'Ametista','#D99A1E':'Citrino','#17A5B8':'Água-marinha','#E0709A':'Morganita'};
const TIPOS = ['Aula', 'Prova', 'Trabalho', 'Lista', 'Seminário', 'Leitura'];
const KANBAN_COLS = ['todo', 'doing', 'review', 'done'];
const KANBAN_LABELS = {'todo':'A Fazer', 'doing':'Fazendo', 'review':'Revisando', 'done':'Concluído'};
const LVL_XP = [0, 500, 1200, 2500, 5000, 9000, 15000, 25000, 40000];

// Inicializar banco de dados para arquivos
localforage.config({ name: 'CtoniaAcademia', storeName: 'arquivos' });

// Utilitários
const $ = s => document.querySelector(s);
const esc = s => String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const z = n => String(n).padStart(2,'0');
const iso = d => d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate());
const today = () => iso(new Date());
const fmt = s => s ? s.split('-').reverse().join('/') : '';
const uid = () => Math.random().toString(36).slice(2,11);
const f1 = n => n == null ? '—' : n.toFixed(1).replace('.',',');
const hexRgb = h => { h = String(h||'#888888').replace('#',''); if (h.length===3) h = h.split('').map(x=>x+x).join(''); const n = parseInt(h,16); return [n>>16&255, n>>8&255, n&255]; };
const lum = h => { const [r,g,b] = hexRgb(h).map(v => { v/=255; return v<=.03928 ? v/12.92 : Math.pow((v+.055)/1.055,2.4); }); return .2126*r+.7152*g+.0722*b; };
const ink = h => lum(h) > .3 ? '#1B132B' : '#FFFFFF';
const gemSvg = cls => `<svg class="${cls||'gem'}" viewBox="0 0 64 64" aria-hidden="true"><use href="#gem-sym"/></svg>`;
const cssC = m => `--c:${m.cor};--c-rgb:${hexRgb(m.cor).join(',')};--ink:${ink(m.cor)}`;
function vhead(kicker, title, sub, icon, actions) {
    return `<section class="vhead"><div class="vhead-main"><span class="vhead-gem"><i class="fa-solid ${icon}"></i></span><div><span class="eyebrow">${kicker}</span><h2>${title}</h2><p>${sub}</p></div></div>${actions ? `<div class="vhead-actions">${actions}</div>` : ''}</section>`;
}
function formatBytes(bytes) { if (!bytes) return '0 B'; const k = 1024, dm = 1, sizes = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]; }

function showToast(msg, type = 'success') {
    const t = document.createElement('div'); 
    t.className = `toast ${type === 'error' ? '!bg-bad text-white' : type === 'warn' ? '!bg-warn text-white' : ''}`; 
    t.innerHTML = msg;
    $('#toast-container').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(()=>t.remove(), 300); }, 3000);
}

// XP e Conquistas
function addXP(amount, reason) {
    S.xp = (S.xp || 0) + amount;
    let oldLvl = S.level || 1, newLvl = 1;
    for(let i=0; i<LVL_XP.length; i++) { if(S.xp >= LVL_XP[i]) newLvl = i+1; else break; }
    S.level = newLvl;
    sv();
    showToast(`+${amount} XP: ${reason}`);
    if(newLvl > oldLvl) setTimeout(() => showToast(`🎉 SUBIU PARA O NÍVEL ${newLvl}!`), 1000);
    updateHeaderXP();
}
function updateHeaderXP() {
    const xp = S.xp || 0, lvl = S.level || 1;
    const currentBase = LVL_XP[lvl-1] || 0, nextBase = LVL_XP[lvl] || (currentBase + 10000);
    const pct = Math.min(100, Math.max(0, ((xp - currentBase) / (nextBase - currentBase)) * 100));
    const hLvl = $('#header-lvl'); if(hLvl) hLvl.innerText = lvl;
    const hFill = $('#header-xp-fill'); if(hFill) hFill.style.width = pct + '%';
}
function checkBadges() {
    S.badges = S.badges || [];
    const award = (id, name, icon) => { if(!S.badges.find(b=>b.id===id)) { S.badges.push({id, name, icon, date: today()}); showToast(`🏅 Nova Conquista: ${name}!`); } };
    if(S.xp >= 1000) award('xp1', 'Aprendiz Dedicado', 'fa-star');
    if(S.xp >= 5000) award('xp2', 'Mago do Conhecimento', 'fa-hat-wizard');
    S.materias.forEach(m => { if(nota(m) >= 9.8 && m.ativ.length > 1) award('nota10_'+m.id, `Mestre em ${m.nome}`, 'fa-gem'); });
}

// Banco de Dados / Estado
function seed() {
    const C = (t, s) => ({ id: uid(), t, s, resumo: '', anexos_aula: [], anexos_perg: [], _open: false });
    const A = (t, y, d, p, n, ks) => ({ id: uid(), titulo: t, tipo: y, data: d, peso: p, nota: n===undefined?'':n, feito: n!==undefined&&n!=='', kStatus: ks||'todo', feedback: '', melhorias: '', anexos: [], _open: false });
    return {
        semestres: ['2026.1', '2026.2'], currentSemestre: '2026.2', xp: 0, level: 1, badges: [], flashcards: [], guias: [],
        materias: [
            {
                id: uid(), semestre: '2026.2', nome: 'Física Mística II', prof: 'Prof. Albus', local: 'Torre Norte', hor: 'Seg e Qua · 19h',
                lim: 10, min: 7, cor: COR[0], historicoFaltas: [], 
                cont: [C('Termodinâmica da Alma', 'visto'), C('Leis da Gravidade Etérea', 'and')],
                ativ: [A('Prova 1', 'Prova', today(), 3, '', 'doing'), A('Seminário Final', 'Seminário', iso(new Date(Date.now() + 10*864e5)), 4, '', 'todo')]
            }
        ]
    };
}
function load() { 
    try { 
        const d = JSON.parse(localStorage.getItem(K)); 
        if (d && d.materias) { 
            d.xp = d.xp||0; d.level = d.level||1; d.flashcards = d.flashcards||[]; d.guias = d.guias||[]; 
            d.materias.forEach(m => { const i = OLD_COR.indexOf(String(m.cor||'').toLowerCase()); if (i >= 0) m.cor = COR[i]; });
            return d; 
        } 
    } catch(e){} 
    return seed(); 
}

let S = load(), view = 'painel', sala = null, st = 'geral';
let pomoTime = 25*60, pomoInterval = null, pomoRunning = false;

const save = () => { try { localStorage.setItem(K, JSON.stringify(S)); } catch(e){} };
const M = id => S.materias.find(m => m.id === id);
const sv = () => { save(); checkBadges(); render(); };
const materiasAtuais = () => S.materias.filter(m => m.semestre === S.currentSemestre);
const nota = m => { const g = m.ativ.filter(a => a.nota !== '' && a.nota != null); const p = g.reduce((s,a) => s+(+a.peso||1), 0); return p ? g.reduce((s,a) => s+a.nota*(+a.peso||1), 0)/p : null; };
const totalFaltas = m => (m.historicoFaltas || []).reduce((acc, f) => acc + f.qtd, 0);
const corN = (n,m) => n == null ? 'var(--mut)' : n >= m.min ? 'var(--ok)' : n >= m.min - 1.5 ? 'var(--warn)' : 'var(--bad)';
const pct = m => m.cont.length ? Math.round(m.cont.filter(c => c.s === 'visto').length / m.cont.length * 100) : 0;
function dias(dStr) { const d = new Date(dStr+'T00:00:00'), h = new Date(today()+'T00:00:00'); return Math.round((d-h)/864e5); }
const pendentes = () => materiasAtuais().flatMap(m => m.ativ.filter(a => !a.feito && a.kStatus !== 'done').map(a => ({...a, m}))).sort((a,b) => a.data.localeCompare(b.data));

// Motor de Renderização
function go(v) { view = v; sala = null; render(); window.scrollTo({top:0, behavior:'smooth'}); }
function openSala(id) { view = 'salas'; sala = id; st = 'geral'; render(); window.scrollTo({top:0, behavior:'smooth'}); }

function render() {
    updateHeaderXP();
    document.querySelectorAll('#main-nav button').forEach(b => b.classList.toggle('on', b.dataset.v === view));
    document.body.dataset.view = view;
    { const bs = document.body.style, sm = (view === 'salas' && sala) ? M(sala) : null;
      if (sm) { bs.setProperty('--gem', sm.cor); bs.setProperty('--gem-rgb', hexRgb(sm.cor).join(',')); bs.setProperty('--on-gem', ink(sm.cor)); }
      else ['--gem','--gem-rgb','--on-gem'].forEach(k => bs.removeProperty(k)); }
    
    const semSelect = $('#sem-filter');
    semSelect.innerHTML = S.semestres.map(s => `<option value="${esc(s)}" ${s===S.currentSemestre?'selected':''}>${esc(s)}</option>`).join('') + '<option value="_new_">+ Novo Semestre</option>';
    semSelect.onchange = function() {
        if(this.value === '_new_') {
            const v = prompt("Nome do novo semestre (ex: 2027.1):");
            if(v && !S.semestres.includes(v)) { S.semestres.push(v); S.currentSemestre = v; sv(); }
            else this.value = S.currentSemestre;
        } else { S.currentSemestre = this.value; sv(); }
    };
    
    const app = $('#app');
    let html = '';
    
    try {
        if(view === 'painel') html = painel();
        else if(view === 'salas') html = sala && M(sala) ? salaV(M(sala)) : salas();
        else if(view === 'grade') html = gradeHoraria();
        else if(view === 'kanban') html = kanbanView();
        else if(view === 'flashcards') html = flashcardsView();
        else if(view === 'perfil') html = perfilView();
    } catch(e) {
        console.error(e); html = `<div class="card glass text-center py-10"><i class="fa-solid fa-triangle-exclamation text-4xl text-bad mb-4"></i><p>Erro ao renderizar magia: ${e.message}</p></div>`;
    }
    
    app.innerHTML = html;
    app.classList.remove('animate-in'); void app.offsetWidth; app.classList.add('animate-in');
    
    if(view === 'kanban') initKanban();
    if(view === 'painel') updatePomoUI();
}

// === VISUALIZAÇÕES ===

// 1. Painel
function painel() {
    const ms = materiasAtuais();
    if (!ms.length) return `<section class="dashboard-welcome card glass"><div class="welcome-copy"><span class="eyebrow">SEU ESPAÇO ACADÊMICO</span><h2>Um semestre de cada vez.</h2><p>Organize suas matérias, acompanhe seu progresso e mantenha os próximos prazos sob controle.</p><button class="btn pri" onclick="go('salas');addMat()"><i class="fa-solid fa-plus"></i> Adicionar primeira matéria</button></div><div class="welcome-art" aria-hidden="true"><svg class="w1" viewBox="0 0 64 64"><use href="#gem-sym"/></svg><svg class="w2" viewBox="0 0 64 64"><use href="#gem-sym"/></svg><svg class="w3" viewBox="0 0 64 64"><use href="#gem-sym"/></svg><svg class="w4" viewBox="0 0 64 64"><use href="#gem-sym"/></svg></div></section>`;

    const ns = ms.map(nota).filter(n => n != null), med = ns.length ? ns.reduce((a,b) => a+b,0)/ns.length : null;
    const pe = pendentes(), pv = pe.length ? pe[0] : null;
    const concluidas = ms.reduce((n,m) => n + m.ativ.filter(a => a.feito || a.kStatus === 'done').length, 0);
    const totalAtiv = ms.reduce((n,m) => n + m.ativ.length, 0);
    const conteudos = ms.reduce((n,m) => n + m.cont.length, 0);
    const vistos = ms.reduce((n,m) => n + m.cont.filter(c => c.s === 'visto').length, 0);
    const faltas = ms.reduce((n,m) => n + totalFaltas(m), 0);
    const limiteFaltas = ms.reduce((n,m) => n + (m.lim || 10), 0);
    const mediaCor = med == null ? 'var(--mut)' : med >= 7 ? 'var(--ok)' : med >= 5.5 ? 'var(--warn)' : 'var(--bad)';
    let alertas = [];
    ms.forEach(m => {
        const f = totalFaltas(m), l = m.lim || 10, w = (f/l)*100, n = nota(m);
        if (w > 100) alertas.push(`<div class="alert-row danger"><i class="fa-solid fa-triangle-exclamation"></i><span><b>${esc(m.nome)}</b> ultrapassou o limite de faltas (${f}/${l}).</span><button onclick="openSala('${m.id}')">Ver matéria</button></div>`);
        else if (w >= 80) alertas.push(`<div class="alert-row warning"><i class="fa-solid fa-circle-exclamation"></i><span><b>${esc(m.nome)}</b> está próxima do limite de faltas (${f}/${l}).</span><button onclick="openSala('${m.id}')">Ver matéria</button></div>`);
        if (n !== null && n < m.min) alertas.push(`<div class="alert-row danger"><i class="fa-solid fa-arrow-trend-down"></i><span><b>${esc(m.nome)}</b> está com média ${f1(n)}, abaixo da meta ${f1(m.min)}.</span><button onclick="openSala('${m.id}')">Ver matéria</button></div>`);
    });
    const proximaLista = pe.slice(0,4).map(a => `<button class="upcoming-row" onclick="openSala('${a.m.id}');st='ativ';render();"><span class="upcoming-date ${dias(a.data)<=1?'hot':dias(a.data)<=7?'soon':''}"><b>${dias(a.data) < 0 ? Math.abs(dias(a.data))+'d' : dias(a.data)===0 ? 'Hoje' : dias(a.data)===1 ? 'Amanhã' : dias(a.data)+'d'}</b><small>${fmt(a.data)}</small></span><span class="upcoming-info"><b>${esc(a.titulo)}</b><small><span class="dot" style="background:${a.m.cor}"></span>${esc(a.m.nome)} · ${esc(a.tipo)}</small></span><i class="fa-solid fa-chevron-right"></i></button>`).join('');

    return `<section class="dashboard-welcome card glass">
        <div class="welcome-copy"><span class="eyebrow">VISÃO GERAL · ${esc(S.currentSemestre)}</span><h2>Seu semestre em perspectiva.</h2><p>Acompanhe seu desempenho, frequência e atividades em um só lugar.</p><div class="welcome-actions"><button class="btn pri" onclick="go('salas')"><i class="fa-solid fa-book-open"></i> Minhas matérias</button><button class="btn" onclick="go('kanban')"><i class="fa-solid fa-list-check"></i> Ver atividades</button></div></div>
        <div class="welcome-art" aria-hidden="true"><svg class="w1" viewBox="0 0 64 64"><use href="#gem-sym"/></svg><svg class="w2" viewBox="0 0 64 64"><use href="#gem-sym"/></svg><svg class="w3" viewBox="0 0 64 64"><use href="#gem-sym"/></svg><svg class="w4" viewBox="0 0 64 64"><use href="#gem-sym"/></svg></div>
        <div class="welcome-progress"><div class="progress-ring" style="--progress:${totalAtiv ? Math.round(concluidas/totalAtiv*100) : 0}%"><div><b>${totalAtiv ? Math.round(concluidas/totalAtiv*100) : 0}%</b><small>concluído</small></div></div><span>${concluidas} de ${totalAtiv} atividades</span></div>
    </section>

    <section class="dashboard-stats">
        <article class="stat-card"><span class="stat-icon"><i class="fa-solid fa-chart-line"></i></span><div><small>Média geral</small><strong style="color:${mediaCor}">${f1(med)}</strong><small>${ns.length} matéria(s) com nota</small></div></article>
        <article class="stat-card"><span class="stat-icon"><i class="fa-solid fa-list-check"></i></span><div><small>Atividades pendentes</small><strong>${pe.length}</strong><small>${concluidas} concluídas de ${totalAtiv}</small></div></article>
        <article class="stat-card"><span class="stat-icon"><i class="fa-solid fa-calendar-check"></i></span><div><small>Próximo prazo</small><strong class="stat-next">${pv ? (dias(pv.data)<=0 ? 'Hoje' : dias(pv.data)===1 ? 'Amanhã' : 'Em '+dias(pv.data)+' dias') : '—'}</strong><small>${pv ? esc(pv.titulo) : 'Nenhum prazo pendente'}</small></div></article>
        <article class="stat-card"><span class="stat-icon"><i class="fa-solid fa-user-check"></i></span><div><small>Frequência registrada</small><strong>${faltas}<em> / ${limiteFaltas}</em></strong><small>Total de faltas / limites somados</small></div></article>
    </section>

    ${alertas.length ? `<section class="dashboard-section card glass"><div class="section-heading"><div><span class="eyebrow">ACOMPANHAMENTO</span><h3>Precisa de atenção</h3></div><span class="section-count">${alertas.length} alerta(s)</span></div><div class="alert-list">${alertas.join('')}</div></section>` : `<section class="dashboard-clear"><i class="fa-solid fa-circle-check"></i><span><b>Tudo em ordem por aqui.</b><small>Não há alertas de nota ou frequência nas matérias deste semestre.</small></span></section>`}

    <div class="dashboard-columns">
        <section class="dashboard-section card glass"><div class="section-heading"><div><span class="eyebrow">ROTINA</span><h3>Próximas atividades</h3></div><button class="text-link" onclick="go('kanban')">Ver quadro <i class="fa-solid fa-arrow-right"></i></button></div><div class="upcoming-list">${proximaLista || '<div class="empty-inline"><i class="fa-regular fa-calendar-check"></i><span>Nenhuma atividade pendente. Aproveite para adiantar seus estudos.</span></div>'}</div></section>
        <section class="dashboard-section card glass"><div class="section-heading"><div><span class="eyebrow">CONSTÂNCIA</span><h3>Ritmo de estudos</h3></div><span class="section-count">Últimos 30 dias</span></div><div class="focus-panel"><div class="focus-clock"><div id="pomo-display">25:00</div><svg viewBox="0 0 96 96"><circle id="pomo-circle" cx="48" cy="48" r="46" fill="none" stroke="var(--ac)" stroke-width="4" stroke-dasharray="289" stroke-dashoffset="0"></circle></svg></div><div class="focus-controls"><b>Foco profundo</b><small>Uma sessão de cada vez.</small><div><button class="btn pri" onclick="startPomo()"><i class="fa-solid fa-play"></i></button><button class="btn" onclick="pausePomo()"><i class="fa-solid fa-pause"></i></button><button class="btn" onclick="stopPomo()"><i class="fa-solid fa-rotate-left"></i></button></div></div></div><div class="heatmap-wrap">${renderHeatmap()}</div></section>
    </div>

    <section class="dashboard-section card glass"><div class="section-heading"><div><span class="eyebrow">SEU SEMESTRE</span><h3>Resumo das matérias</h3></div><button class="text-link" onclick="go('salas')">Abrir salas <i class="fa-solid fa-arrow-right"></i></button></div><div class="subject-overview">${ms.map(m => { const n=nota(m), f=totalFaltas(m), lim=m.lim||10, p=pct(m); return `<button class="subject-row" onclick="openSala('${m.id}')"><span class="subject-color" style="background-color:${m.cor};color:${m.cor}"></span><span class="subject-name"><b>${esc(m.nome)}</b><small>${esc(m.prof || 'Professor não informado')}</small></span><span class="subject-progress"><span><i style="width:${p}%;background:${m.cor};color:${m.cor}"></i></span><small>${p}% do conteúdo</small></span><span class="subject-grade" style="color:${corN(n,m)}"><b>${f1(n)}</b><small>média</small></span><span class="subject-attendance"><b>${f}/${lim}</b><small>faltas</small></span><i class="fa-solid fa-chevron-right subject-chevron"></i></button>`; }).join('')}</div></section>`;
}

function renderHeatmap() {
    S.studyLog = S.studyLog || {};
    let cells = '';
    for (let i = 30; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const k = iso(d), mins = S.studyLog[k] || 0;
        const l = mins > 120 ? 4 : mins > 60 ? 3 : mins > 30 ? 2 : mins > 0 ? 1 : 0;
        cells += `<i class="l${l}" title="${fmt(k)}: ${mins} min de estudo"></i>`;
    }
    const tot = Object.values(S.studyLog).reduce((a,b)=>a+b,0);
    return `<div class="hm" role="img" aria-label="Minutos de estudo nos últimos 31 dias">${cells}</div><div class="hm-legend"><span>${tot} min registrados</span><span>menos <i style="background:rgba(var(--line-rgb),.22)"></i><i style="background:rgba(var(--g-emerald-rgb),.38)"></i><i style="background:rgba(var(--g-emerald-rgb),.6)"></i><i style="background:rgba(var(--g-emerald-rgb),.85)"></i><i style="background:var(--g-aqua)"></i> mais</span></div>`;
}

function startPomo() {
    if(pomoRunning) return;
    pomoRunning = true;
    pomoInterval = setInterval(() => {
        pomoTime--;
        updatePomoUI();
        if(pomoTime <= 0) {
            stopPomo();
            showToast("Sessão finalizada! Bom trabalho.", "success");
            const k = today(); S.studyLog = S.studyLog || {}; S.studyLog[k] = (S.studyLog[k] || 0) + 25;
            addXP(25, 'Pomodoro Concluído'); sv();
        }
    }, 1000);
}
function pausePomo() { pomoRunning = false; clearInterval(pomoInterval); }
function stopPomo() { pausePomo(); pomoTime = 25*60; updatePomoUI(); }
function updatePomoUI() {
    const d = $('#pomo-display'), c = $('#pomo-circle');
    if(!d || !c) return;
    const m = Math.floor(pomoTime/60), s = pomoTime%60;
    d.innerText = `${z(m)}:${z(s)}`;
    const pct = ((25*60 - pomoTime) / (25*60)) * 289;
    c.style.strokeDashoffset = -pct;
}

// 2. Salas
function salas() {
    const ms = materiasAtuais();
    const nAt = ms.reduce((n,m) => n + m.ativ.filter(a => !a.feito && a.kStatus !== 'done').length, 0);
    const head = vhead('SALAS DE AULA · ' + esc(S.currentSemestre), 'Suas salas', 'Cada matéria é uma gema: entre para ver conteúdo, atividades, faltas e o que vem pela frente.', 'fa-chalkboard-user',
        `<span class="section-count"><b>${ms.length}</b> matérias</span><span class="section-count"><b>${nAt}</b> atividades abertas</span><button class="btn pri" onclick="addMat()"><i class="fa-solid fa-plus"></i> Nova sala</button>`);
    const cards = ms.map(m => {
        const n = nota(m), f = totalFaltas(m), lim = m.lim || 10, p = pct(m);
        const agora = (m.cont.find(c => c.s === 'and') || m.cont.find(c => c.s === 'ver'));
        const prox = m.ativ.filter(a => !a.feito && a.kStatus !== 'done').sort((a,b) => (a.data||'').localeCompare(b.data||''))[0];
        const dd = prox ? dias(prox.data) : null;
        const fc = f > lim ? 'var(--bad)' : f/lim >= .8 ? 'var(--warn)' : 'var(--tx2)';
        return `<article class="sala-card" style="${cssC(m)}" tabindex="0" role="button" aria-label="Abrir sala ${esc(m.nome)}" onclick="openSala('${m.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openSala('${m.id}')}">
            <div class="sala-top"><span class="sala-tag">${esc(m.local || 'Sala')}</span>${gemSvg('sala-gem')}</div>
            <div class="sala-body">
                <h3>${esc(m.nome)}</h3>
                <div class="sala-prof">${esc(m.prof || 'Professor não informado')}</div>
                <div class="sala-chips">${m.hor ? `<span><i class="fa-regular fa-clock"></i>${esc(m.hor)}</span>` : ''}<span><i class="fa-solid fa-bullseye"></i>Média ${f1(m.min)}</span></div>
                <div class="sala-metrics">
                    <div><b style="color:${corN(n,m)}">${f1(n)}</b><small>Média</small></div>
                    <div><b style="color:${fc}">${f}<span style="font-size:12px;color:var(--mut)">/${lim}</span></b><small>Faltas</small></div>
                    <div><b>${p}<span style="font-size:12px;color:var(--mut)">%</span></b><small>Conteúdo</small></div>
                </div>
                <div class="sala-bar" aria-hidden="true"><i style="width:${p}%"></i></div>
                <div class="sala-now">
                    <span><i class="fa-solid fa-book-open-reader"></i><span>${agora ? `${agora.s==='and'?'Em estudo':'A seguir'}: <b>${esc(agora.t)}</b>` : 'Sem tópicos cadastrados'}</span></span>
                    <span><i class="fa-solid fa-hourglass-half"></i><span>${prox ? `<b>${esc(prox.titulo)}</b> · ${dd<0?Math.abs(dd)+'d atrasada':dd===0?'hoje':dd===1?'amanhã':'em '+dd+' dias'}` : 'Nenhuma entrega pendente'}</span></span>
                </div>
            </div>
        </article>`;
    }).join('');
    return `${head}<div class="sala-grid">${cards}
        <article class="sala-card sala-add" tabindex="0" role="button" aria-label="Criar nova sala" onclick="addMat()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();addMat()}"><span class="plus"><i class="fa-solid fa-plus"></i></span>Conjurar nova sala</article>
    </div>`;
}

function salaV(m) {
    const n = nota(m), faltas = totalFaltas(m), fp = m.lim ? (faltas/m.lim)*100 : 0;
    
    let tabHtml = '';
    if(st==='geral') {
        const ring = (p, k) => `--p:${Math.max(0,Math.min(100,p))}%;--k:${k}`;
        const fcor = fp>100?'var(--bad)':fp>=80?'var(--warn)':'var(--ok)';
        const topicos = m.cont.map((c,i) => ({...c, i}));
        const proxAt = m.ativ.filter(a => !a.feito && a.kStatus !== 'done').sort((a,b) => (a.data||'').localeCompare(b.data||'')).slice(0,4);
        const tl = topicos.length ? topicos.map(c => { const k = c.s==='visto'?'done':c.s==='and'?'now':''; return `<div class="tl-item ${k}"><span class="tl-dot">${k==='done'?'<i class="fa-solid fa-check"></i>':k==='now'?'<i class="fa-solid fa-play"></i>':''}</span><div><b>${esc(c.t)}</b><span class="tl-tag">${k==='done'?'Já visto':k==='now'?'Vendo agora':'Vamos ver'}</span></div></div>`; }).join('') : '<div class="empty-inline"><i class="fa-solid fa-book-open"></i><span>Nenhum tópico cadastrado ainda. Abra a aba Conteúdo para montar o programa da matéria.</span></div>';
        const al = proxAt.length ? proxAt.map(a => { const d = dias(a.data); const k = d<=1?'hot':d<=7?'soon':'ok'; return `<button class="mini-act" onclick="st='ativ';render()"><span class="d ${k}">${d<0?Math.abs(d)+'d atr.':d===0?'Hoje':d===1?'Amanhã':d+' dias'}</span><span><b>${esc(a.titulo)}</b><small>${esc(a.tipo)} · ${fmt(a.data)} · peso ${a.peso}</small></span><i class="fa-solid fa-chevron-right" style="margin-left:auto;color:var(--mut);font-size:10px"></i></button>`; }).join('') : '<div class="empty-inline"><i class="fa-regular fa-calendar-check"></i><span>Nenhuma atividade pendente nesta matéria.</span></div>';
        const lancadas = m.ativ.filter(a => a.nota !== '' && a.nota != null).map(a => `<button class="mini-act" onclick="st='ativ';render()"><span class="d ok">${esc(a.tipo)}</span><span><b>${esc(a.titulo)}</b><small>peso ${a.peso}</small></span><span class="nt" style="color:${a.nota>=m.min?'var(--ok)':'var(--bad)'}">${f1(+a.nota)}</span></button>`).join('');
        tabHtml = `<div class="geral-grid">
            <div class="gauge"><div class="gauge-ring" style="${ring((n||0)*10, corN(n,m))}"><i class="fa-solid fa-chart-line"></i></div><div><small>Média atual</small><b style="color:${corN(n,m)}">${f1(n)}</b><span>meta para aprovação: ${f1(m.min)}</span></div></div>
            <div class="gauge"><div class="gauge-ring" style="${ring(fp, fcor)}"><i class="fa-solid fa-user-check"></i></div><div><small>Faltas</small><b style="color:${fcor}">${faltas}<span style="font-size:15px;color:var(--mut)"> / ${m.lim}</span></b><span>${fp>100?'limite excedido':fp>=100?'limite atingido':Math.max(0,m.lim-faltas)+' restantes'}</span></div></div>
            <div class="gauge"><div class="gauge-ring" style="${ring(pct(m), 'var(--gem)')}"><i class="fa-solid fa-book-open"></i></div><div><small>Conteúdo visto</small><b>${pct(m)}%</b><span>${m.cont.filter(c=>c.s==='visto').length} de ${m.cont.length} tópicos</span></div></div>
        </div>
        <div class="geral-cols">
            <section class="now-card"><span class="eyebrow">PROGRAMA DA MATÉRIA</span><h3>O que vimos e o que vem</h3><div class="tl">${tl}</div></section>
            <div style="display:flex;flex-direction:column;gap:18px">
                <section class="now-card"><span class="eyebrow">PRÓXIMAS ENTREGAS</span><h3>Atividades pendentes</h3>${al}</section>
                <section class="now-card"><span class="eyebrow">DESEMPENHO</span><h3>Notas lançadas</h3>${lancadas || '<div class="empty-inline"><i class="fa-solid fa-star"></i><span>Nenhuma nota lançada ainda.</span></div>'}</section>
            </div>
        </div>`;
    }
    else if(st==='cont') tabHtml = sAcordeao(m, 'cont');
    else if(st==='ativ') tabHtml = sAcordeao(m, 'ativ');
    else if(st==='freq') tabHtml = sFreq(m);
    else if(st==='cfg') tabHtml = sCfg(m);

    return `<section class="sala-hero">
        ${gemSvg('gem-bg')}
        <div>
            <button class="back" onclick="sala=null;render()"><i class="fa-solid fa-arrow-left"></i> Todas as salas</button>
            <span class="kick">${esc(S.currentSemestre)} · Sala de aula</span>
            <h2>${esc(m.nome)}</h2>
            <div class="meta"><span><i class="fa-solid fa-user-tie"></i>${esc(m.prof || 'Professor não informado')}</span>${m.local ? `<span><i class="fa-solid fa-location-dot"></i>${esc(m.local)}</span>` : ''}${m.hor ? `<span><i class="fa-regular fa-clock"></i>${esc(m.hor)}</span>` : ''}</div>
        </div>
        <div class="hero-media"><div><b>${f1(n)}</b><small>Média atual</small></div></div>
    </section>
    <div class="sala-tabs" role="tablist" aria-label="Seções da matéria">
        ${[['geral','Visão Geral'],['cont','Conteúdo'],['ativ','Atividades'],['freq','Frequência'],['cfg','Configurações']].map(t => `<button type="button" role="tab" aria-selected="${st === t[0]}" class="${st === t[0] ? 'active' : ''}" onclick="st='${t[0]}';render()">${t[1]}</button>`).join('')}
    </div>
    <div class="animate-in">${tabHtml}</div>`;
}

function sAcordeao(m, type) {
    const isCont = type === 'cont';
    const list = isCont ? (m.cont || []) : (m.ativ || []);
    const done = isCont ? list.filter(x=>x.s==='visto').length : list.filter(x=>x.feito || x.kStatus==='done').length;
    const label = isCont ? 'Conteúdo programático' : 'Atividades da disciplina';
    const addBtn = `<button class="btn pri" onclick="${isCont ? `addC('${m.id}')` : `openAtivModal('${m.id}')`}"><i class="fa-solid fa-plus"></i> ${isCont ? 'Adicionar conteúdo' : 'Nova atividade'}</button>`;
    const intro = `<div class="workspace-intro"><div><span class="workspace-kicker">${isCont?'MATERIAL DE ESTUDO':'AVALIAÇÕES E ENTREGAS'}</span><h3>${label}</h3><p>${isCont?'Organize os assuntos, acompanhe o andamento das aulas e mantenha os materiais reunidos.':'Acompanhe prazos, notas, pesos e materiais de cada entrega.'}</p></div><div class="workspace-counter"><span><b>${list.length}</b> ${isCont?'tópicos':'registros'}</span><span><b>${done}</b> concluídos</span>${addBtn}</div></div>`;
    if(!list.length) return `<div class="subject-workspace">${intro}<div class="card glass text-center py-12 m-0"><div class="modal-heading-icon mx-auto mb-3"><i class="fa-solid ${isCont?'fa-book-open':'fa-clipboard-check'}"></i></div><h3 class="text-lg mb-2">${isCont?'Seu conteúdo começa aqui':'Nenhuma atividade cadastrada'}</h3><p class="text-mut text-xs mb-5">${isCont?'Adicione o primeiro tópico e anexe os materiais da aula.':'Cadastre provas, trabalhos e outras entregas para acompanhar o semestre.'}</p>${addBtn}</div></div>`;

    const renderFiles = (arr, arrayName, itemId) => (arr || []).map(f => `
        <div class="file-item group"><div class="file-item-main"><div class="file-icon"><i class="fa-solid ${String(f.name).toLowerCase().endsWith('.pdf')?'fa-file-pdf':'fa-file-lines'}"></i></div><div class="file-meta"><span class="file-name" title="${esc(f.name)}">${esc(f.name)}</span><span class="file-size">${formatBytes(f.size)}</span></div></div><div class="file-actions"><button type="button" class="file-open" onclick="openFile('${f.id}')" title="Abrir arquivo"><i class="fa-solid fa-arrow-up-right-from-square"></i></button><button type="button" class="file-delete" onclick="delFile(event,'${m.id}','${itemId}','${type}','${arrayName}','${f.id}')" title="Excluir arquivo"><i class="fa-solid fa-trash-can"></i></button></div></div>`).join('');

    const cards = list.map((item,idx)=>{
        const isOpen=item._open?'open':'';
        const title=isCont?item.t:item.titulo;
        const state=isCont?(item.s==='visto'?'Concluído':item.s==='and'?'Em andamento':'A estudar'):(item.feito||item.kStatus==='done'?'Concluída':item.kStatus==='doing'?'Em andamento':'Pendente');
        const stateClass=(state==='Concluído'||state==='Concluída')?'done':state==='Em andamento'?'progress':'';
        let extra='';
        if(isCont){
            extra=`<div class="field-grid"><label>Status do conteúdo<select onchange="updateContStatus('${m.id}','${item.id}',this.value)"><option value="ver" ${item.s==='ver'?'selected':''}>A estudar</option><option value="and" ${item.s==='and'?'selected':''}>Em andamento</option><option value="visto" ${item.s==='visto'?'selected':''}>Concluído</option></select></label><label>Andamento<input type="text" value="${state}" disabled></label></div>
            <label class="mt-4">Anotações e resumo</label><button type="button" class="note-launch" onclick="openAcademyNote('${m.id}','${item.id}')"><span><b><i class="fa-solid fa-file-pen mr-2"></i>Abrir editor de anotações</b><span class="note-preview">${esc((item.resumoTexto||item.resumo||'Clique para escrever e organizar suas anotações...').replace(/\s+/g,' ').slice(0,180))}</span></span><i class="fa-solid fa-expand text-mut"></i></button>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4"><div><label><i class="fa-solid fa-chalkboard-user mr-2"></i>Materiais da aula</label><div class="file-dropzone" onclick="document.getElementById('file-aula-${item.id}').click()"><i class="fa-solid fa-cloud-arrow-up text-xl text-mut mb-1 block"></i><span class="text-xs text-mut">Adicionar PDF, apresentação ou documento</span><input type="file" id="file-aula-${item.id}" class="hidden" multiple accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp" onchange="handleFileUpload(event,'${m.id}','${item.id}','cont','anexos_aula')"></div><div class="file-list">${renderFiles(item.anexos_aula,'anexos_aula',item.id)}</div></div><div><label><i class="fa-solid fa-folder-open mr-2"></i>Leituras e referências</label><div class="file-dropzone" onclick="document.getElementById('file-perg-${item.id}').click()"><i class="fa-solid fa-cloud-arrow-up text-xl text-mut mb-1 block"></i><span class="text-xs text-mut">Anexar materiais complementares</span><input type="file" id="file-perg-${item.id}" class="hidden" multiple accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp" onchange="handleFileUpload(event,'${m.id}','${item.id}','cont','anexos_perg')"></div><div class="file-list">${renderFiles(item.anexos_perg,'anexos_perg',item.id)}</div></div></div>`;
        } else {
            extra=`<div class="field-grid"><label>Nota obtida<input type="number" step=".1" min="0" max="10" value="${item.nota??''}" placeholder="Ainda não lançada" onchange="setNota('${m.id}','${item.id}',this.value)"></label><label>Data de entrega<input type="date" value="${esc(item.data||'')}" onchange="updItemTxt('${m.id}','${item.id}','ativ','data',this.value)"></label></div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4"><label>Feedback<textarea rows="3" placeholder="Registre observações sobre a atividade..." onchange="updItemTxt('${m.id}','${item.id}','ativ','feedback',this.value)">${esc(item.feedback||'')}</textarea></label><label>Pontos a melhorar<textarea rows="3" placeholder="Anote o que revisar ou aprimorar..." onchange="updItemTxt('${m.id}','${item.id}','ativ','melhorias',this.value)">${esc(item.melhorias||'')}</textarea></label></div>
            <label class="mt-3">Anexos da atividade</label><div class="file-dropzone" onclick="document.getElementById('file-upload-${item.id}').click()"><i class="fa-solid fa-cloud-arrow-up text-xl text-mut mb-1 block"></i><span class="text-xs text-mut">Adicionar enunciado, entrega ou material de apoio</span><input type="file" id="file-upload-${item.id}" class="hidden" multiple accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp" onchange="handleFileUpload(event,'${m.id}','${item.id}','ativ','anexos')"></div><div class="file-list">${renderFiles(item.anexos,'anexos',item.id)}</div>`;
        }
        return `<article class="topic-card accordion st-${stateClass||'todo'} ${isOpen}" id="acc-${item.id}"><div class="topic-card-head" onclick="toggleAcc('${m.id}','${item.id}','${type}')"><div class="topic-number">${String(idx+1).padStart(2,'0')}</div><div class="topic-title"><div class="topic-title-line"><b>${esc(title)}</b>${isCont?`<button type="button" class="topic-rename" title="Editar nome da aula" onclick="event.stopPropagation();renameCont('${m.id}','${item.id}')"><i class="fa-solid fa-pen"></i></button>`:''}</div><small>${isCont?'Aula / tópico de estudo':`${esc(item.tipo||'Atividade')} · ${item.data?fmt(item.data):'Sem data definida'}`}</small></div><span class="topic-state ${stateClass}">${state}</span><i class="fa-solid fa-chevron-down caret-icon text-mut"></i></div><div class="accordion-body"><div>${extra}<div class="modal-actions"><button class="text-bad text-xs font-bold" onclick="if(confirm('Excluir este registro e seus anexos?')) ${isCont?`delC('${m.id}','${item.id}')`:`delA('${m.id}','${item.id}')`}"><i class="fa-solid fa-trash-can mr-1"></i> Remover registro</button><span class="flex-1"></span><button class="btn" onclick="toggleAcc('${m.id}','${item.id}','${type}')">Fechar detalhes</button></div></div></div></article>`;
    }).join('');
    return `<div class="subject-workspace">${intro}${cards}</div>`;
}

// Arquivos: Corrigido o bug do e.target.files sumir
async function handleFileUpload(e, mId, itemId, type, arrayName) {
    const input = e.target;
    if (!input.files || input.files.length === 0) return;
    const files = Array.from(input.files); 
    
    // Pequeno truque para limpar o input de forma segura após armazenar em memória
    setTimeout(() => { input.value = ''; }, 100);
    
    const list = type === 'cont' ? M(mId).cont : M(mId).ativ;
    const item = list.find(x => x.id === itemId);
    if (!item[arrayName]) item[arrayName] = [];
    
    for (let f of files) {
        const fileId = uid();
        try {
            await localforage.setItem(fileId, f);
            item[arrayName].push({ id: fileId, name: f.name, size: f.size });
        } catch (err) { showToast('Erro ao salvar pergaminho na base.', 'error'); }
    }
    sv();
}
async function openFile(fileId) {
    try {
        const file = await localforage.getItem(fileId);
        if (file) {
            const url = URL.createObjectURL(file);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        } else showToast('Pergaminho perdido no abismo.', 'error');
    } catch(e) { showToast('Erro ao abrir arquivo.', 'error'); }
}
async function delFile(e, mId, itemId, type, arrayName, fileId) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!confirm('Deseja excluir este arquivo anexado?')) return;
    const materia = M(mId);
    if (!materia) return;
    const list = type === 'cont' ? materia.cont : materia.ativ;
    const item = list.find(x => x.id === itemId);
    if (!item) return;
    const targetArray = item[arrayName] || [];
    const index = targetArray.findIndex(file => file.id === fileId);
    if (index < 0) return showToast('Não foi possível localizar este anexo.', 'error');
    try { await localforage.removeItem(fileId); } catch (err) { console.warn('Falha ao remover arquivo do armazenamento:', err); }
    targetArray.splice(index, 1);
    save();
    render();
    showToast('Arquivo excluído.');
}

function sFreq(m) {
    m.historicoFaltas = m.historicoFaltas || [];
    const step = m.lim === 5 ? 1 : (m.lim === 10 ? 2 : (m.lim === 20 ? 4 : 1));
    const faltas = totalFaltas(m);
    const fp = m.lim ? (faltas/m.lim)*100 : 0;
    const isMax = faltas === m.lim;
    const isOver = faltas > m.lim;
    const statusTxt = isOver ? 'REPROVADO POR FALTA' : isMax ? 'LIMITE ATINGIDO' : 'SEGURO';
    const c = isOver ? 'var(--bad)' : isMax ? 'var(--warn)' : fp >= 80 ? 'var(--warn)' : 'var(--ok)';
    
    return `<div class="card glass m-0">
        <div class="flex flex-col md:flex-row gap-8">
            <div class="flex-1">
                <h3 class="mb-2 text-lg text-tx">Registrar Falta</h3>
                <p class="text-xs text-mut mb-4">Como o limite desta matéria é ${m.lim}, cada registro contabilizará <b>+${step} faltas</b>.</p>
                <div class="flex flex-col sm:flex-row gap-4 items-end bg-[rgba(var(--c2-rgb),0.3)] p-4 rounded-xl border border-[rgba(var(--line-rgb),0.3)]">
                    <label class="flex-1 mb-0">Data da Ausência<input type="date" id="data-falta" value="${today()}" class="mt-2"></label>
                    <button class="btn w-full sm:w-auto" style="background:${m.cor}; color:var(--bg-base); border-color:${m.cor};" onclick="regFalta('${m.id}', ${step})"><i class="fa-solid fa-plus mr-2"></i> Registrar (+${step})</button>
                </div>
                <div class="mt-8">
                    <div class="flex justify-between items-center mb-3 border-b border-[rgba(var(--line-rgb),0.2)] pb-2">
                        <h4 class="text-sm text-tx">Histórico de Ausências</h4>
                        <span class="text-[10px] font-bold uppercase chip" style="background:var(--card-rgb)">Total: ${faltas}/${m.lim}</span>
                    </div>
                    ${[...m.historicoFaltas].reverse().map(f => `<div class="flex justify-between items-center bg-[rgba(var(--c2-rgb),0.4)] p-3 rounded-lg mb-2 border border-[rgba(var(--line-rgb),0.1)]"><div class="flex items-center gap-4"><b class="text-sm">${fmt(f.data)}</b><span class="text-xs text-mut">+${f.qtd} faltas</span></div><button class="btn-icon !w-8 !h-8 text-mut hover:!text-bad" onclick="remFalta('${m.id}', '${f.id}')"><i class="fa-solid fa-trash"></i></button></div>`).join('') || '<p class="text-mut italic text-sm">Nenhuma falta registrada. Você está invicto!</p>'}
                </div>
            </div>
            <div class="w-full md:w-64 shrink-0 flex flex-col items-center justify-center bg-[rgba(var(--bg-base-rgb),0.5)] p-6 rounded-2xl border border-[rgba(var(--line-rgb),0.2)] shadow-inner">
                <div class="relative w-32 h-32 rounded-full flex items-center justify-center mb-4" style="background:conic-gradient(${c} ${Math.min(100,fp)}%, rgba(var(--line-rgb),0.2) 0)">
                    <div class="absolute inset-[6px] rounded-full flex flex-col items-center justify-center" style="background:var(--bg-base)">
                        <b class="text-4xl font-serif leading-none" style="color:${c}">${faltas}</b>
                        <span class="text-[10px] text-mut uppercase font-bold mt-1">de ${m.lim}</span>
                    </div>
                </div>
                <b class="text-sm uppercase tracking-widest text-center" style="color:${c}">${statusTxt}</b>
            </div>
        </div>
    </div>`;
}

function sCfg(m) {
    const f = (k,l,t,p) => `<label>${l}<input ${t?'type="number"':''} value="${esc(m[k])}" placeholder="${p||''}" onchange="upd('${m.id}','${k}',this.value)"></label>`;
    return `<div class="card glass mx-auto m-0" style="max-width:700px;">
        <h3 class="mb-6 border-b border-[rgba(var(--line-rgb),0.3)] pb-2 text-lg text-tx">DADOS DO PERGAMINHO</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            ${f('nome','NOME DA DISCIPLINA')} ${f('prof','PROFESSOR(A) / MESTRE')} 
            ${f('local','LOCALIZAÇÃO / SALA')} ${f('hor','HORÁRIOS', false, 'Ex: Ter e Qui · 19h')}
        </div>
        <h3 class="mb-4 mt-6 border-b border-[rgba(var(--line-rgb),0.3)] pb-2 text-lg text-tx">REGRAS DO DOMÍNIO</h3>
        <div class="grid grid-cols-2 gap-6">
            <label>LIMITE DE FALTAS
                <select onchange="upd('${m.id}','lim',this.value)">
                    <option value="5" ${m.lim === 5 ? 'selected' : ''}>5 Faltas (+1 por vez)</option>
                    <option value="10" ${m.lim === 10 ? 'selected' : ''}>10 Faltas (+2 por vez)</option>
                    <option value="20" ${m.lim === 20 ? 'selected' : ''}>20 Faltas (+4 por vez)</option>
                </select>
            </label>
            ${f('min','MÉDIA PARA APROVAÇÃO',1)}
        </div>
        <h3 class="mb-4 mt-6 border-b border-[rgba(var(--line-rgb),0.3)] pb-2 text-lg text-tx">GEMA DA MATÉRIA</h3>
        <div class="sw flex-wrap">${COR.map(c => `<span class="${c===m.cor?'on':''}" title="${GEMA[c]}" style="color:${c};background-color:${c}" onclick="upd('${m.id}','cor','${c}')"></span>`).join('')}</div>
        <div class="mt-10 pt-6 border-t border-[rgba(var(--bad),0.3)]">
            <button class="btn w-full py-4 text-sm uppercase tracking-widest font-bold" style="color:var(--bg-base); background:var(--bad); border-color:var(--bad);" onclick="delM('${m.id}')"><i class="fa-solid fa-skull mr-2"></i> Erradicar Sala Definitivamente</button>
        </div>
    </div>`;
}

// === GRADE HORÁRIA VISUAL ===
function gradeHoraria() {
    const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
    const hours = ['08:00', '10:00', '14:00', '16:00', '19:00', '21:00'];
    let slots = {}; 
    materiasAtuais().forEach(m => {
        if(!m.hor) return;
        const str = m.hor.toLowerCase(); let hr = '19:00'; 
        const hMatch = str.match(/(\d{1,2})h/);
        if(hMatch) { let n = parseInt(hMatch[1]); if(n < 10) hr = '08:00'; else if(n < 13) hr = '10:00'; else if(n < 16) hr = '14:00'; else if(n < 18) hr = '16:00'; else if(n < 20) hr = '19:00'; else hr = '21:00'; }
        ['seg','ter','qua','qui','sex'].forEach((d, i) => { if(str.includes(d)) slots[`${i}_${hr}`] = m; });
    });
    let gridHtml = '';
    const hoje = (new Date().getDay() + 6) % 7;
    hours.forEach(h => {
        gridHtml += `<div class="tt-time">${h}</div>`;
        days.forEach((d, i) => {
            const m = slots[`${i}_${h}`], td = i === hoje ? ' today' : '';
            gridHtml += m ? `<div class="tt-slot cursor-pointer${td}" onclick="openSala('${m.id}')"><div class="tt-class" style="background-color:${m.cor};color:${ink(m.cor)}">${esc(m.nome)}<small>${esc(m.local||'')}</small></div></div>` : `<div class="tt-slot${td}"></div>`;
        });
    });
    const leg = materiasAtuais().map(m => `<span><i style="background:${m.cor}"></i>${esc(m.nome)}</span>`).join('');
    return vhead('GRADE HORÁRIA · ' + esc(S.currentSemestre), 'Sua semana', 'Os horários vêm do campo "Horários" de cada matéria. Clique num bloco para entrar na sala.', 'fa-table-cells') +
    `<div class="card glass overflow-hidden m-0" style="overflow-x:auto"><div class="timetable pb-2"><div></div>${days.map((d,i) => `<div class="tt-header${i===hoje?' today':''}">${d}</div>`).join('')}${gridHtml}</div>${leg ? `<div class="grade-legend">${leg}</div>` : ''}</div>`;
}

// === KANBAN ===
function kanbanView() {
    const tasks = materiasAtuais().flatMap(m => m.ativ.map(a => ({...a, m})));
    let html = `${vhead('QUADRO DE ATIVIDADES · ' + esc(S.currentSemestre), 'Missões', 'Arraste os cartões entre as colunas para atualizar o andamento de cada entrega.', 'fa-map-location-dot', '<button class="btn pri" onclick="openAtivModal()"><i class="fa-solid fa-plus"></i> Nova missão</button>')}<div class="kanban-board scrollbar-thin scrollbar-thumb-mut">`;
    KANBAN_COLS.forEach(col => {
        const colTasks = tasks.filter(t => (t.kStatus || 'todo') === col);
        html += `<div class="kanban-col flex-1 min-w-[280px]">
            <div class="kanban-header"><span>${KANBAN_LABELS[col]}</span> <span class="bg-[rgba(var(--bg-base-rgb),0.5)] px-2 py-0.5 rounded text-xs">${colTasks.length}</span></div>
            <div class="kanban-list" id="kcol-${col}" data-col="${col}">
                ${colTasks.map(t => `<div class="k-card group hover:border-[${t.m.cor}] transition-colors" data-id="${t.id}" data-mid="${t.m.id}" onclick="openAtivModal('${t.m.id}', '${t.id}')" style="border-left: 4px solid ${t.m.cor}"><div class="text-[10px] font-bold uppercase mb-1 tracking-wider" style="color:${t.m.cor}">${esc(t.m.nome)}</div><div class="font-bold text-sm mb-3 text-tx group-hover:text-ac transition-colors">${esc(t.titulo)}</div><div class="flex justify-between items-center"><span class="text-[10px] bg-[rgba(var(--bg-base-rgb),0.5)] px-2 py-1 rounded font-bold uppercase">${t.tipo}</span>${col === 'done' ? '<span class="chip ok">Concluído</span>' : chipD(t)}</div></div>`).join('')}
            </div>
        </div>`;
    });
    return html + `</div>`;
}
function initKanban() {
    KANBAN_COLS.forEach(col => {
        const el = document.getElementById(`kcol-${col}`);
        if(el) new Sortable(el, { group: 'kanban', animation: 150, ghostClass: 'opacity-30', onEnd: function (evt) { const itemEl = evt.item, newCol = evt.to.dataset.col, t = M(itemEl.dataset.mid).ativ.find(x => x.id === itemEl.dataset.id); if(t.kStatus !== newCol) { t.kStatus = newCol; if(newCol === 'done') { t.feito = true; addXP(50, 'Missão Concluída!'); } else t.feito = false; sv(); } } });
    });
}
function openAtivModal(mId, aId) {
    const ms=materiasAtuais(); if(!ms.length) return addMat();
    const editing=!!(mId&&aId), m=editing?M(mId):null, a=editing&&m?m.ativ.find(x=>x.id===aId):null;
    if(editing&&!a) return;
    const title=editing?'Editar missão':'Nova missão';
    mo_(`<div class="modal-heading"><div class="modal-heading-icon"><i class="fa-solid fa-list-check"></i></div><div><h3>${title}</h3><p>Organize os detalhes, o prazo e o andamento da atividade.</p></div></div>
    <div class="field-grid"><label>Matéria<select id="fa-m" ${editing?'disabled':''}>${(editing?[m]:ms).map(x=>`<option value="${x.id}" ${(!editing&&x.id===(mId||sala))?'selected':''}>${esc(x.nome)}</option>`).join('')}</select></label><label>Tipo de atividade<select id="fa-k">${TIPOS.map(t=>`<option ${a&&a.tipo===t?'selected':''}>${t}</option>`).join('')}</select></label><label class="col-span-2">Título<input id="fa-t" value="${esc(a?.titulo||'')}" placeholder="Ex.: Lista de exercícios — capítulo 3"></label><label>Data limite<input type="date" id="fa-d" value="${esc(a?.data||today())}"></label><label>Peso na nota<input type="number" id="fa-p" min="0" step=".1" value="${a?.peso??1}"></label><label>Nota obtida<input type="number" id="fa-n" min="0" max="10" step=".1" value="${a?.nota??''}" placeholder="Não lançada"></label><label>Status<select id="fa-s">${[['todo','A fazer'],['doing','Em andamento'],['review','Revisando'],['done','Concluída']].map(([v,l])=>`<option value="${v}" ${((a?.kStatus||'todo')===v)?'selected':''}>${l}</option>`).join('')}</select></label></div>
    <div class="modal-actions"><button class="btn" onclick="fm()">Cancelar</button><button class="btn pri" onclick="saveAtivModal('${editing?mId:''}','${editing?aId:''}')"><i class="fa-solid fa-check"></i> ${editing?'Salvar alterações':'Criar missão'}</button></div>`);
}
function saveAtivModal(mId,aId){
    const title=$('#fa-t').value.trim(); if(!title){showToast('Informe um título para a atividade.','error');$('#fa-t').focus();return;}
    const target= mId?M(mId):M($('#fa-m').value); if(!target)return;
    const data=$('#fa-d').value, peso=Math.max(0,Number($('#fa-p').value)||0), notaVal=$('#fa-n').value;
    if(aId){const a=target.ativ.find(x=>x.id===aId); if(!a)return; Object.assign(a,{titulo:title,tipo:$('#fa-k').value,data,peso,nota:notaVal===''?'':Math.max(0,Math.min(10,+notaVal)),kStatus:$('#fa-s').value,feito:$('#fa-s').value==='done'});}
    else target.ativ.push({id:uid(),titulo:title,tipo:$('#fa-k').value,data,peso,nota:notaVal===''?'':Math.max(0,Math.min(10,+notaVal)),feito:$('#fa-s').value==='done',kStatus:$('#fa-s').value,feedback:'',melhorias:'',anexos:[],_open:true});
    fm();sv();
}

// === FLASHCARDS ===
let flashcardFilter='all';
function flashcardsView() {
    S.flashcards=S.flashcards||[];
    const ms=materiasAtuais();
    const selected=flashcardFilter;
    const cards=S.flashcards.filter(c=>selected==='all'||(selected==='general'?!c.materiaId:c.materiaId===selected));
    const now=Date.now(), dueCards=cards.filter(c=>(c.nextRev||0)<=now);
    const subjectName=id=>{const m=S.materias.find(x=>x.id===id);return m?m.nome:'Sem matéria vinculada';};
    let html=`${vhead('MEMORIZAÇÃO ATIVA', 'Biblioteca mental', 'Cartões organizados por disciplina para revisar com foco.', 'fa-layer-group', '<button class="btn pri" onclick="addFlashcard()"><i class="fa-solid fa-plus"></i> Criar flashcard</button>')}
    <div class="flash-filterbar"><label>Filtrar por matéria<select id="flash-subject-filter" onchange="flashcardFilter=this.value;render()"><option value="all" ${selected==='all'?'selected':''}>Todas as matérias</option><option value="general" ${selected==='general'?'selected':''}>Sem matéria vinculada</option>${ms.map(m=>`<option value="${m.id}" ${selected===m.id?'selected':''}>${esc(m.nome)}</option>`).join('')}</select></label><span class="section-count"><b>${cards.length}</b> cartões · <b>${dueCards.length}</b> para revisar</span></div>`;
    if(dueCards.length){const c=dueCards[0];html+=`<div class="card glass text-center max-w-2xl mx-auto py-8"><span class="workspace-kicker">REVISÃO PROGRAMADA</span><h3 class="mb-5 text-mut uppercase tracking-widest text-xs font-bold">${dueCards.length} cartão(ões) pendente(s)</h3><div class="flash-subject"><i class="fa-solid fa-book"></i>${esc(subjectName(c.materiaId))}</div><div class="mb-8 cursor-pointer group flip-card" style="perspective:1000px" onclick="this.classList.toggle('flipped')"><div class="flip-card-inner"><div class="f-front bg-[rgba(var(--card-rgb),.9)] border border-ac shadow-xl"><span class="text-xs text-ac mb-4 uppercase font-bold tracking-widest">Pergunta</span><p class="text-xl font-bold font-serif text-tx">${esc(c.q)}</p><p class="text-[10px] text-mut mt-8 uppercase"><i class="fa-solid fa-hand-pointer mr-1"></i>Clique para revelar</p></div><div class="f-back bg-[rgba(var(--ok),.1)] border border-ok shadow-xl"><span class="text-xs text-ok mb-4 uppercase font-bold tracking-widest">Resposta</span><p class="text-base text-tx">${esc(c.a)}</p></div></div></div><div class="flex justify-center gap-3 flex-wrap"><button class="btn border-bad text-bad" onclick="answerCard('${c.id}',false)">Preciso revisar</button><button class="btn border-ok text-ok" onclick="answerCard('${c.id}',true)">Lembrei</button></div></div>`;}
    else html+=`<div class="card glass text-center py-10 mb-6"><i class="fa-solid fa-brain text-5xl text-mut mb-3 opacity-50"></i><h3 class="text-lg">${cards.length?'Tudo revisado!':'Nenhum cartão nesta seleção'}</h3><p class="text-mut text-xs mt-2">${cards.length?'Você está em dia com as revisões desta seleção.':'Crie um cartão e vincule-o a uma matéria para começar.'}</p></div>`;
    html+=`<div class="mt-8"><div class="section-heading"><div><span class="workspace-kicker">SEU ACERVO</span><h3>Cartões cadastrados</h3></div><span class="section-count">${cards.length} cartões</span></div><div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">${cards.map(c=>`<article class="flash-library-card"><span class="flash-subject"><i class="fa-solid fa-book"></i>${esc(subjectName(c.materiaId))}</span><p><b>${esc(c.q)}</b></p><div class="flash-answer">${esc(c.a)}</div><footer><small>Nível ${c.level||0} · ${c.nextRev?new Date(c.nextRev).toLocaleDateString('pt-BR'):'Revisão imediata'}</small><button class="text-bad text-xs" onclick="delFlashcard('${c.id}')" title="Excluir cartão"><i class="fa-solid fa-trash-can"></i></button></footer></article>`).join('')||'<p class="text-mut text-xs col-span-full">Nenhum flashcard encontrado para este filtro.</p>'}</div></div>`;
    return html;
}
function addFlashcard(){
    const ms=materiasAtuais(); if(!ms.length){showToast('Cadastre uma matéria antes de criar flashcards.','warn');return;}
    mo_(`<div class="modal-heading"><div class="modal-heading-icon"><i class="fa-solid fa-layer-group"></i></div><div><h3>Novo flashcard</h3><p>Associe o cartão a uma matéria para filtrar e revisar por disciplina.</p></div></div><label>Matéria<select id="fc-m">${ms.map(m=>`<option value="${m.id}" ${flashcardFilter===m.id?'selected':''}>${esc(m.nome)}</option>`).join('')}</select></label><label>Frente · Pergunta<textarea id="fc-q" rows="3" placeholder="Digite a pergunta ou conceito..."></textarea></label><label>Verso · Resposta<textarea id="fc-a" rows="4" placeholder="Digite a explicação ou resposta..."></textarea></label><div class="modal-actions"><button class="btn" onclick="fm()">Cancelar</button><button class="btn pri" onclick="const q=$('#fc-q').value.trim(),a=$('#fc-a').value.trim(),materiaId=$('#fc-m').value;if(q&&a&&materiaId){S.flashcards.push({id:uid(),q,a,materiaId,level:0,nextRev:Date.now()});addXP(10,'Flashcard criado');fm();flashcardFilter=materiaId;sv();}else showToast('Preencha a pergunta e a resposta.','error')"><i class="fa-solid fa-check"></i> Salvar cartão</button></div>`);
}

function delFlashcard(id) { S.flashcards = S.flashcards.filter(c => c.id !== id); sv(); }
function answerCard(id, correct) { const c = S.flashcards.find(x => x.id === id); if(correct) { c.level = (c.level || 0) + 1; addXP(20, 'Revisão Correta'); } else c.level = 0; c.nextRev = Date.now() + ([0, 1, 3, 7, 15, 30][Math.min(c.level, 5)] * 864e5); sv(); }

// === GUIAS DE ESTUDO (Simulador de IA Nativo) ===
function guiasEstudo() {
    S.guias = S.guias || [];
    return `<div class="flex justify-between items-center mb-6"><h2 class="text-2xl"><i class="fa-solid fa-compass text-ac mr-2"></i> Guias de Estudo</h2><button class="btn pri !rounded-full" onclick="mo_(\`<h3 class='text-xl mb-2 font-serif'>Gerar Mapa de Estudo</h3><p class='text-xs text-mut mb-4'>O Oráculo analisará seu pedido instantaneamente.</p><label>O que deseja estudar?<input id='g-tit' placeholder='Ex: Prova de Termodinâmica'></label><div class='flex justify-end gap-3 mt-4'><button class='btn' onclick='fm()'>Cancelar</button><button class='btn pri' onclick='genGuideAI()'><i class='fa-solid fa-wand-magic-sparkles mr-2'></i> Oráculo (IA)</button></div>\`)"><i class="fa-solid fa-wand-magic-sparkles mr-2"></i> Mapear Rota</button></div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">${S.guias.map(g => { const done = g.steps.filter(s=>s.feito).length, pt = Math.round((done/g.steps.length)*100) || 0; return `<div class="card glass cursor-pointer m-0" onclick="openGuide('${g.id}')"><h3 class="text-lg mb-1">${esc(g.titulo)}</h3><small class="mb-4 font-bold text-mut">${done}/${g.steps.length} Passos Completos</small><div class="w-full h-1.5 bg-[rgba(var(--line-rgb),0.3)] rounded-full overflow-hidden"><div class="h-full" style="width:${pt}%; background:var(--ac)"></div></div></div>`; }).join('') || '<div class="col-span-full text-center py-10 text-mut italic">Nenhum guia forjado ainda.</div>'}</div>`;
}
function genGuideAI() {
    const t = $('#g-tit').value.trim(); if(!t) return showToast('Preencha o que deseja estudar.', 'error');
    // Simulador de resposta de IA (Nativo, sem API)
    const simText = ["Ler o material base", "Fazer resumo dos pontos chaves", "Resolver 5 exercícios de fixação", "Revisar anotações passadas", "Fazer simulado mental do conteúdo"];
    S.guias.push({ id: uid(), titulo: t, steps: simText.map(s => ({ t: s, feito: false })) });
    addXP(50, 'Guia Mágico Criado!'); fm(); sv();
}
function openGuide(id) {
    const g = S.guias.find(x => x.id === id); if(!g) return;
    mo_(`<div class="flex justify-between items-center mb-6"><h3 class="text-xl font-serif text-ac">${esc(g.titulo)}</h3><button class="btn-icon text-bad" onclick="S.guias=S.guias.filter(x=>x.id!=='${id}');sv();fm();"><i class="fa-solid fa-trash"></i></button></div><div class="space-y-3 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-mut">${g.steps.map((s, i) => `<label class="flex items-start gap-3 bg-[rgba(var(--card-rgb),0.4)] p-4 rounded-xl border border-[rgba(var(--line-rgb),0.3)] cursor-pointer hover:border-ac transition-colors"><input type="checkbox" ${s.feito ? 'checked' : ''} onchange="S.guias.find(x=>x.id==='${id}').steps[${i}].feito=this.checked; if(this.checked)addXP(10, 'Passo Concluído'); save(); openGuide('${id}');" class="mt-1"><span class="text-sm flex-1 font-semibold text-tx ${s.feito ? 'line-through opacity-50' : ''}">${esc(s.t)}</span></label>`).join('')}</div><div class="mt-6 flex justify-end"><button class="btn" onclick="fm()">Fechar</button></div>`);
}

// === PERFIL E EXPORTAÇÃO ===
function perfilView() {
    S.badges = S.badges || [];
    const xp = S.xp || 0, lvl = S.level || 1, base = LVL_XP[lvl-1] || 0, next = LVL_XP[lvl] || (base + 10000);
    const p = Math.min(100, Math.max(0, (xp-base)/(next-base)*100));
    const ms = materiasAtuais();
    const concl = ms.reduce((n,m) => n + m.ativ.filter(a => a.feito || a.kStatus === 'done').length, 0);
    const vistos = ms.reduce((n,m) => n + m.cont.filter(c => c.s === 'visto').length, 0);
    return `<section class="perfil-hero">
        <div class="perfil-avatar">${gemSvg()}<b>${lvl}</b></div>
        <div class="perfil-main"><span class="eyebrow">PERFIL ACADÊMICO</span><h2>Nível ${lvl}</h2>
            <div class="xpline"><span>${xp} XP acumulados</span><span>Próximo nível: ${next} XP</span></div>
            <div class="perfil-bar"><i style="width:${p}%"></i></div>
        </div>
        <button class="btn pri" onclick="exportPDF()"><i class="fa-solid fa-file-pdf"></i> Gerar boletim (PDF)</button>
    </section>
    <section class="perfil-stats">
        <div class="pstat"><i class="fa-solid fa-chalkboard-user"></i><b>${ms.length}</b><small>Matérias</small></div>
        <div class="pstat"><i class="fa-solid fa-list-check"></i><b>${concl}</b><small>Atividades concluídas</small></div>
        <div class="pstat"><i class="fa-solid fa-book-open"></i><b>${vistos}</b><small>Tópicos vistos</small></div>
        <div class="pstat"><i class="fa-solid fa-layer-group"></i><b>${(S.flashcards||[]).length}</b><small>Flashcards</small></div>
    </section>
    <section class="card glass"><div class="section-heading"><div><span class="eyebrow">COLEÇÃO</span><h3>Mural de conquistas</h3></div><span class="section-count"><b>${S.badges.length}</b> medalhas</span></div>
        <div class="medal-grid">${S.badges.map(b => `<div class="medal"><i class="fa-solid ${b.icon}"></i><b>${esc(b.name)}</b><small>${fmt(b.date)}</small></div>`).join('') || '<div class="medal-empty"><i class="fa-solid fa-gem"></i>Continue estudando para desbloquear medalhas.</div>'}</div>
    </section>`;
}

async function exportPDF() {
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.text("Academia Ctonia - Boletim Escolar", 14, 20);
    doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.text(`Semestre: ${S.currentSemestre}  |  Nivel de Magia: ${S.level} (${S.xp} XP)`, 14, 30);
    let y = 45;
    materiasAtuais().forEach(m => {
        if(y > 270) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text(m.nome, 14, y); y += 6;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text(`Prof: ${m.prof} | Faltas: ${totalFaltas(m)}/${m.lim} | Media: ${f1(nota(m))}`, 14, y); y += 10;
        m.ativ.forEach(a => { if(y > 280) { doc.addPage(); y = 20; } doc.text(`- ${a.titulo} (${a.tipo}): ${a.nota ? a.nota : 'Pendente'}`, 18, y); y += 6; }); y += 8;
    });
    doc.save(`Boletim_${S.currentSemestre}.pdf`); addXP(20, 'Boletim Gerado');
}

// === AUXILIARES ===
// openGCalModal: implementação real no bloco 'Academia ↔ Google Agenda' (fim do arquivo).

function toggleAcc(mId, itemId, type) { const item = (type === 'cont' ? M(mId).cont : M(mId).ativ).find(x => x.id === itemId); item._open = !item._open; render(); }
function updItemTxt(mId, itemId, type, key, val) { (type === 'cont' ? M(mId).cont : M(mId).ativ).find(x => x.id === itemId)[key] = val; sv(); }
function updateContStatus(mId, itemId, val) { M(mId).cont.find(x => x.id === itemId).s = val; if(val==='visto') addXP(5, 'Tópico Visto'); sv(); }
function delC(i,c) { M(i).cont = M(i).cont.filter(q => q.id !== c); sv(); }
function delA(i,a) { M(i).ativ = M(i).ativ.filter(q => q.id !== a); sv(); }
function upd(i,k,v) { M(i)[k] = ['lim','min'].includes(k) ? (+v||0) : v; sv(); }
function setNota(i,a,v){const x=M(i).ativ.find(q=>q.id===a); x.nota=v===''?'':Math.max(0,Math.min(10,+v)); if(v!=='')x.feito=true; sv();}
function regFalta(mId, step) { M(mId).historicoFaltas.push({ id: uid(), data: $('#data-falta').value || today(), qtd: step }); sv(); }
function remFalta(mId, fId) { M(mId).historicoFaltas = M(mId).historicoFaltas.filter(f => f.id !== fId); sv(); }
function fm() { $('#md').classList.remove('on'); }
function mo_(h) { $('#mb').innerHTML = h; $('#md').classList.add('on'); }
function delM(i) { if(confirm('Excluir permanentemente?')) { S.materias=S.materias.filter(m=>m.id!==i); sala=null; sv(); fm(); } }
function addC(i) {
    const m=M(i); if(!m)return;
    const suggested=`Aula ${((m.cont||[]).length)+1}`;
    const title=prompt('Qual será o nome desta aula? (Você poderá alterá-lo depois.)',suggested);
    if(title===null)return;
    const clean=title.trim()||suggested;
    m.cont.push({id:uid(),t:clean,s:'ver',resumo:'',resumoHtml:'',resumoTexto:'',anexos_aula:[],anexos_perg:[],_open:true});
    sv();
}
function renameCont(mId,itemId){
    const item=M(mId)?.cont?.find(x=>x.id===itemId); if(!item)return;
    const title=prompt('Editar nome da aula:',item.t||'');
    if(title===null)return;
    if(!title.trim()){showToast('O nome da aula não pode ficar vazio.','error');return;}
    item.t=title.trim();sv();
}
let academyNoteTarget=null;
function openAcademyNote(mId,itemId){
    const item=M(mId)?.cont?.find(x=>x.id===itemId);if(!item)return;
    academyNoteTarget={mId,itemId};
    let initial=item.resumoHtml||'';
    if(!initial && item.resumo) initial='<p>'+esc(item.resumo).replace(/\\n/g,'<br>')+'</p>';
    const modal=document.getElementById('academy-note-modal');
    if(!modal){
        const el=document.createElement('div');el.id='academy-note-modal';
        el.innerHTML=`<section class="ac-note-window" role="dialog" aria-modal="true" aria-label="Editor de anotações">
          <header class="ac-note-head"><div><h3><i class="fa-solid fa-feather-pointed mr-2"></i>Anotações e Resumos</h3><p id="ac-note-subtitle">Organize suas ideias com ferramentas simples de edição</p></div><button type="button" class="topic-rename" onclick="closeAcademyNote(false)" aria-label="Fechar"><i class="fa-solid fa-xmark text-xl"></i></button></header>
          <div class="ac-note-toolbar" role="toolbar" aria-label="Formatação">
            <select aria-label="Fonte" onchange="academyFormat('fontName',this.value)"><option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="Times New Roman">Times New Roman</option><option value="Verdana">Verdana</option><option value="Courier New">Courier New</option></select>
            <select aria-label="Tamanho" onchange="academyFormat('fontSize',this.value)"><option value="2">Pequeno</option><option value="3" selected>Normal</option><option value="4">Médio</option><option value="5">Grande</option><option value="6">Muito grande</option><option value="7">Destaque</option></select>
            <span class="tool-sep"></span>
            <button type="button" title="Negrito" onclick="academyFormat('bold')"><b>B</b></button><button type="button" title="Itálico" onclick="academyFormat('italic')"><i>I</i></button><button type="button" title="Sublinhado" onclick="academyFormat('underline')"><u>U</u></button><button type="button" title="Tachado" onclick="academyFormat('strikeThrough')"><s>S</s></button>
            <span class="tool-sep"></span>
            <select aria-label="Estilo" onchange="academyFormat('formatBlock',this.value)"><option value="p">Parágrafo</option><option value="h1">Título 1</option><option value="h2">Título 2</option><option value="h3">Título 3</option><option value="blockquote">Citação</option></select>
            <button type="button" title="Lista" onclick="academyFormat('insertUnorderedList')"><i class="fa-solid fa-list-ul"></i></button><button type="button" title="Lista numerada" onclick="academyFormat('insertOrderedList')"><i class="fa-solid fa-list-ol"></i></button>
            <button type="button" title="Alinhar à esquerda" onclick="academyFormat('justifyLeft')"><i class="fa-solid fa-align-left"></i></button><button type="button" title="Centralizar" onclick="academyFormat('justifyCenter')"><i class="fa-solid fa-align-center"></i></button><button type="button" title="Alinhar à direita" onclick="academyFormat('justifyRight')"><i class="fa-solid fa-align-right"></i></button>
            <span class="tool-sep"></span>
            <button type="button" title="Inserir tabela" onclick="academyInsertTable()"><i class="fa-solid fa-table"></i></button><button type="button" title="Inserir fórmula" onclick="academyInsertFormula()"><i class="fa-solid fa-square-root-variable"></i></button><button type="button" title="Desfazer" onclick="academyFormat('undo')"><i class="fa-solid fa-rotate-left"></i></button><button type="button" title="Refazer" onclick="academyFormat('redo')"><i class="fa-solid fa-rotate-right"></i></button>
          </div>
          <div class="ac-note-paper-wrap"><div id="ac-note-paper" class="ac-note-paper" contenteditable="true" spellcheck="true" data-placeholder="Comece a escrever suas anotações..."></div></div>
          <footer class="ac-note-foot"><small>Suas alterações serão salvas junto à aula.</small><div class="ac-note-actions"><button type="button" class="ac-note-cancel" onclick="closeAcademyNote(false)">Cancelar</button><button type="button" class="ac-note-save" onclick="closeAcademyNote(true)"><i class="fa-solid fa-check mr-1"></i>Salvar anotações</button></div></footer>
        </section>`;
        document.body.appendChild(el);
    }
    const paper=document.getElementById('ac-note-paper');
    document.getElementById('ac-note-subtitle').textContent='Aula: '+(item.t||'Sem título');
    paper.innerHTML=initial||'<p><br></p>';
    academyNoteSavedRange=null;
    document.getElementById('academy-note-modal').classList.add('on');
    setTimeout(()=>{paper.focus();const sel=window.getSelection(),r=document.createRange();r.selectNodeContents(paper);r.collapse(false);sel.removeAllRanges();sel.addRange(r);academyRememberNoteSelection();},30);
}

let academyNoteSavedRange=null;
function academyRememberNoteSelection(){
    const paper=document.getElementById('ac-note-paper'),sel=window.getSelection();
    if(!paper||!sel||!sel.rangeCount)return;
    const r=sel.getRangeAt(0);
    if(paper.contains(r.commonAncestorContainer))academyNoteSavedRange=r.cloneRange();
}
document.addEventListener('selectionchange',academyRememberNoteSelection);
function academyRestoreNoteSelection(){
    const paper=document.getElementById('ac-note-paper');if(!paper)return;
    paper.focus();
    const sel=window.getSelection();
    if(academyNoteSavedRange&&sel){
        try{sel.removeAllRanges();sel.addRange(academyNoteSavedRange)}catch(e){}
    }
}
function academyFormat(command,value=null){
    const paper=document.getElementById('ac-note-paper');if(!paper)return;
    academyRestoreNoteSelection();
    document.execCommand(command,false,value);
    academyRememberNoteSelection();
}
function academyInsertTable(){
    const rows=Math.max(1,Math.min(10,parseInt(prompt('Quantas linhas?','3')||'3',10)||3));
    const cols=Math.max(1,Math.min(8,parseInt(prompt('Quantas colunas?','3')||'3',10)||3));
    let t='<table><tbody>';
    for(let r=0;r<rows;r++){t+='<tr>';for(let c=0;c<cols;c++)t+=`<td>${r===0?'Cabeçalho':'<br>'}</td>`;t+='</tr>';}
    t+='</tbody></table><p><br></p>';
    academyFormat('insertHTML',t);
}
function academyFormulaDialog(){
    let overlay=document.getElementById('ac-formula-overlay');
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.id='ac-formula-overlay';
    overlay.className='ac-formula-overlay';
    overlay.innerHTML=`<section class="ac-formula-dialog" role="dialog" aria-modal="true" aria-label="Inserir equação">
      <div class="flex items-start justify-between gap-3">
        <div><h4>Inserir equação</h4><p class="ac-formula-help">Digite sua expressão ou monte uma fração. A pré-visualização acompanha suas alterações.</p></div>
        <button type="button" class="topic-rename" onclick="academyCloseFormula()" aria-label="Fechar"><i class="fa-solid fa-xmark text-xl"></i></button>
      </div>
      <div class="ac-formula-palette" aria-label="Símbolos matemáticos">
        <button type="button" data-ac-fraction="1" title="Criar fração"><strong>a/b</strong><small>Fração</small></button>
        <button type="button" data-ac-symbol="√" title="Raiz quadrada">√x</button>
        <button type="button" data-ac-symbol="²" title="Expoente dois">x²</button>
        <button type="button" data-ac-symbol="ₙ" title="Índice">xₙ</button>
        <button type="button" data-ac-symbol="∑" title="Somatório">∑</button>
        <button type="button" data-ac-symbol="∫" title="Integral">∫</button>
        <button type="button" data-ac-symbol="lim" title="Limite">lim</button>
        <button type="button" data-ac-symbol="π" title="Pi">π</button>
        <button type="button" data-ac-symbol="α" title="Alfa">α</button>
        <button type="button" data-ac-symbol="β" title="Beta">β</button>
        <button type="button" data-ac-symbol="×" title="Multiplicação">×</button>
        <button type="button" data-ac-symbol="·" title="Produto">·</button>
        <button type="button" data-ac-symbol="≤" title="Menor ou igual">≤</button>
        <button type="button" data-ac-symbol="≥" title="Maior ou igual">≥</button>
      </div>
      <div class="ac-formula-text-editor" id="ac-formula-text-editor">
        <label for="ac-formula-field">Expressão matemática</label>
        <input id="ac-formula-field" type="text" autocomplete="off" spellcheck="false" placeholder="Ex.: 2x + 3 = 7">
      </div>
      <div class="ac-formula-fraction-editor" id="ac-formula-fraction-editor" hidden>
        <label for="ac-formula-numerator">Numerador (parte de cima)</label>
        <input id="ac-formula-numerator" type="text" autocomplete="off" spellcheck="false" placeholder="Digite o numerador">
        <div class="ac-formula-fraction-line" aria-hidden="true"></div>
        <label for="ac-formula-denominator">Denominador (parte de baixo)</label>
        <input id="ac-formula-denominator" type="text" autocomplete="off" spellcheck="false" placeholder="Digite o denominador">
        <button type="button" class="ac-formula-back" id="ac-formula-back">Voltar à expressão</button>
      </div>
      <p class="ac-formula-help" style="margin:13px 0 7px">Pré-visualização</p>
      <div class="ac-formula-preview" id="ac-formula-preview" aria-live="polite"><span class="ac-formula-placeholder">Sua fórmula aparecerá aqui.</span></div>
      <div class="ac-formula-actions">
        <button type="button" class="ac-formula-cancel" onclick="academyCloseFormula()">Cancelar</button>
        <button type="button" class="ac-formula-insert" id="ac-formula-insert" onclick="academyApplyFormula()" disabled><i class="fa-solid fa-check mr-1"></i>Inserir no texto</button>
      </div>
    </section>`;
    overlay.addEventListener('click',e=>{if(e.target===overlay)academyCloseFormula();});
    const field=overlay.querySelector('#ac-formula-field');
    const num=overlay.querySelector('#ac-formula-numerator');
    const den=overlay.querySelector('#ac-formula-denominator');
    [field,num,den].forEach(el=>{
        el.addEventListener('input',academyUpdateFormulaPreview);
        el.addEventListener('keydown',e=>{
            if(e.key==='Enter'&&el!==den){e.preventDefault();if(el===num)den.focus();}
        });
    });
    overlay.querySelectorAll('[data-ac-symbol]').forEach(btn=>{
        btn.addEventListener('mousedown',e=>e.preventDefault());
        btn.addEventListener('click',()=>academyInsertFormulaSymbol(btn.dataset.acSymbol));
    });
    overlay.querySelector('[data-ac-fraction]').addEventListener('click',academyShowFractionEditor);
    overlay.querySelector('#ac-formula-back').addEventListener('click',academyShowTextEditor);
    document.body.appendChild(overlay);
    return overlay;
}
let academyFormulaMode='text';
function academyActiveFormulaInput(){
    const active=document.activeElement;
    if(active&&['ac-formula-field','ac-formula-numerator','ac-formula-denominator'].includes(active.id))return active;
    if(academyFormulaMode==='fraction')return document.getElementById('ac-formula-numerator');
    return document.getElementById('ac-formula-field');
}
function academyInsertFormulaSymbol(symbol){
    const input=academyActiveFormulaInput();
    if(!input)return;
    const start=input.selectionStart??input.value.length;
    const end=input.selectionEnd??start;
    const value=input.value;
    input.value=value.slice(0,start)+symbol+value.slice(end);
    const pos=start+symbol.length;
    input.focus();
    input.setSelectionRange(pos,pos);
    academyUpdateFormulaPreview();
}
function academyShowFractionEditor(){
    academyFormulaMode='fraction';
    document.getElementById('ac-formula-text-editor').hidden=true;
    document.getElementById('ac-formula-fraction-editor').hidden=false;
    document.getElementById('ac-formula-numerator').focus();
    academyUpdateFormulaPreview();
}
function academyShowTextEditor(){
    academyFormulaMode='text';
    document.getElementById('ac-formula-fraction-editor').hidden=true;
    document.getElementById('ac-formula-text-editor').hidden=false;
    document.getElementById('ac-formula-field').focus();
    academyUpdateFormulaPreview();
}
function academyFormulaValues(){
    if(academyFormulaMode==='fraction'){
        return {mode:'fraction',numerator:document.getElementById('ac-formula-numerator').value.trim(),denominator:document.getElementById('ac-formula-denominator').value.trim()};
    }
    return {mode:'text',expression:document.getElementById('ac-formula-field').value.trim()};
}
function academyEscapeMathML(value){
    return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
function academyFormulaMathML(values){
    if(values.mode==='fraction'){
        return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="inline"><mfrac><mrow><mtext>${academyEscapeMathML(values.numerator)}</mtext></mrow><mrow><mtext>${academyEscapeMathML(values.denominator)}</mtext></mrow></mfrac></math>`;
    }
    return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="inline"><mrow><mtext>${academyEscapeMathML(values.expression)}</mtext></mrow></math>`;
}
function academyUpdateFormulaPreview(){
    const preview=document.getElementById('ac-formula-preview');
    const insert=document.getElementById('ac-formula-insert');
    if(!preview||!insert)return;
    const values=academyFormulaValues();
    const valid=values.mode==='fraction'?(!!values.numerator&&!!values.denominator):!!values.expression;
    preview.innerHTML=valid?academyFormulaMathML(values):'<span class="ac-formula-placeholder">Preencha os campos para visualizar a fórmula.</span>';
    insert.disabled=!valid;
}
function academyInsertFormula(){
    const overlay=academyFormulaDialog();
    academyFormulaMode='text';
    document.getElementById('ac-formula-field').value='';
    document.getElementById('ac-formula-numerator').value='';
    document.getElementById('ac-formula-denominator').value='';
    academyShowTextEditor();
    academyUpdateFormulaPreview();
    overlay.classList.add('on');
    setTimeout(()=>document.getElementById('ac-formula-field').focus(),40);
}
function academyCloseFormula(){
    const overlay=document.getElementById('ac-formula-overlay');
    if(overlay)overlay.classList.remove('on');
}
function academyApplyFormula(){
    const values=academyFormulaValues();
    const valid=values.mode==='fraction'?(!!values.numerator&&!!values.denominator):!!values.expression;
    if(!valid)return;
    const mathml=academyFormulaMathML(values);
    academyCloseFormula();
    academyRestoreNoteSelection();
    const wrapper=document.createElement('span');
    wrapper.setAttribute('data-ac-math','1');
    wrapper.setAttribute('contenteditable','false');
    wrapper.className='ac-inserted-math';
    wrapper.innerHTML=mathml;
    const space=document.createTextNode('\u00a0');
    const sel=window.getSelection();
    if(academyNoteSavedRange&&sel){
        try{
            sel.removeAllRanges();
            sel.addRange(academyNoteSavedRange);
            const range=sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(space);
            range.insertNode(wrapper);
            range.setStartAfter(space);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        }catch(err){
            document.getElementById('ac-note-paper')?.append(wrapper,space);
        }
    }else{
        document.getElementById('ac-note-paper')?.append(wrapper,space);
    }
    academyRememberNoteSelection();
}
function closeAcademyNote(save){
    const modal=document.getElementById('academy-note-modal');
    if(save&&academyNoteTarget){
        const item=M(academyNoteTarget.mId)?.cont?.find(x=>x.id===academyNoteTarget.itemId);
        if(item){const paper=document.getElementById('ac-note-paper');item.resumoHtml=paper.innerHTML;item.resumoTexto=paper.innerText||paper.textContent||'';item.resumo=item.resumoTexto;sv();}
    }
    academyCloseFormula();if(modal)modal.classList.remove('on');academyNoteTarget=null;academyNoteSavedRange=null;
}


function addMat() { 
    let pc = COR[S.materias.length % COR.length]; 
    mo_(`<div class="modal-heading"><div class="modal-heading-icon"><i class="fa-solid fa-gem"></i></div><div><h3>Conjurar nova sala</h3><p>Escolha uma gema para identificar a matéria em todo o painel.</p></div></div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
        <label class="md:col-span-2">Matéria<input id="f1" placeholder="Ex: Física Quântica"></label>
        <label>Professor(a)<input id="f2"></label>
        <label>Sala / Local<input id="f3"></label>
        <label>Horários<input id="f4" placeholder="Seg e Qua · 19h"></label>
        <div class="grid grid-cols-2 gap-4">
            <label>Lim. Faltas
                <select id="f5">
                    <option value="5">5 Faltas (+1 por vez)</option>
                    <option value="10" selected>10 Faltas (+2 por vez)</option>
                    <option value="20">20 Faltas (+4 por vez)</option>
                </select>
            </label>
            <label>Média<input id="f6" type="number" step=".1" value="7"></label>
        </div>
    </div>
    <label class="mt-4">Gema da matéria</label>
    <div class="sw mb-6">${COR.map(c => `<span class="${c===pc?'on':''}" title="${GEMA[c]}" style="color:${c};background-color:${c}" onclick="window.pc='${c}';document.querySelectorAll('.sw span').forEach(s=>s.classList.toggle('on',s===this))"></span>`).join('')}</div>
    <div class="flex justify-end gap-3"><button class="btn" onclick="fm()">Cancelar</button><button class="btn pri !rounded-xl" onclick="const n=$('#f1').value.trim();if(n){S.materias.push({id:uid(),semestre:S.currentSemestre,nome:n,prof:$('#f2').value,local:$('#f3').value,hor:$('#f4').value,lim:+$('#f5').value,min:+$('#f6').value,faltas:0,historicoFaltas:[],cor:window.pc,cont:[],ativ:[]});fm();view='salas';sv();}">Criar Sala</button></div>`); 
    window.pc = pc; setTimeout(() => $('#f1').focus(), 50); 
}

const chipD = a => {
    if (a.feito || a.kStatus === 'done') return '';
    const d = dias(a.data);
    if (d < 0) return `<span class="chip bad">${-d}d atrasada</span>`;
    return `<span class="chip ${d<=3?'warn':'ok'}">${d===0?'Hoje':d===1?'Amanhã':'em '+d+'d'}</span>`;
};

document.addEventListener('keydown', e => { if (e.key === 'Escape') fm(); });
render();
