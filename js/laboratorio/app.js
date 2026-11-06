/* ==========================================================================
   Ctônia · Laboratório
   Registro dos experimentos + abertura de cada sub-módulo em uma sala isolada.
   Para criar um experimento: crie a pasta em
     modules/laboratorio/experimentos/<nome>/index.html
   e acrescente um objeto em EXPERIMENTS.
   ========================================================================== */
(function () {
  'use strict';

  const BASE = 'modules/laboratorio/experimentos/';
  // O Laboratório roda tanto dentro do portal (iframe srcdoc, base = raiz do site)
  // quanto aberto direto (base = modules/laboratorio/index.html). Descobrimos a raiz
  // do site para que os caminhos dos experimentos funcionem nos dois casos.
  const EMBEDDED = (function () {
    try { return window.location.protocol === 'about:' || window.location.href.indexOf('srcdoc') !== -1; }
    catch (e) { return false; }
  })();
  const SITE_ROOT = EMBEDDED ? new URL('./', document.baseURI) : new URL('../../', window.location.href);

  const EXPERIMENTS = [
    {
      id: 'biblioteca-viva',
      numeral: 'I',
      title: 'Biblioteca Viva',
      status: 'dev',
      area: 'Biblioteca',
      icon: 'fa-book-open',
      description: 'A biblioteca como ateliê: livro flutuante em 3D, capa/contracapa/lombada diagramáveis, skins com revelação circular, manuscrito com corretor local e bússola de ajustes no hover.',
      tags: ['Livro 3D', 'Skins', 'Manuscrito', 'Corretor'],
      progress: 68,
      updated: '06 nov 2026',
      path: BASE + 'biblioteca-viva/index.html'
    },
    {
      id: 'corretor-local',
      numeral: 'II',
      title: 'Corretor Local',
      status: 'proto',
      area: 'Escrita',
      icon: 'fa-spell-check',
      description: 'Ortografia e pequenos vícios de estilo sem chamar nenhum serviço. Regras em português, dicionário pessoal e sugestões que você aplica com um clique.',
      tags: ['Offline', 'Português', 'Regras'],
      progress: 46,
      updated: '06 nov 2026',
      path: BASE + 'corretor/index.html'
    },
    {
      id: 'estudio-3d',
      numeral: 'III',
      title: 'Estúdio 3D',
      status: 'concept',
      area: 'Capa',
      icon: 'fa-cube',
      description: 'Uma bancada só para o objeto-livro: materiais, foil, relevo, prova de lombada e exportação pronta para impressão.',
      tags: ['Capa dura', 'Foil', 'Impressão'],
      progress: 18,
      updated: 'em desenho',
      path: BASE + '_embreve/index.html',
      soon: {
        kicker: 'Sala em preparação',
        title: 'Estúdio 3D',
        status: 'Conceito',
        description: 'Transformar o livro flutuante da Biblioteca Viva em uma bancada de produção: materiais, relevo, guardas, orelhas e prova de impressão.',
        features: [
          'Capa, contracapa e lombada com medidas reais e sangria',
          'Materiais: linho, couro, papel texturizado e metalizado',
          'Tipografia com foil, baixo-relevo e hot stamping',
          'Exportação de capa em PNG e prova em PDF'
        ],
        roadmap: [
          { phase: 'Fase 01', title: 'Modelo 3D e materiais', state: 'done' },
          { phase: 'Fase 02', title: 'Editor de texto na capa', state: 'doing' },
          { phase: 'Fase 03', title: 'Exportação e prova de impressão', state: 'next' }
        ],
        from: 'biblioteca-viva'
      }
    },
    {
      id: 'bussola',
      numeral: 'IV',
      title: 'Bússola de Ajustes',
      status: 'concept',
      area: 'Interface',
      icon: 'fa-compass',
      description: 'Configurações que se revelam: a bússola cresce no hover e abre um menu radial de aparência, tipografia e correção — sem uma tela de opções sem graça.',
      tags: ['Hover', 'Menu radial', 'Atalhos'],
      progress: 12,
      updated: 'em desenho',
      path: BASE + '_embreve/index.html',
      soon: {
        kicker: 'Sala em preparação',
        title: 'Bússola de Ajustes',
        status: 'Conceito',
        description: 'Um jeito de ajustar o Ctônia sem sair da página: a bússola no canto da tela respira, revela as opções no hover e guarda tudo em um lugar só.',
        features: [
          'Menu radial com aparência, tipografia, correção e dados',
          'Pré-visualização imediata em qualquer tela',
          'Atalhos de teclado para abrir sem mouse',
          'Perfis de ajuste por projeto'
        ],
        roadmap: [
          { phase: 'Fase 01', title: 'Desenho do menu radial', state: 'done' },
          { phase: 'Fase 02', title: 'Integração com as skins', state: 'doing' },
          { phase: 'Fase 03', title: 'Perfis por projeto', state: 'next' }
        ],
        from: 'biblioteca-viva'
      }
    },
    {
      id: 'leitor-imersivo',
      numeral: 'V',
      title: 'Leitor Imersivo',
      status: 'concept',
      area: 'Leitura',
      icon: 'fa-book-open-reader',
      description: 'Modos de leitura com ambiente, tipografia viva e anotações que não interrompem a página. Para ler o que você escreveu como se fosse de outra pessoa.',
      tags: ['Modos', 'Anotações', 'Imersão'],
      progress: 8,
      updated: 'em desenho',
      path: BASE + '_embreve/index.html',
      soon: {
        kicker: 'Sala em preparação',
        title: 'Leitor Imersivo',
        status: 'Conceito',
        description: 'Um leitor que muda de humor com o texto: luz de vela, papel, névoa. A mesma página, outra respiração.',
        features: [
          'Modos de ambiente com transição suave',
          'Tipografia e entrelinha por capítulo',
          'Anotações por margem, sem sair da página',
          'Sessões de leitura cronometradas, sem cobrança'
        ],
        roadmap: [
          { phase: 'Fase 01', title: 'Estudo de ritmo e margens', state: 'doing' },
          { phase: 'Fase 02', title: 'Ambientes e transições', state: 'next' },
          { phase: 'Fase 03', title: 'Anotações de margem', state: 'next' }
        ],
        from: 'biblioteca-viva'
      }
    },
    {
      id: 'ia-local',
      numeral: 'VI',
      title: 'IA Local',
      status: 'concept',
      area: 'Inteligência',
      icon: 'fa-microchip',
      description: 'Conversar com um modelo que roda na sua máquina — Ollama, sem chave e sem nuvem. A correção básica continua existindo mesmo se o modelo estiver desligado.',
      tags: ['Ollama', 'Offline', 'Privacidade'],
      progress: 6,
      updated: 'em desenho',
      path: BASE + '_embreve/index.html',
      soon: {
        kicker: 'Sala em preparação',
        title: 'IA Local',
        status: 'Conceito',
        description: 'Uma camada opcional de inteligência que roda no seu computador. O corretor local continua sendo a base: a IA entra para revisão de prosa, nunca como dependência.',
        features: [
          'Detecção do Ollama em 127.0.0.1:11434',
          'Escolha de modelo conforme a máquina',
          'Revisão de prosa com o texto sem sair do PC',
          'Tudo desligável — o corretor de regras nunca depende dela'
        ],
        roadmap: [
          { phase: 'Fase 01', title: 'Catálogo de modelos locais', state: 'done' },
          { phase: 'Fase 02', title: 'Conexão e diagnóstico', state: 'next' },
          { phase: 'Fase 03', title: 'Revisão de prosa', state: 'next' }
        ],
        from: 'corretor-local'
      }
    }
  ];

  const STATUS = {
    dev: { label: 'Em desenvolvimento', short: 'em desenvolvimento' },
    proto: { label: 'Protótipo', short: 'protótipo' },
    concept: { label: 'Conceito', short: 'conceito' }
  };

  const state = { filter: 'all', q: '' };
  let currentExperiment = null;
  let openToken = 0;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function esc(value) {
    return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function store(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, value);
    } catch (e) { /* modo privado */ }
    return null;
  }

  function toast(message, icon) {
    const el = $('#lab-toast');
    if (!el) return;
    el.querySelector('span').textContent = message;
    el.querySelector('i').className = 'fa-solid ' + (icon || 'fa-circle-info');
    el.classList.add('is-on');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('is-on'), 3400);
  }

  /* ------------------------------------------------------------ skins */
  const SKINS = ['abissal', 'esmeralda', 'ametista', 'ouro', 'gelo'];

  function applySkin(name) {
    if (!SKINS.includes(name)) name = 'abissal';
    document.documentElement.dataset.skin = name;
    store('ct-lab-skin', name);
    $$('.lab-skin').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.skin === name)));
  }

  function swapSkin(name, event) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduce) {
      applySkin(name);
      return;
    }
    const x = event && typeof event.clientX === 'number' ? event.clientX : window.innerWidth / 2;
    const y = event && typeof event.clientY === 'number' ? event.clientY : 40;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) + 40;
    try {
      const transition = document.startViewTransition(() => applySkin(name));
      transition.ready.then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 680, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' }
        );
      }).catch(() => {});
    } catch (e) { applySkin(name); }
  }

  /* ------------------------------------------------------------ registro */
  function renderFilters() {
    $$('.lab-filter').forEach(btn => {
      const key = btn.dataset.filter;
      const count = key === 'all' ? EXPERIMENTS.length : EXPERIMENTS.filter(ex => ex.status === key).length;
      const n = btn.querySelector('.lab-filter__n');
      if (n) n.textContent = count;
    });
  }

  function filtered() {
    const q = state.q.trim().toLowerCase();
    return EXPERIMENTS.filter(ex => {
      if (state.filter !== 'all' && ex.status !== state.filter) return false;
      if (!q) return true;
      return [ex.title, ex.area, ex.description, ex.tags.join(' '), STATUS[ex.status].label]
        .join(' ').toLowerCase().includes(q);
    });
  }

  function cardHTML(ex, index) {
    const specs = STATUS[ex.status];
    const recent = (store('ct-lab-recent') || '').split(',').filter(Boolean).includes(ex.id);
    const action = ex.status === 'concept' ? 'Espiar a sala' : 'Abrir experimento';
    return `
      <a class="lab-card" href="#experimento=${esc(ex.id)}" data-id="${esc(ex.id)}" data-status="${esc(ex.status)}"
         style="animation-delay:${Math.min(index * 45, 260)}ms"
         aria-label="${esc(ex.title)} — ${esc(specs.label)}. ${esc(action)}">
        <span class="lab-card__top">
          <span class="lab-card__num">${recent ? '<i class="fa-solid fa-circle lab-visited" title="Já visitada"></i> ' : ''}${esc(ex.numeral)}</span>
          <span class="lab-card__status"><i></i>${esc(specs.label)}</span>
        </span>
        <span class="lab-card__glyph"><i class="fa-solid ${esc(ex.icon)}" aria-hidden="true"></i></span>
        <span class="lab-card__title">${esc(ex.title)}</span>
        <span class="lab-card__desc">${esc(ex.description)}</span>
        <span class="lab-card__tags">${ex.tags.map(t => `<span>${esc(t)}</span>`).join('')}</span>
        <span class="lab-card__foot">
          <span class="lab-card__meta">${esc(ex.area)} · ${esc(ex.updated)}</span>
          <span class="lab-card__open">${esc(action)} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
        </span>
        <span class="lab-card__progress" style="--p:${Number(ex.progress) || 0}%"><i></i></span>
      </a>`;
  }

  function renderGrid() {
    const grid = $('#lab-grid');
    const empty = $('#lab-empty');
    const count = $('#lab-count');
    if (!grid) return;

    const list = filtered();
    grid.innerHTML = list.map(cardHTML).join('');
    grid.hidden = list.length === 0;
    if (empty) empty.hidden = list.length !== 0;

    if (count) {
      const label = state.filter === 'all' ? 'todas as salas' : (STATUS[state.filter] ? STATUS[state.filter].short : state.filter);
      count.textContent = `${list.length} ${list.length === 1 ? 'sala' : 'salas'} · ${label}${state.q.trim() ? ` · “${state.q.trim()}”` : ''}`;
    }
    applySkin(document.documentElement.dataset.skin || 'abissal');
  }

  function setFilter(filter) {
    state.filter = filter;
    $$('.lab-filter').forEach(btn => {
      const on = btn.dataset.filter === filter;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    renderGrid();
  }

  /* ------------------------------------------------------------ abrir / fechar sala */
  function setHash(value) {
    try {
      if (value) history.replaceState(null, '', '#experimento=' + value);
      else history.replaceState(null, '', location.pathname + location.search);
    } catch (e) {
      try { location.hash = value ? 'experimento=' + value : ''; } catch (e2) {}
    }
  }

  function clearHash() { setHash(null); }

  function readHash() {
    const m = /(?:^|[#&])experimento=([\w-]+)/.exec(location.hash || '');
    return m ? m[1] : null;
  }

  function remember(id) {
    const list = (store('ct-lab-recent') || '').split(',').filter(Boolean).filter(x => x !== id);
    list.unshift(id);
    store('ct-lab-recent', list.slice(0, 5).join(','));
  }

  async function openExperiment(id) {
    const experiment = EXPERIMENTS.find(ex => ex.id === id);
    if (!experiment) return;

    const runner = $('#lab-runner');
    const frame = $('#lab-runner-frame');
    const loading = $('#lab-runner-loading');
    const error = $('#lab-runner-error');
    if (!runner || !frame) return;

    const token = ++openToken;
    currentExperiment = experiment;
    remember(id);

    runner.hidden = false;
    runner.classList.remove('is-ready');
    loading.hidden = false;
    error.hidden = true;
    $('#lab-runner-name').textContent = experiment.title;
    frame.srcdoc = '';
    document.body.classList.add('lab-open');
    setHash(id);

    try {
      const url = new URL(experiment.path, SITE_ROOT);
      const [res] = await Promise.all([
        fetch(url, { cache: 'no-cache' }),
        new Promise(resolve => setTimeout(resolve, 480))
      ]);
      if (!res.ok) throw new Error('HTTP ' + res.status + ' ao abrir ' + experiment.path);
      if (token !== openToken) return;

      let html = await res.text();
      if (frame.contentWindow) frame.contentWindow.stop && frame.contentWindow.stop();

      const baseTag = `<base href="${esc(url.href)}">`;
      html = /<head[^>]*>/i.test(html)
        ? html.replace(/<head([^>]*)>/i, (m, attrs) => `<head${attrs}>${baseTag}`)
        : baseTag + html;

      if (experiment.soon) {
        const payload = Object.assign({}, experiment.soon, { id: experiment.id });
        html = html.replace(/<\/head>/i, `<script>window.LAB_SOON=${JSON.stringify(payload).replace(/</g, '\\u003c')};<\/script></head>`);
      }

      let settled = false;
      const onLoad = () => {
        if (settled || token !== openToken) return;
        settled = true;
        loading.hidden = true;
        runner.classList.add('is-ready');
      };
      frame.addEventListener('load', onLoad, { once: true });
      frame.srcdoc = html;
      // Rede lenta ou load silencioso: libera a sala depois de um teto.
      setTimeout(() => { if (!settled && token === openToken) onLoad(); }, 5200);
    } catch (err) {
      if (token !== openToken) return;
      console.error('[Laboratório]', err);
      loading.hidden = true;
      error.hidden = false;
      $('#lab-runner-error-msg').textContent =
        'Não foi possível carregar “' + experiment.title + '”. Confira se o arquivo ' + experiment.path + ' existe e se o site está aberto por http(s).';
    }
  }

  function closeExperiment() {
    const runner = $('#lab-runner');
    const frame = $('#lab-runner-frame');
    if (!runner || runner.hidden) return;
    openToken++;
    currentExperiment = null;
    runner.classList.add('is-ready');
    runner.hidden = true;
    runner.classList.remove('is-ready');
    if (frame) frame.srcdoc = '';
    document.body.classList.remove('lab-open');
    clearHash();
    const id = (store('ct-lab-recent') || '').split(',')[0];
    const card = id && document.querySelector(`.lab-card[data-id="${id}"]`);
    if (card) card.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------ utilidades do portal */
  function labExit() {
    try {
      if (window.parent && window.parent !== window && typeof window.parent.closeCtoniaLaboratorio === 'function') {
        window.parent.closeCtoniaLaboratorio();
        return;
      }
    } catch (e) { /* iframe isolado */ }
    try { window.top.location.href = new URL('index.html', SITE_ROOT).href; } catch (e) { history.back(); }
  }

  /* ------------------------------------------------------------ eventos */
  function bind() {
    $('#lab-back').addEventListener('click', labExit);

    $$('.lab-skin').forEach(btn => {
      btn.addEventListener('click', event => swapSkin(btn.dataset.skin, event));
    });

    $$('.lab-filter').forEach(btn => {
      btn.addEventListener('click', () => setFilter(btn.dataset.filter));
    });

    const search = $('#lab-search');
    if (search) {
      search.addEventListener('input', () => { state.q = search.value; renderGrid(); });
    }

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        if (!$('#lab-runner').hidden) { event.preventDefault(); closeExperiment(); return; }
        if (search && document.activeElement === search && search.value) { search.value = ''; state.q = ''; renderGrid(); return; }
        if (search && document.activeElement === search) { search.blur(); return; }
        event.preventDefault();
        labExit();
        return;
      }
      const typing = /^(input|textarea|select)$/i.test((event.target.tagName || '')) || event.target.isContentEditable;
      if (typing) return;
      if (event.key === '/' && search) {
        event.preventDefault();
        search.focus();
        search.select();
      }
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        const cards = $$('.lab-card');
        const index = cards.indexOf(document.activeElement);
        if (index === -1) return;
        event.preventDefault();
        const next = event.key === 'ArrowRight' ? (index + 1) % cards.length : (index - 1 + cards.length) % cards.length;
        cards[next].focus();
        cards[next].scrollIntoView({ block: 'nearest' });
      }
    });

    // Abrir qualquer card / atalho do herói
    document.addEventListener('click', event => {
      const opener = event.target.closest('[data-open]');
      if (opener) {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1) return;
        event.preventDefault();
        openExperiment(opener.dataset.open);
        return;
      }
      const card = event.target.closest('.lab-card');
      if (card) {
        if (event.ctrlKey || event.metaKey || event.shiftKey) return;
        event.preventDefault();
        openExperiment(card.dataset.id);
      }
    });

    // Halo que segue o cursor nos cards
    const grid = $('#lab-grid');
    if (grid) {
      grid.addEventListener('pointermove', event => {
        const card = event.target.closest('.lab-card');
        if (!card) return;
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', (event.clientX - rect.left) + 'px');
        card.style.setProperty('--my', (event.clientY - rect.top) + 'px');
      });
    }

    $('#lab-runner-cancel').addEventListener('click', closeExperiment);
    $('#lab-runner-exit').addEventListener('click', closeExperiment);
    $('#lab-runner-retry').addEventListener('click', () => currentExperiment && openExperiment(currentExperiment.id));

    // volta ao laboratório a partir de um experimento que use postMessage
    window.addEventListener('message', event => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'lab:close') closeExperiment();
      if (data.type === 'lab:open' && typeof data.id === 'string') openExperiment(data.id);
    });

    window.addEventListener('hashchange', () => {
      const id = readHash();
      if (id && (!currentExperiment || currentExperiment.id !== id)) openExperiment(id);
      else if (!id && currentExperiment) closeExperiment();
    });
  }

  /* ------------------------------------------------------------ início */
  function init() {
    applySkin(store('ct-lab-skin') || 'abissal');
    renderFilters();
    renderGrid();
    bind();

    const active = EXPERIMENTS.filter(ex => ex.status !== 'concept').length;
    const activeEl = $('#lab-active-count');
    if (activeEl) activeEl.textContent = String(active).padStart(2, '0');

    const wanted = readHash();
    if (wanted && EXPERIMENTS.some(ex => ex.id === wanted)) {
      setTimeout(() => openExperiment(wanted), 220);
    }

    // expõe para os experimentos (e para depuração no console)
    window.labOpenExperiment = openExperiment;
    window.labCloseExperiment = closeExperiment;
    window.labExperiments = EXPERIMENTS;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
