/* ==========================================================================
   Ctônia · Laboratório — Biblioteca Viva
   Protótipo de biblioteca-ateliê. Tudo local: localStorage + DOM.
   ========================================================================== */
(function () {
  'use strict';

  const STORE = 'ct-lab-bv-v1';
  const SKIN_KEY = 'ct-lab-bv-skin';
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  /* ------------------------------------------------------------- dados base */
  const SKINS = [
    { id: 'abissal', name: 'Abissal', sw: '#3fbfa8', sw2: '#c9a86a' },
    { id: 'esmeralda', name: 'Esmeralda', sw: '#63d6a5', sw2: '#d4b87a' },
    { id: 'ametista', name: 'Ametista', sw: '#b79bff', sw2: '#e3c1df' },
    { id: 'ouro', name: 'Ouro', sw: '#e0b06a', sw2: '#d99b5b' },
    { id: 'papel', name: 'Papel', sw: '#efe7d4', sw2: '#94631f' },
    { id: 'sangue', name: 'Sangue', sw: '#e06b6b', sw2: '#d9a06a' },
    { id: 'ceu', name: 'Céu', sw: '#6cc7e8', sw2: '#d8c48a' },
    { id: 'obsidiana', name: 'Obsidiana', sw: '#a7b0a6', sw2: '#c9c2ad' }
  ];

  const PROJECT_SEED = [
    {
      id: 'estrela', title: 'Estrela do Caos', author: 'K. R. Valetius', genre: 'Fantasia',
      words: 159002, chapters: 46, scenes: 12, world: 121, progress: 100,
      opened: '19/09/2026', modified: '19/09/2026',
      pal: ['#16414e', '#07171f', '#a9e9e2', '#f2ecdc', 'fa-star'],
      synopsis: 'Uma estrela caiu onde ninguém ousava olhar. O gelo guardou o nome dela por séculos — até o dia em que uma princesa sem coroa decidiu atravessá-lo.',
      quote: 'O gelo queima como o fogo.',
      goal: { measure: 'Capítulos', target: 46 }
    },
    {
      id: 'ecos', title: 'Ecos do Desespero', author: 'K. R. Valetius', genre: 'Fantasia sombria',
      words: 48404, chapters: 13, scenes: 9, world: 64, progress: 33,
      opened: '12/08/2026', modified: '02/11/2026',
      pal: ['#1b2b46', '#070d18', '#c9a86a', '#e6e0cf', 'fa-moon'],
      synopsis: 'Zeshirom sobreviveu à ira dos deuses e caminha entre os escombros de uma era que não deveria ter fim.',
      quote: 'Nada vive para sempre — nem mesmo o medo.',
      goal: { measure: 'Capítulos', target: 13 }
    },
    {
      id: 'destinos', title: 'Destinos Entrelaçados', author: 'K. R. Valetius', genre: 'Romance',
      words: 148157, chapters: 38, scenes: 27, world: 88, progress: 100,
      opened: '03/05/2026', modified: '28/10/2026',
      pal: ['#5a3a1c', '#1a0f08', '#f0c977', '#f6e8cf', 'fa-sun'],
      synopsis: 'Duas vidas que se cruzam na estação errada, no ano errado, com a coragem certa.',
      quote: 'Todo encontro é uma segunda chance disfarçada.',
      goal: { measure: 'Capítulos', target: 38 }
    },
    {
      id: 'pilares', title: 'Pilares do Cosmos', author: 'K. R. Valetius', genre: 'Ficção científica',
      words: 1606, chapters: 1, scenes: 2, world: 41, progress: 3,
      opened: '04/11/2026', modified: '05/11/2026',
      pal: ['#244a5a', '#08141c', '#a9e9ff', '#eef4f6', 'fa-eye'],
      synopsis: 'No fim de tudo, restam quatro colunas e uma pergunta: quem segura o céu quando os deuses se cansam?',
      quote: 'O cosmos não tem piedade — tem paciência.',
      goal: { measure: 'Capítulos', target: 10 }
    },
    {
      id: 'meuamor', title: 'Meu amor', author: 'K. R. Valetius', genre: 'Drama',
      words: 0, chapters: 1, scenes: 0, world: 3, progress: 0,
      opened: '06/11/2026', modified: '06/11/2026',
      pal: ['#1e3a2a', '#08130d', '#7bd6a8', '#e8f1e8', 'fa-leaf'],
      synopsis: '',
      quote: 'Começou ontem. Ainda não tem nome.',
      goal: null
    },
    {
      id: 'milsois', title: 'Mil Sóis', author: 'K. R. Valetius', genre: 'Fantasia épica',
      words: 0, chapters: 2, scenes: 0, world: 12, progress: 0,
      opened: '01/10/2026', modified: '01/10/2026',
      pal: ['#5a3a12', '#1c1106', '#ffd27a', '#f8edd6', 'fa-sun'],
      synopsis: 'Quando o último sol se apagar, alguém vai precisar lembrar como era o amanhecer.',
      quote: 'A luz não pede licença para nascer.',
      goal: null
    },
    {
      id: 'beta', title: 'Ficha para Leitor Beta', author: 'K. R. Valetius', genre: 'Não ficção',
      words: 2118, chapters: 3, scenes: 0, world: 5, progress: 40,
      opened: '22/09/2026', modified: '18/10/2026',
      pal: ['#3a1e1e', '#150808', '#e88a7a', '#f2e2de', 'fa-feather'],
      synopsis: 'Perguntas para quem vai ler o manuscrito antes de todo mundo.',
      quote: 'Quem lê com honestidade é cúmplice da obra.',
      goal: null
    },
    {
      id: 'cemiterio', title: 'Cemitério de Baleias', author: 'K. R. Valetius', genre: 'Horror',
      words: 0, chapters: 0, scenes: 0, world: 8, progress: 0,
      opened: '14/07/2026', modified: '14/07/2026',
      pal: ['#16281f', '#060d09', '#9fb8a8', '#e6ece4', 'fa-skull'],
      synopsis: 'No fundo do mar, os ossos cantam. Alguém precisa parar de escutar.',
      quote: 'O silêncio também tem dentes.',
      goal: null
    },
    {
      id: 'fardo', title: 'O Fardo de XXX', author: 'K. R. Valetius', genre: 'Aventura',
      words: 0, chapters: 0, scenes: 0, world: 15, progress: 0,
      opened: '09/06/2026', modified: '09/06/2026',
      pal: ['#2a2018', '#0f0a06', '#c9a86a', '#ece2d0', 'fa-box'],
      synopsis: '',
      quote: 'Toda carga escolhe o ombro que a carrega.',
      goal: null
    },
    {
      id: 'divino', title: 'Divinomaquia', author: 'K. R. Valetius', genre: 'Épico',
      words: 13944, chapters: 3, scenes: 6, world: 52, progress: 22,
      opened: '18/02/2026', modified: '11/10/2026',
      pal: ['#2c1b46', '#0d0718', '#c9a3ff', '#eee6f8', 'fa-crown'],
      synopsis: 'A guerra dos deuses não é travada no céu. É travada dentro de quem ainda acredita.',
      quote: 'Nenhum deus cai sozinho.',
      goal: null
    },
    {
      id: 'memoria', title: 'Memória do Autor', author: 'K. R. Valetius', genre: 'Diário',
      words: 2619, chapters: 1, scenes: 0, world: 2, progress: 12,
      opened: '27/10/2026', modified: '04/11/2026',
      pal: ['#3a2a1c', '#160f08', '#d8c48a', '#f2e8d6', 'fa-feather'],
      synopsis: 'Anotações soltas para não esquecer de onde veio a história.',
      quote: 'Escrever é lembrar duas vezes.',
      goal: null
    },
    {
      id: 'tsele', title: 'Tselehitas', author: 'K. R. Valetius', genre: 'Mistério',
      words: 0, chapters: 0, scenes: 0, world: 7, progress: 0,
      opened: '30/08/2026', modified: '30/08/2026',
      pal: ['#1c2a3a', '#070d14', '#9fc8e8', '#e7eef4', 'fa-globe'],
      synopsis: '',
      quote: 'Há cidades que só existem enquanto são lembradas.',
      goal: null
    },
    {
      id: 'atlas', title: 'Atlas das Cidades Mortas', author: 'K. R. Valetius', genre: 'Atlas',
      words: 200, chapters: 0, scenes: 0, world: 30, progress: 0,
      opened: '17/10/2026', modified: '17/10/2026',
      pal: ['#243c2c', '#0a140d', '#b9d6a8', '#eaf0e6', 'fa-map'],
      synopsis: 'Mapas de lugares que o tempo decidiu apagar.',
      quote: 'Toda cidade morta ainda sonha com seus mapas.',
      goal: null
    }
  ];

  const ESTRELA_CHAPTERS = [
    { title: 'Epígrafe', html: '<p>“Há um tempo em que o mundo se cala — e é exatamente aí que a estrela cai.”</p><p>— Cânone de Cindar, livro I</p>' },
    { title: 'A Era da Glória', html: '<p>Antes do gelo, Cindar era uma cidade de vidro e de vozes. As torres repetiam os nomes de quem chegava, e as pessoas acreditavam que o mundo tinha sido feito para durar.</p><p>Leyrian nasceu no ano do último festival. Sua mãe disse que a criança abriu os olhos durante o hino e não chorou — ficou olhando o céu como quem reconhece alguém de longe.</p>' },
    { title: 'Paz Maculada', html: '<p>O tratado foi assinado no salão de mármore, entre taças que ninguém bebeu. O reino prometeu esquecer; o norte prometeu lembrar.</p><p>Foi uma paz de palavras cuidadosas. Durante doze anos, ninguém disse certas coisas em voz alta — e todos ouviram.</p>' },
    { title: 'Ecos da Dor', html: '<p>A primeira rachadura apareceu no muro leste, na forma de uma mão. Ninguém sabia de quem era. A cidade rezou, como se rezar fosse cimento.</p><p>Leyrian tocou a pedra e sentiu o pulso de outra coisa. Não era magia. Era memória.</p>' },
    { title: 'Ecos da Sombra', html: '<p>Zeshirom caminhava sem apressar o passo. Havia séculos, aprendera que o medo é uma casa — e que se pode morar nele sem pagar aluguel.</p><p>Quando a menina o viu no fim do corredor, não correu. Isso o incomodou mais do que qualquer espada.</p>' },
    { title: 'Ecos da Crônica', html: '<p>O livro estava aberto na mesa, na página que nunca fora escrita. As letras surgiam devagar, como se alguém do outro lado tivesse frio nos dedos.</p><p>Leyrian leu o próprio nome. Depois leu a data da própria morte. Depois fechou o livro com cuidado, para não acordar o que dormia ali.</p>' },
    { title: 'Ecos da Descoberta', html: '<p>Havia uma porta no subsolo que não levava a lugar nenhum. Todos os mapas concordavam. A porta, no entanto, discordava.</p><p>Ela abriu com um sopro. Do outro lado, a neve caía para cima.</p>' },
    { title: 'Ecos da Fúria', html: '<p>O fogo veio do céu, mas o cheiro era de terra. As pessoas correram para o templo, como se pedra pudesse proteger de deuses.</p><p>Leyrian ficou no meio da praça. Pela primeira vez, a coroa pesou menos que a raiva.</p>' },
    { title: 'O Preço do Silêncio', html: '<p>Ninguém falou durante três dias. Não por luto — por medo de que a primeira palavra abrisse a comporta.</p><p>No quarto dia, a menina cantou. Foi uma canção de ninar que a mãe lhe ensinara. O mundo, por um instante, esqueceu de acabar.</p>' },
    { title: 'Lealdade e Cinzas', html: '<p>O guarda ajoelhou-se. Não por dever, mas porque as pernas não obedeciam mais.</p><p>— Eu vi o que você fez — disse ele. — Não sei se foi milagre ou crime. Mas eu vi.</p><p>Leyrian não respondeu. Algumas respostas só existem depois.</p>' },
    { title: 'O Coração de Gelo', html: '<p>Dizem que o coração da montanha bate uma vez por século. Naquele inverno, bateu duas.</p><p>Os sismógrafos dos monges enlouqueceram. As bússolas apontaram para baixo. E a princesa sem coroa começou a sonhar com um lugar que nunca visitara.</p>' },
    { title: 'Preparativos', html: '<p>As malas foram feitas em silêncio. Roupas de lã, sal, uma faca que não cortava nada — mas que a mãe jurara ser importante.</p><p>Leyrian deixou na mesa um bilhete de três palavras. Não era despedida. Era promessa.</p>' },
    {
      title: 'Metanóia',
      html: '<p>Quero que entenda, hoje, a afirmação de sua coroa depende de nosso sucesso. Mas, se trabalharmos nosso poder, poderá não retomar, mas afirmar que é teu porque és, dente todas as Cindars, a mair.</p><p> As palavras de Leyrian martelavam a cabeça da jovem princesa.</p><p>Embora exausta das aulas com a feiticeira, não perdia a fé em seu poder. O esforço da jovem era heroico . Ele gostou muito do que havia feito, e tambem disse que voce nao deveria temer, porque a magia que ela carregava era antiga e o mundo ainda não sabia o nome dela, e mesmo assim todos os reinos temiam a menina que caminhava entre as estrelas e falava com os mortos sem pedir licença a ninguem.</p><p>Um teste de execução!!!</p>'
    }
  ];

  const DAILY_QUOTES = [
    { text: 'Liberdade é pouco. O que eu desejo ainda não tem nome.', author: 'Clarice Lispector' },
    { text: 'Escrever é uma maneira de sangrar.', author: 'Clarice Lispector' },
    { text: 'A memória é um lugar onde o tempo se dobra.', author: 'K. R. Valetius' },
    { text: 'Não há vento que carregue uma história inteira.', author: 'Provérbio de Cindar' },
    { text: 'O que não foi dito ainda está acontecendo.', author: 'K. R. Valetius' }
  ];

  const RULES_DEFAULT = { acento: true, repeticao: true, espaco: true, pontuacao: true, maiuscula: true, frase: true };

  /* ------------------------------------------------------------- utilidades */
  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function format(n) {
    return Number(n || 0).toLocaleString('pt-BR');
  }

  function countWords(text) {
    return String(text || '').match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length || 0;
  }

  function htmlToText(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return tmp.textContent || '';
  }

  function localDay() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function nowLabel() {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function todayBR() {
    return new Date().toLocaleDateString('pt-BR');
  }

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

  function hexToRgba(hex, alpha) {
    const clean = String(hex || '#c9a86a').replace('#', '');
    const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
    const n = parseInt(full, 16);
    if (Number.isNaN(n)) return 'rgba(201,168,106,' + alpha + ')';
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function shade(hex, amount) {
    const clean = String(hex || '#c9a86a').replace('#', '');
    const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
    const n = parseInt(full, 16);
    if (Number.isNaN(n)) return hex;
    const r = clamp(((n >> 16) & 255) + amount, 0, 255);
    const g = clamp(((n >> 8) & 255) + amount, 0, 255);
    const b = clamp((n & 255) + amount, 0, 255);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function toast(message, icon) {
    const el = $('#bv-toast');
    if (!el) return;
    el.querySelector('span').textContent = message;
    el.querySelector('i').className = 'fa-solid ' + (icon || 'fa-circle-info');
    el.classList.add('is-on');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('is-on'), 3400);
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type: type || 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function slug(value) {
    return String(value || 'projeto').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'projeto';
  }

  /* ------------------------------------------------------------- estado */
  function buildProjects() {
    return PROJECT_SEED.map(seed => {
      const project = Object.assign({}, seed);
      project.subtitle = (project.genre || 'Manuscrito') + ' · revisão em curso';
      project.status = 'ativo';
      project.cover = defaultCover(project);
      return project;
    });
  }

  function defaultCover(project) {
    const pal = project.pal || ['#16414e', '#07171f', '#c9a86a', '#f2ecdc', 'fa-star'];
    return {
      title: project.title,
      over: (project.author || 'AUTOR').toUpperCase(),
      foot: 'EDIÇÃO DE ESTÚDIO',
      cloth: pal[0],
      foil: pal[2],
      ink: pal[3],
      texture: 'linho',
      glyph: pal[4] || 'fa-star',
      spineText: project.title.toUpperCase(),
      spineAuthor: (project.author || '').toUpperCase(),
      spineColor: pal[1],
      synopsis: project.synopsis || 'Sinopse ainda não escrita. Toda contracapa começa em branco.',
      backQuote: project.quote || '',
      isbn: '978-65-0000-000-0',
      image: null
    };
  }

  const defaultState = () => ({
    projectId: 'estrela',
    pinned: ['estrela', 'ecos', 'destinos', 'pilares'],
    projects: buildProjects(),
    chapters: {},
    activity: [
      { icon: 'fa-plus', text: 'Capítulo “Metanóia” criado', meta: 'agora · K. R. Valetius' },
      { icon: 'fa-book-open', text: 'Livro “Estrela do Caos” aberto', meta: 'agora · K. R. Valetius' },
      { icon: 'fa-feather', text: 'Sessão de escrita encerrada', meta: 'ontem · 47 min' }
    ],
    daily: { goal: 1000, written: 0, date: localDay() },
    settings: {
      spellcheck: true,
      rules: Object.assign({}, RULES_DEFAULT),
      editor: { font: 'Lora', size: 16, line: 1.9 },
      density: 'comfy',
      motion: true
    },
    selectedChapter: {},
    quoteIndex: 0,
    skin: 'abissal',
    railMin: false,
    view: 'library',
    toggles: { projeto: true, salvo: true, arca: true, fullscreen: false }
  });

  let state = defaultState();
  let searchQuery = '';
  let reviewIssues = [];
  let currentReviewBlock = null;
  let suppressBeforeUnloadSave = false;

  function load() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
    if (!saved || !Array.isArray(saved.projects) || !saved.projects.length) return;

    state = Object.assign(defaultState(), saved);
    state.projects = saved.projects.map(project => {
      const fallback = PROJECT_SEED.find(p => p.id === project.id);
      const base = fallback ? Object.assign({}, fallback) : {};
      const merged = Object.assign(base, project);
      if (!merged.pal) merged.pal = ['#16414e', '#07171f', '#c9a86a', '#f2ecdc', 'fa-star'];
      if (!merged.cover) merged.cover = defaultCover(merged);
      if (!merged.subtitle) merged.subtitle = (merged.genre || 'Manuscrito') + ' · revisão em curso';
      return merged;
    });
    state.settings = Object.assign(defaultState().settings, saved.settings || {});
    state.settings.rules = Object.assign({}, RULES_DEFAULT, (saved.settings && saved.settings.rules) || {});
    state.settings.editor = Object.assign({ font: 'Lora', size: 16, line: 1.9 }, (saved.settings && saved.settings.editor) || {});
    state.daily = Object.assign({ goal: 1000, written: 0, date: localDay() }, saved.daily || {});
    if (state.daily.date !== localDay()) state.daily = { goal: state.daily.goal || 1000, written: 0, date: localDay() };
    if (!Array.isArray(state.pinned)) state.pinned = ['estrela'];
    if (!state.chapters || typeof state.chapters !== 'object') state.chapters = {};
    if (!state.toggles) state.toggles = { projeto: true, salvo: true, arca: true, fullscreen: false };
    if (!state.projects.some(p => p.id === state.projectId)) state.projectId = state.projects[0].id;
  }

  let saveTimer = null;
  function savePayload() {
    return {
      projectId: state.projectId, pinned: state.pinned, projects: state.projects,
      chapters: state.chapters, activity: state.activity, daily: state.daily,
      settings: state.settings, selectedChapter: state.selectedChapter,
      quoteIndex: state.quoteIndex, skin: state.skin, railMin: state.railMin,
      view: state.view, toggles: state.toggles
    };
  }
  function saveNow() {
    const payload = savePayload();
    try { localStorage.setItem(STORE, JSON.stringify(payload)); }
    catch (e) {
      try {
        const light = Object.assign({}, payload);
        light.projects = light.projects.map(p => Object.assign({}, p, { cover: Object.assign({}, p.cover, { image: null }) }));
        localStorage.setItem(STORE, JSON.stringify(light));
      } catch (e2) { /* sem armazenamento */ }
    }
  }
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 220);
  }

  function project() {
    return state.projects.find(p => p.id === state.projectId) || state.projects[0];
  }

  function ensureCover(item) {
    if (!item.cover) item.cover = defaultCover(item);
    return item.cover;
  }

  function ensureChapters(item) {
    if (Array.isArray(state.chapters[item.id]) && state.chapters[item.id].length) return state.chapters[item.id];
    let chapters;
    if (item.id === 'estrela') {
      chapters = ESTRELA_CHAPTERS.map((chapter, index) => ({
        id: 'e' + (index + 1),
        title: chapter.title,
        content: chapter.html,
        words: countWords(htmlToText(chapter.html))
      }));
    } else {
      const total = Math.max(1, Math.min(item.chapters || 1, 6));
      const titles = ['Abertura', 'Primeiro movimento', 'Interlúdio', 'O que ficou', 'Último fio', 'Apêndice'];
      chapters = Array.from({ length: total }, (_, index) => ({
        id: 'c' + (index + 1),
        title: titles[index] || ('Capítulo ' + (index + 1)),
        content: '',
        words: 0
      }));
    }
    state.chapters[item.id] = chapters;
    return chapters;
  }

  /* ------------------------------------------------------------- render: projeto */
  function renderProject() {
    const item = project();
    const cover = ensureCover(item);

    $('#bv-top-project').textContent = item.title;
    $('#bv-project-title').textContent = item.title;
    $('#bv-project-author').textContent = item.author;
    $('#bv-project-subtitle').textContent = item.subtitle || 'manuscrito';
    $('#bv-stat-words').textContent = format(item.words);
    $('#bv-stat-chapters').textContent = format(item.chapters);
    $('#bv-stat-scenes').textContent = format(item.scenes || 0);
    $('#bv-stat-world').textContent = format(item.world || 0);
    $('#bv-date-open').textContent = item.opened || todayBR();
    $('#bv-date-modified').textContent = item.modified || todayBR();
    $('#bv-ms-project').textContent = item.title;
    $('#bv-quote').textContent = item.quote || '“Toda história começa com uma pergunta.”';

    // miniatura
    const mini = $('#bv-project-mini');
    if (mini) {
      mini.style.setProperty('--mini-a', cover.cloth);
      mini.style.setProperty('--mini-b', cover.spineColor || shade(cover.cloth, -40));
      mini.style.setProperty('--mini-foil', cover.foil);
      mini.style.setProperty('--mini-ink', cover.ink);
      const glyph = mini.querySelector('.bv-mini__glyph');
      if (glyph) glyph.innerHTML = '<i class="fa-solid ' + escapeHTML(cover.glyph) + '" aria-hidden="true"></i>';
      $('#bv-mini-title').textContent = (cover.title || item.title).toUpperCase();
      $('#bv-mini-author').textContent = (cover.over || item.author || '').toUpperCase();
    }

    // meta diária
    const dailyPct = Math.min(100, Math.round((state.daily.written / Math.max(1, state.daily.goal)) * 100));
    $('#bv-goal-label').textContent = dailyPct + '% meta';
    const goalDot = $('#bv-rail-goal .bv-dot');
    if (goalDot) goalDot.className = 'bv-dot ' + (item.goal ? 'bv-dot--gold' : 'bv-dot--plain');
    const railProject = $('#bv-rail .bv-rail__id b');
    if (railProject) railProject.textContent = 'K. R. Valetius';
    renderRail();
  }

  function renderRail() {
    $$('.bv-nav__item[data-view]').forEach(btn => {
      btn.classList.toggle('is-on', btn.dataset.view === state.view);
    });
    $$('.bv-toggle[data-toggle]').forEach(btn => {
      const key = btn.dataset.toggle;
      if (key === 'goal' || key === 'fullscreen') return;
      btn.classList.toggle('is-on', !!state.toggles[key]);
    });
    $('#bv-app').classList.toggle('is-rail-min', !!state.railMin);
    const collapse = $('#bv-rail-toggle');
    if (collapse) collapse.setAttribute('aria-expanded', String(!state.railMin));
    $('#bv-app').classList.toggle('is-compact', state.settings.density === 'compact');
  }

  /* ------------------------------------------------------------- render: livro */
  function renderBook() {
    const item = project();
    const cover = ensureCover(item);
    const book = $('#bv-book');
    if (!book) return;
    book.style.setProperty('--cv-cloth', cover.cloth);
    book.style.setProperty('--cv-cloth-2', cover.spineColor || shade(cover.cloth, -40));
    book.style.setProperty('--cv-foil', cover.foil);
    book.style.setProperty('--cv-ink', cover.ink);

    const coverEl = $('#bv-cover');
    if (coverEl) {
      coverEl.style.setProperty('--cv-img', cover.image ? 'url("' + cover.image + '")' : 'none');
      coverEl.classList.toggle('has-image', !!cover.image);
      coverEl.dataset.texture = cover.texture || 'linho';
    }

    $('#bv-cover-title').textContent = (cover.title || item.title).toUpperCase();
    $('#bv-cover-over').textContent = (cover.over || '').toUpperCase();
    $('#bv-cover-foot').textContent = (cover.foot || '').toUpperCase();
    $('#bv-cover-seal').innerHTML = '<i class="fa-solid ' + escapeHTML(cover.glyph || 'fa-star') + '" aria-hidden="true"></i>';
    $('#bv-spine-text').textContent = (cover.spineText || item.title).toUpperCase();
    $('#bv-spine-author').textContent = (cover.spineAuthor || '').toUpperCase();
    $('#bv-synopsis').textContent = cover.synopsis || '';
    $('#bv-backquote').textContent = cover.backQuote ? '“' + cover.backQuote.replace(/^“|”$/g, '') + '”' : '';
    $('#bv-isbn').textContent = cover.isbn || '';
    $('#bv-quote').textContent = item.quote || '';
  }

  /* ------------------------------------------------------------- render: painéis */
  function renderSummary() {
    const chapters = state.projects.reduce((sum, p) => sum + (Number(p.chapters) || 0), 0);
    const words = state.projects.reduce((sum, p) => sum + (Number(p.words) || 0), 0);
    const cells = [
      [state.projects.length, 'Projetos'],
      [chapters, 'Capítulos'],
      [words, 'Palavras'],
      [331, 'Mundo'],
      [169, 'Personagens'],
      [4, 'Mapas']
    ];
    $('#bv-summary').innerHTML = cells.map(([value, label]) =>
      '<div class="bv-summary__cell"><b>' + format(value) + '</b><span>' + escapeHTML(label) + '</span></div>'
    ).join('');
    $('#bv-progress-words').textContent = format(words);
  }

  function renderProgress() {
    const withGoal = state.projects.filter(p => p.goal);
    const overall = withGoal.length
      ? Math.round(withGoal.reduce((sum, p) => sum + (Number(p.progress) || 0), 0) / withGoal.length)
      : 0;
    $('#bv-progress-meta').textContent = withGoal.length + ' de ' + state.projects.length + ' com meta';
    $('#bv-progress-sub').textContent = withGoal.length + ' de ' + state.projects.length + ' livros com meta definida';
    const ring = $('#bv-ring-fill');
    if (ring) ring.style.strokeDashoffset = String(219.9 * (1 - overall / 100));
    $('#bv-ring-value').textContent = overall + '%';

    const bars = ['destinos', 'ecos', 'estrela', 'pilares']
      .map(id => state.projects.find(p => p.id === id))
      .filter(Boolean);
    $('#bv-bars').innerHTML = bars.map(item => {
      const target = item.goal ? item.goal.target : (item.chapters || 1);
      const pct = clamp(Number(item.progress) || 0, 0, 100);
      return `<li class="${item.id === state.projectId ? 'is-selected' : ''}">
        <span class="bv-bars__top"><b>${escapeHTML(item.title)}</b><span>${item.goal ? pct + '%' : 'sem meta'}</span></span>
        <span class="bv-bars__track"><i style="width:${item.goal ? pct : 0}%"></i></span>
      </li>`;
    }).join('');
  }

  function renderActivity() {
    $('#bv-activity').innerHTML = state.activity.slice(0, 4).map(item =>
      `<li>
        <span class="bv-activity__icon"><i class="fa-solid ${escapeHTML(item.icon || 'fa-feather')}" aria-hidden="true"></i></span>
        <span class="bv-activity__body"><b>${escapeHTML(item.text)}</b><span>${escapeHTML(item.meta || '')}</span></span>
        <span class="bv-activity__time">${escapeHTML(item.time || 'agora')}</span>
      </li>`
    ).join('');
  }

  function addActivity(icon, text, meta) {
    state.activity.unshift({ icon, text, meta: meta || ('agora · ' + project().author), time: 'agora' });
    state.activity = state.activity.slice(0, 8);
    renderActivity();
  }

  function miniMarkup(item) {
    const cover = ensureCover(item);
    return `<span class="bv-mini bv-card__mini" style="--mini-a:${cover.cloth};--mini-b:${cover.spineColor || shade(cover.cloth, -40)};--mini-foil:${cover.foil};--mini-ink:${cover.ink}">
      <span class="bv-mini__glyph"><i class="fa-solid ${escapeHTML(cover.glyph)}" aria-hidden="true"></i></span>
      <span class="bv-mini__title">${escapeHTML(item.title.toUpperCase())}</span>
      <span class="bv-mini__author">${escapeHTML((item.author || '').toUpperCase())}</span>
    </span>`;
  }

  function renderRecent() {
    const grid = $('#bv-recent-grid');
    if (!grid) return;
    const q = searchQuery.trim().toLowerCase();
    let list;
    if (q) {
      list = state.projects.filter(item => (item.title + ' ' + item.author).toLowerCase().includes(q)).slice(0, 8);
    } else {
      list = state.pinned.map(id => state.projects.find(p => p.id === id)).filter(Boolean);
    }

    if (!list.length) {
      grid.innerHTML = q
        ? '<p class="bv-empty-state">Nenhum projeto encontrado. Tente outro título ou autor.</p>'
        : '<p class="bv-empty-state">Nenhum projeto fixado. Abra “Abrir projeto” e fixe até quatro para vê-los aqui.</p>';
    } else {
      grid.innerHTML = list.map(item => {
        const selected = item.id === state.projectId;
        const meta = (Number(item.chapters) || 0) + ' cap. · ' + format(item.words) + ' p.';
        return `<button type="button" class="bv-card ${selected ? 'is-selected' : ''}" data-project-card="${item.id}" aria-label="Abrir ${escapeHTML(item.title)}">
          <span class="bv-card__cover">
            ${miniMarkup(item)}
            <span class="bv-card__pin ${state.pinned.includes(item.id) ? 'is-on' : ''}" data-pin-card="${item.id}" title="${state.pinned.includes(item.id) ? 'Desafixar' : 'Fixar'}"><i class="fa-solid fa-thumbtack" aria-hidden="true"></i></span>
          </span>
          <span class="bv-card__title">${escapeHTML(item.title)}</span>
          <span class="bv-card__meta"><span>${escapeHTML(meta)}</span><span>${item.progress || 0}%</span></span>
          <span class="bv-card__bar"><i style="width:${clamp(item.progress || 0, 0, 100)}%"></i></span>
        </button>`;
      }).join('');
    }

    const others = state.projects.length - state.pinned.length;
    const count = $('#bv-others-count');
    if (count) count.textContent = q ? list.length + ' achados' : '+ ' + Math.max(0, others);
    const allBtn = $('#bv-all-projects');
    if (allBtn) allBtn.setAttribute('aria-label', 'Ver todos os ' + state.projects.length + ' projetos');
  }

  function renderAll() {
    renderProject();
    renderBook();
    renderSummary();
    renderProgress();
    renderRecent();
    renderActivity();
    applyEditorSettings();
    save();
  }

  /* ------------------------------------------------------------- livro 3D */
  const bookRot = { rx: 7, ry: -24 };
  let spinId = null;
  let lastSpin = 0;
  let drag = null;

  function applyRotation() {
    const book = $('#bv-book');
    if (!book) return;
    book.style.setProperty('--rx', bookRot.rx + 'deg');
    book.style.setProperty('--ry', bookRot.ry + 'deg');
  }

  function setFace(face) {
    stopSpin();
    const map = {
      front: { rx: 7, ry: -24 },
      spine: { rx: 5, ry: 74 },
      back: { rx: 6, ry: 156 }
    };
    const rot = map[face] || map.front;
    bookRot.rx = rot.rx;
    bookRot.ry = rot.ry;
    applyRotation();
    $$('.bv-facebtn').forEach(btn => btn.classList.toggle('is-on', btn.dataset.face === face));
  }

  function stopSpin() {
    if (spinId) cancelAnimationFrame(spinId);
    spinId = null;
    lastSpin = 0;
    const book = $('#bv-book');
    if (book) book.classList.remove('is-spinning');
    const btn = $('#bv-spin');
    if (btn) btn.classList.remove('is-on');
  }

  function toggleSpin() {
    if (spinId) { stopSpin(); return; }
    const book = $('#bv-book');
    const btn = $('#bv-spin');
    if (!book) return;
    book.classList.add('is-spinning');
    if (btn) btn.classList.add('is-on');
    const tick = time => {
      if (!lastSpin) lastSpin = time;
      const delta = Math.min(48, time - lastSpin);
      lastSpin = time;
      bookRot.ry = (bookRot.ry + delta * 0.025) % 360;
      applyRotation();
      spinId = requestAnimationFrame(tick);
    };
    spinId = requestAnimationFrame(tick);
  }

  function bindBook() {
    const scene = $('#bv-scene');
    const book = $('#bv-book');
    if (!scene || !book) return;

    scene.addEventListener('pointerdown', event => {
      if (event.target.closest('button')) return;
      stopSpin();
      drag = { x: event.clientX, y: event.clientY, rx: bookRot.rx, ry: bookRot.ry };
      scene.classList.add('is-dragging');
      try { scene.setPointerCapture(event.pointerId); } catch (e) {}
    });
    scene.addEventListener('pointermove', event => {
      if (!drag) return;
      bookRot.ry = drag.ry + (event.clientX - drag.x) * 0.42;
      bookRot.rx = clamp(drag.rx - (event.clientY - drag.y) * 0.26, -32, 42);
      applyRotation();
    });
    const end = () => {
      drag = null;
      scene.classList.remove('is-dragging');
      const faces = { '-24': 'front', '74': 'spine', '156': 'back' };
      const key = String(Math.round(((bookRot.ry + 180) % 360 + 360) % 360 - 180));
      $$('.bv-facebtn').forEach(btn => btn.classList.remove('is-on'));
      const match = Object.keys(faces).find(k => Math.abs(Number(k) - Number(key)) < 12);
      if (match) $$('.bv-facebtn[data-face="' + faces[match] + '"]').forEach(btn => btn.classList.add('is-on'));
      save();
    };
    scene.addEventListener('pointerup', end);
    scene.addEventListener('pointercancel', end);
    scene.addEventListener('pointerleave', () => { if (drag) end(); });

    $$('.bv-facebtn').forEach(btn => btn.addEventListener('click', () => setFace(btn.dataset.face)));
    $('#bv-spin').addEventListener('click', toggleSpin);
    $('#bv-hardcover').addEventListener('click', () => {
      book.classList.toggle('is-hard');
      $('#bv-hardcover').classList.toggle('is-on', book.classList.contains('is-hard'));
      toast(book.classList.contains('is-hard') ? 'Capa dura: 74 px de lombada.' : 'Capa flexível: 50 px de lombada.');
    });
  }

  /* ------------------------------------------------------------- skins */
  function applySkin(id) {
    const found = SKINS.find(s => s.id === id) ? id : 'abissal';
    document.documentElement.setAttribute('data-bv-skin', found);
    document.body.setAttribute('data-bv-skin', found);
    state.skin = found;
    try { localStorage.setItem(SKIN_KEY, found); } catch (e) {}
    renderSkinUI();
    save();
  }

  function swapSkin(id, event) {
    if (id === state.skin) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches || !state.settings.motion;
    if (!document.startViewTransition || reduce) { applySkin(id); return; }
    const x = event && typeof event.clientX === 'number' ? event.clientX : window.innerWidth - 40;
    const y = event && typeof event.clientY === 'number' ? event.clientY : 40;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) + 50;
    try {
      const transition = document.startViewTransition(() => applySkin(id));
      transition.ready.then(() => {
        document.documentElement.animate(
          { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 720, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' }
        );
      }).catch(() => {});
    } catch (e) { applySkin(id); }
  }

  function renderSkinUI() {
    const pop = $('#bv-skinpop-grid');
    if (pop) {
      pop.innerHTML = SKINS.map(skin =>
        `<button type="button" class="bv-skinswatch ${state.skin === skin.id ? 'is-on' : ''}" data-skin="${skin.id}" aria-label="Skin ${skin.name}" aria-pressed="${state.skin === skin.id}">
          <span class="bv-swatch" style="--sw:${skin.sw};--sw2:${skin.sw2}"></span>
          <span>${skin.name}</span>
        </button>`
      ).join('');
    }
    const grid = $('#bv-skin-grid');
    if (grid) {
      grid.innerHTML = SKINS.map(skin =>
        `<button type="button" class="bv-skin-cell ${state.skin === skin.id ? 'is-on' : ''}" data-skin="${skin.id}" aria-pressed="${state.skin === skin.id}">
          <span class="bv-swatch" style="--sw:${skin.sw};--sw2:${skin.sw2}"></span>
          <span>${skin.name}</span>
        </button>`
      ).join('');
    }
    const btn = $('#bv-skins-btn');
    if (btn) btn.setAttribute('title', 'Trocar skin · ' + (SKINS.find(s => s.id === state.skin) || SKINS[0]).name);
  }

  function toggleSkinPop(show) {
    const pop = $('#bv-skinpop');
    if (!pop) return;
    pop.hidden = show === undefined ? !pop.hidden : !show;
  }

  /* ------------------------------------------------------------- editor de capa */
  function openCoverEditor(tab) {
    const item = project();
    ensureCover(item);
    fillCoverForm();
    setCoverTab(tab || 'front');
    $('#bv-coverdrawer').hidden = false;
    $('#bv-cover-scrim').hidden = false;
    setTimeout(() => $('#ce-title').focus(), 60);
  }

  function closeCoverEditor() {
    $('#bv-coverdrawer').hidden = true;
    $('#bv-cover-scrim').hidden = true;
    save();
  }

  function setCoverTab(tab) {
    $$('[data-covtab]').forEach(btn => {
      const on = btn.dataset.covtab === tab;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-selected', String(on));
    });
    $$('[data-covpanel]').forEach(panel => { panel.hidden = panel.dataset.covpanel !== tab; });
    if (tab === 'spine') setFace('spine');
    else if (tab === 'back') setFace('back');
    else setFace('front');
  }

  function fillCoverForm() {
    const cover = ensureCover(project());
    $('#ce-title').value = cover.title || '';
    $('#ce-over').value = cover.over || '';
    $('#ce-foot').value = cover.foot || '';
    $('#ce-cloth').value = /^#[0-9a-f]{6}$/i.test(cover.cloth) ? cover.cloth : '#16414e';
    $('#ce-foil').value = /^#[0-9a-f]{6}$/i.test(cover.foil) ? cover.foil : '#c9a86a';
    $('#ce-texture').value = cover.texture || 'linho';
    $('#ce-glyph').value = cover.glyph || 'fa-star';
    $('#ce-spine').value = cover.spineText || '';
    $('#ce-spine-author').value = cover.spineAuthor || '';
    $('#ce-spine-color').value = /^#[0-9a-f]{6}$/i.test(cover.spineColor) ? cover.spineColor : '#07171f';
    $('#ce-synopsis').value = cover.synopsis || '';
    $('#ce-backquote').value = cover.backQuote || '';
    $('#ce-isbn').value = cover.isbn || '';
  }

  function updateCover(field, value) {
    const cover = ensureCover(project());
    cover[field] = value;
    renderBook();
    if (['title', 'over', 'cloth', 'foil', 'glyph', 'spineColor', 'spineText', 'spineAuthor'].includes(field)) {
      const mini = $('#bv-project-mini');
      if (mini) {
        mini.style.setProperty('--mini-a', cover.cloth);
        mini.style.setProperty('--mini-b', cover.spineColor || shade(cover.cloth, -40));
        mini.style.setProperty('--mini-foil', cover.foil);
        mini.style.setProperty('--mini-ink', cover.ink);
      }
      $('#bv-mini-title').textContent = (cover.title || project().title).toUpperCase();
      $('#bv-mini-author').textContent = (cover.over || project().author || '').toUpperCase();
    }
    save();
  }

  function bindCoverEditor() {
    const map = {
      'ce-title': 'title', 'ce-over': 'over', 'ce-foot': 'foot',
      'ce-cloth': 'cloth', 'ce-foil': 'foil', 'ce-texture': 'texture',
      'ce-glyph': 'glyph', 'ce-spine': 'spineText', 'ce-spine-author': 'spineAuthor',
      'ce-spine-color': 'spineColor', 'ce-synopsis': 'synopsis',
      'ce-backquote': 'backQuote', 'ce-isbn': 'isbn'
    };
    Object.keys(map).forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => updateCover(map[id], el.value));
      el.addEventListener('change', () => updateCover(map[id], el.value));
    });

    $$('[data-covtab]').forEach(btn => btn.addEventListener('click', () => setCoverTab(btn.dataset.covtab)));
    $('#bv-change-cover').addEventListener('click', event => {
      event.stopPropagation();
      openCoverEditor('front');
    });
    $('#bv-cover-editor').addEventListener('click', () => openCoverEditor('front'));
    $('#bv-cover-close').addEventListener('click', closeCoverEditor);
    $('#ce-done').addEventListener('click', closeCoverEditor);
    $('#bv-cover-scrim').addEventListener('click', closeCoverEditor);

    $('#ce-image').addEventListener('change', async event => {
      const file = event.target.files && event.target.files[0];
      event.target.value = '';
      if (!file) return;
      try {
        const data = await shrinkImage(file);
        updateCover('image', data);
        toast('Arte aplicada à capa.', 'fa-image');
      } catch (e) {
        toast('Não foi possível ler essa imagem.', 'fa-triangle-exclamation');
      }
    });
    $('#ce-image-remove').addEventListener('click', () => {
      updateCover('image', null);
      toast('Arte removida; volta o tecido.', 'fa-eraser');
    });
    $('#ce-reset').addEventListener('click', () => {
      const item = project();
      item.cover = defaultCover(item);
      fillCoverForm();
      renderBook();
      renderProject();
      save();
      toast('Capa restaurada ao padrão do projeto.', 'fa-rotate-left');
    });
    $('#ce-export').addEventListener('click', exportCover);
  }

  function shrinkImage(file, max) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const limit = max || 900;
          const scale = Math.min(1, limit / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL('image/jpeg', 0.84));
        } catch (e) { URL.revokeObjectURL(url); reject(e); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagem inválida')); };
      img.src = url;
    });
  }

  async function exportCover() {
    const item = project();
    const cover = ensureCover(item);
    try { await document.fonts.ready; } catch (e) {}
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1800;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 1200, 1800);
    grad.addColorStop(0, cover.cloth);
    grad.addColorStop(0.55, shade(cover.cloth, -18));
    grad.addColorStop(1, cover.spineColor || shade(cover.cloth, -55));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 1800);

    // textura
    if (cover.texture === 'linho') {
      ctx.strokeStyle = 'rgba(255,255,255,.035)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 1200; x += 4) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1800); ctx.stroke(); }
      for (let y = 0; y < 1800; y += 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1200, y); ctx.stroke(); }
    } else if (cover.texture === 'couro') {
      for (let i = 0; i < 9000; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.02)' : 'rgba(0,0,0,.04)';
        ctx.fillRect(Math.random() * 1200, Math.random() * 1800, 2, 2);
      }
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,.03)';
      for (let y = 0; y < 1800; y += 3) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1200, y + 8); ctx.stroke(); }
    }

    if (cover.image) {
      try {
        const img = await loadImage(cover.image);
        const scale = Math.max(1200 / img.width, 1800 / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (1200 - w) / 2, (1800 - h) / 2, w, h);
        const veil = ctx.createLinearGradient(0, 0, 0, 1800);
        veil.addColorStop(0, 'rgba(3,10,9,.15)');
        veil.addColorStop(0.6, 'rgba(3,10,9,.42)');
        veil.addColorStop(1, 'rgba(3,10,9,.7)');
        ctx.fillStyle = veil;
        ctx.fillRect(0, 0, 1200, 1800);
      } catch (e) { /* segue sem arte */ }
    }

    // vinheta
    const vignette = ctx.createRadialGradient(600, 760, 180, 600, 900, 900);
    vignette.addColorStop(0, 'rgba(255,255,255,.05)');
    vignette.addColorStop(1, 'rgba(0,0,0,.45)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, 1200, 1800);

    // moldura
    ctx.strokeStyle = hexToRgba(cover.foil, 0.62);
    ctx.lineWidth = 3;
    ctx.strokeRect(62, 62, 1076, 1676);
    ctx.strokeStyle = hexToRgba(cover.foil, 0.2);
    ctx.lineWidth = 1;
    ctx.strokeRect(78, 78, 1044, 1644);

    ctx.textAlign = 'center';
    ctx.fillStyle = hexToRgba(cover.foil, 0.85);
    ctx.font = '600 24px Montserrat, sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '8px';
    ctx.fillText((cover.over || '').toUpperCase(), 600, 176);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

    const title = (cover.title || item.title).toUpperCase();
    ctx.font = '500 108px Cinzel, Georgia, serif';
    ctx.fillStyle = cover.ink;
    ctx.shadowColor = 'rgba(0,0,0,.5)';
    ctx.shadowBlur = 24;
    const lines = wrapLines(ctx, title, 880);
    const lineHeight = 122;
    const startY = 900 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, index) => ctx.fillText(line, 600, startY + index * lineHeight));
    ctx.shadowBlur = 0;

    const ruleY = startY + (lines.length - 1) * lineHeight + 70;
    const rule = ctx.createLinearGradient(440, 0, 760, 0);
    rule.addColorStop(0, hexToRgba(cover.foil, 0));
    rule.addColorStop(0.5, hexToRgba(cover.foil, 0.9));
    rule.addColorStop(1, hexToRgba(cover.foil, 0));
    ctx.fillStyle = rule;
    ctx.fillRect(440, ruleY, 320, 2);

    const sealY = ruleY + 130;
    ctx.beginPath();
    ctx.arc(600, sealY, 64, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(cover.foil, 0.7);
    ctx.lineWidth = 2;
    ctx.stroke();
    drawStar(ctx, 600, sealY, 34, 13, 8, hexToRgba(cover.foil, 0.9));

    ctx.fillStyle = hexToRgba(cover.ink, 0.6);
    ctx.font = '600 18px Montserrat, sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '10px';
    ctx.fillText((cover.foot || '').toUpperCase(), 600, 1696);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

    const link = document.createElement('a');
    link.download = 'capa-' + slug(item.title) + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast('Capa exportada em PNG (1200 × 1800).', 'fa-download');
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function wrapLines(ctx, text, maxWidth) {
    const words = text.split(/\s+/);
    const lines = [];
    let line = '';
    words.forEach(word => {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }

  function drawStar(ctx, cx, cy, outer, inner, points, color) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 ? inner : outer;
      const angle = (Math.PI / points) * i - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  /* ------------------------------------------------------------- modais */
  function openModal(options) {
    const wrap = document.createElement('div');
    wrap.className = 'lk-modal';
    wrap.innerHTML = `<div class="lk-modal__card ${options.wide ? 'is-wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="bv-modal-title">
      <header class="lk-modal__head">
        <div>
          ${options.kicker ? `<span class="bv-eyebrow">${escapeHTML(options.kicker)}</span>` : ''}
          <h2 id="bv-modal-title">${escapeHTML(options.title || '')}</h2>
          ${options.desc ? `<p>${escapeHTML(options.desc)}</p>` : ''}
        </div>
        <button type="button" class="lk-iconbtn lk-iconbtn--sm" data-close-modal aria-label="Fechar"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
      </header>
      <div class="lk-modal__body">${options.body || ''}</div>
      ${options.footNote ? `<p class="bv-modalnote" style="padding:0 24px 4px">${escapeHTML(options.footNote)}</p>` : ''}
      <footer class="lk-modal__foot">
        ${options.actions && options.actions.length ? options.actions.map((action, index) =>
          `<button type="button" class="lk-btn ${action.klass || ''}" data-modal-action="${index}">${escapeHTML(action.label)}</button>`
        ).join('') : ''}
      </footer>
    </div>`;
    $('#bv-modals').appendChild(wrap);

    wrap.addEventListener('click', event => { if (event.target === wrap) closeModal(wrap); });
    wrap.querySelector('[data-close-modal]').addEventListener('click', () => closeModal(wrap));
    (options.actions || []).forEach((action, index) => {
      const btn = wrap.querySelector('[data-modal-action="' + index + '"]');
      if (!btn) return;
      btn.addEventListener('click', () => {
        const keep = action.onClick ? action.onClick(wrap) : false;
        if (!keep) closeModal(wrap);
      });
    });
    const focusable = wrap.querySelector('input, textarea, select, button:not([data-close-modal])');
    setTimeout(() => { if (focusable) focusable.focus(); }, 80);
    return wrap;
  }

  function closeModal(wrap) {
    if (!wrap) return;
    wrap.remove();
    if (!$('#bv-modals').children.length) document.activeElement?.blur();
  }

  function closeTopModal() {
    const modals = $$('#bv-modals .lk-modal');
    if (modals.length) { closeModal(modals[modals.length - 1]); return true; }
    return false;
  }

  function openAllProjects(initialQuery) {
    const wrap = openModal({
      kicker: 'Biblioteca', title: 'Todos os projetos', wide: true,
      desc: 'Fixe até quatro projetos para mantê-los nos recentes.',
      footNote: 'No máximo 4 projetos fixados aparecem na faixa de recentes.',
      body: `<label class="bv-search" style="max-width:none;margin-bottom:10px">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input id="bv-modal-search" type="search" placeholder="Buscar por título ou autor..." autocomplete="off" spellcheck="false" value="${escapeHTML(initialQuery || '')}">
        </label>
        <div class="bv-plist" id="bv-plist"></div>`,
      actions: [{ label: 'Novo projeto', klass: '', onClick: () => { newProjectModal(); } }, { label: 'Fechar', klass: 'lk-btn--primary' }]
    });

    const list = wrap.querySelector('#bv-plist');
    const search = wrap.querySelector('#bv-modal-search');

    const draw = () => {
      const q = (search.value || '').trim().toLowerCase();
      const items = state.projects.filter(item => !q || (item.title + ' ' + item.author).toLowerCase().includes(q));
      list.innerHTML = items.map(item => {
        const pinned = state.pinned.includes(item.id);
        return `<div class="bv-prow ${item.id === state.projectId ? 'is-selected' : ''}" data-modal-project="${item.id}" role="button" tabindex="0">
          <span class="bv-prow__name">${escapeHTML(item.title)}</span>
          <span class="bv-prow__meta">${format(item.chapters)} cap. · ${format(item.words)} palavras</span>
          <button type="button" class="bv-prow__pin ${pinned ? 'is-on' : ''}" data-modal-pin="${item.id}" title="${pinned ? 'Desafixar' : 'Fixar'}" aria-label="${pinned ? 'Desafixar' : 'Fixar'} ${escapeHTML(item.title)}"><i class="fa-solid fa-thumbtack" aria-hidden="true"></i></button>
        </div>`;
      }).join('') || '<p class="bv-empty-state">Nada encontrado.</p>';
    };
    draw();

    search.addEventListener('input', draw);
    list.addEventListener('click', event => {
      const pin = event.target.closest('[data-modal-pin]');
      if (pin) {
        event.stopPropagation();
        togglePin(pin.dataset.modalPin);
        draw();
        renderRecent();
        return;
      }
      const row = event.target.closest('[data-modal-project]');
      if (row) {
        selectProject(row.dataset.modalProject);
        closeModal(wrap);
      }
    });
    list.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const row = event.target.closest('[data-modal-project]');
      if (!row) return;
      event.preventDefault();
      selectProject(row.dataset.modalProject);
      closeModal(wrap);
    });
  }

  function togglePin(id) {
    const index = state.pinned.indexOf(id);
    if (index !== -1) {
      state.pinned.splice(index, 1);
      renderRecent();
      save();
      return;
    }
    if (state.pinned.length >= 4) {
      toast('No máximo 4 projetos fixados. Desafixe um para trocar.', 'fa-circle-exclamation');
      return;
    }
    state.pinned.push(id);
    renderRecent();
    save();
  }

  function selectProject(id) {
    if (!state.projects.some(p => p.id === id)) return;
    if (state.view === 'manuscript') commitChapter();
    state.projectId = id;
    renderAll();
    if (state.view === 'manuscript') openManuscript();
    toast('Projeto “' + project().title + '” selecionado.', 'fa-book-open');
  }

  function newProjectModal() {
    openModal({
      kicker: 'Biblioteca', title: 'Novo projeto', desc: 'Cria uma pasta local no experimento. Nada é enviado para servidor.',
      body: `<label class="lk-field"><span class="lk-label">Nome do projeto</span><input class="lk-input" id="nv-name" placeholder="Meu romance sem título" maxlength="50"></label>
        <label class="lk-field"><span class="lk-label">Pasta de destino</span><input class="lk-input" id="nv-folder" value="~/Documents/Projetos Autor/" spellcheck="false"></label>
        <p class="bv-modalnote">Padrão: ~/Documents/Projetos Autor/ · este protótipo guarda tudo no navegador.</p>`,
      actions: [
        { label: 'Cancelar', klass: 'lk-btn--ghost' },
        {
          label: 'Criar projeto', klass: 'lk-btn--primary', onClick: wrap => {
            const name = (wrap.querySelector('#nv-name').value || '').trim() || 'Projeto sem nome';
            const id = 'p' + Date.now();
            const palette = [
              ['#1d3a44', '#08171d', '#9fe0d2', '#eef0e6', 'fa-feather'],
              ['#3b2438', '#140b14', '#e0b7d8', '#f4e8f2', 'fa-moon'],
              ['#3c2f1a', '#150f08', '#e8c98a', '#f6edda', 'fa-crown'],
              ['#1c2e45', '#070e17', '#a9c8ff', '#e8eef8', 'fa-globe']
            ][state.projects.length % 4];
            const created = {
              id, title: name, author: 'K. R. Valetius', genre: 'Novo projeto', subtitle: 'Novo projeto · rascunho',
              words: 0, chapters: 1, scenes: 0, world: 0, progress: 0,
              opened: todayBR(), modified: todayBR(), pal: palette, synopsis: '', quote: 'Toda história começa com uma pergunta.', goal: null,
              status: 'ativo'
            };
            created.cover = defaultCover(created);
            state.projects.push(created);
            state.chapters[id] = [{ id: 'c1', title: 'Abertura', content: '', words: 0 }];
            state.selectedChapter[id] = 'c1';
            if (state.pinned.length < 4) state.pinned.push(id);
            state.projectId = id;
            renderAll();
            if (state.view === 'manuscript') openManuscript();
            addActivity('fa-plus', 'Livro “' + name + '” criado');
            toast('Projeto “' + name + '” criado.', 'fa-sparkles');
          }
        }
      ]
    });
  }

  function renameModal() {
    const item = project();
    openModal({
      kicker: 'Projeto', title: 'Renomear projeto', desc: 'O novo nome aparece na biblioteca, na capa e na lombada.',
      body: `<label class="lk-field"><span class="lk-label">Título</span><input class="lk-input" id="rn-title" value="${escapeHTML(item.title)}" maxlength="60"></label>`,
      actions: [
        { label: 'Cancelar', klass: 'lk-btn--ghost' },
        {
          label: 'Salvar nome', klass: 'lk-btn--primary', onClick: wrap => {
            const value = (wrap.querySelector('#rn-title').value || '').trim();
            if (!value) { toast('O título não pode ficar vazio.'); return true; }
            const cover = ensureCover(item);
            if (cover.title === item.title) cover.title = value;
            if (cover.spineText === item.title.toUpperCase()) cover.spineText = value.toUpperCase();
            item.title = value;
            item.modified = todayBR();
            renderProject();
            renderBook();
            renderRecent();
            renderBarsSafe();
            addActivity('fa-signature', 'Projeto renomeado para “' + value + '”');
            save();
            toast('Projeto renomeado.', 'fa-check');
          }
        }
      ]
    });
  }

  function goalModal() {
    const item = project();
    const goal = item.goal || { measure: 'Capítulos', target: item.chapters || 10 };
    openModal({
      kicker: 'Meta', title: 'Meta deste livro',
      desc: 'É o que o anel de progresso da Biblioteca mede. A porcentagem acompanha o livro crescendo. Deixe 0 para remover a meta.',
      body: `<label class="lk-field"><span class="lk-label">Medir por</span>
          <select class="lk-select" id="goal-measure">
            <option ${goal.measure === 'Capítulos' ? 'selected' : ''}>Capítulos</option>
            <option ${goal.measure === 'Palavras' ? 'selected' : ''}>Palavras</option>
            <option ${goal.measure === 'Cenas' ? 'selected' : ''}>Cenas</option>
          </select></label>
        <label class="lk-field"><span class="lk-label">Alvo</span><input class="lk-input" id="goal-target" type="number" min="0" max="1000000" value="${Number(goal.target) || 0}"></label>`,
      actions: [
        { label: 'Cancelar', klass: 'lk-btn--ghost' },
        {
          label: 'Salvar meta', klass: 'lk-btn--primary', onClick: wrap => {
            const target = Number(wrap.querySelector('#goal-target').value) || 0;
            const measure = wrap.querySelector('#goal-measure').value;
            item.goal = target > 0 ? { measure, target } : null;
            item.modified = todayBR();
            renderProgress();
            renderProject();
            renderBarsSafe();
            addActivity('fa-bullseye', item.goal ? 'Meta de ' + target + ' ' + measure.toLowerCase() + ' definida' : 'Meta removida de “' + item.title + '”');
            save();
            toast(item.goal ? 'Meta salva.' : 'Meta removida.', 'fa-bullseye');
          }
        }
      ]
    });
  }

  function quoteModal() {
    const item = project();
    openModal({
      kicker: 'Projeto', title: 'Frase do livro', desc: 'A frase aparece sob o livro e na contracapa.',
      body: `<label class="lk-field"><span class="lk-label">Frase</span><textarea class="lk-textarea" id="quote-text" maxlength="160">${escapeHTML(item.quote || '')}</textarea></label>`,
      actions: [
        { label: 'Cancelar', klass: 'lk-btn--ghost' },
        {
          label: 'Salvar frase', klass: 'lk-btn--primary', onClick: wrap => {
            const value = (wrap.querySelector('#quote-text').value || '').trim();
            item.quote = value;
            const cover = ensureCover(item);
            cover.backQuote = value;
            renderBook();
            renderProject();
            save();
            toast('Frase atualizada.', 'fa-quote-left');
          }
        }
      ]
    });
  }

  function deleteModal() {
    const item = project();
    if (state.projects.length <= 1) { toast('O experimento precisa de ao menos um projeto.'); return; }
    openModal({
      kicker: 'Cuidado', title: 'Excluir projeto', desc: 'Esta ação remove o projeto e os capítulos locais desta biblioteca experimental.',
      body: `<p class="bv-modalnote">Você está prestes a excluir <b>${escapeHTML(item.title)}</b>, com ${format(item.chapters)} capítulos e ${format(item.words)} palavras.</p>`,
      actions: [
        { label: 'Cancelar', klass: 'lk-btn--ghost' },
        {
          label: 'Excluir', klass: 'lk-btn--danger', onClick: () => {
            state.projects = state.projects.filter(p => p.id !== item.id);
            state.pinned = state.pinned.filter(id => id !== item.id);
            delete state.chapters[item.id];
            delete state.selectedChapter[item.id];
            state.projectId = state.projects[0].id;
            renderAll();
            if (state.view === 'manuscript') showView('library');
            toast('Projeto removido do experimento.', 'fa-trash-can');
          }
        }
      ]
    });
  }

  function backupProject() {
    const item = project();
    ensureChapters(item);
    const payload = {
      app: 'Ctônia · Biblioteca Viva (experimento)',
      exportedAt: new Date().toISOString(),
      project: item,
      chapters: state.chapters[item.id] || []
    };
    download('biblioteca-viva-' + slug(item.title) + '.json', JSON.stringify(payload, null, 2));
    toast('Backup do projeto gerado.', 'fa-box-archive');
  }

  function exportLibrary() {
    const payload = {
      app: 'Ctônia · Biblioteca Viva (experimento)',
      exportedAt: new Date().toISOString(),
      state
    };
    download('biblioteca-viva-completa.json', JSON.stringify(payload, null, 2));
    toast('Biblioteca exportada.', 'fa-download');
  }

  function resetExperiment() {
    openModal({
      kicker: 'Zona de risco', title: 'Restaurar o experimento', desc: 'Apaga alterações locais, capas e capítulos desta biblioteca experimental.',
      body: '<p class="bv-modalnote">A ação não pode ser desfeita. A biblioteca real do Ctônia não é afetada.</p>',
      actions: [
        { label: 'Cancelar', klass: 'lk-btn--ghost' },
        {
          label: 'Restaurar', klass: 'lk-btn--danger', onClick: () => {
            suppressBeforeUnloadSave = true;
            clearTimeout(commitTimer);
            clearTimeout(saveTimer);
            try { localStorage.removeItem(STORE); localStorage.removeItem(SKIN_KEY); } catch (e) {}
            try { window.location.replace(new URL('index.html', document.baseURI).href); }
            catch (e) { location.reload(); }
          }
        }
      ]
    });
  }

  function renderBarsSafe() { renderProgress(); }

  /* ------------------------------------------------------------- manuscrito */
  let saveDebounce = null;
  let currentChapterWords = 0;

  function showView(view) {
    if (view === 'manuscript') {
      if (state.view === 'manuscript') return;
      state.view = 'manuscript';
      $('#bv-view-library').hidden = true;
      $('#bv-view-manuscript').hidden = false;
      document.body.classList.add('is-manuscript');
      openManuscript();
    } else {
      if (state.view === 'manuscript') commitChapter();
      state.view = 'library';
      $('#bv-view-manuscript').hidden = true;
      $('#bv-view-library').hidden = false;
      document.body.classList.remove('is-manuscript');
      clearReviewHighlights();
      renderAll();
    }
    renderRail();
    save();
  }

  function openManuscript() {
    const item = project();
    const chapters = ensureChapters(item);
    $('#bv-ms-project').textContent = item.title;
    renderChapterList();
    const wanted = state.selectedChapter[item.id] || chapters[chapters.length - 1].id;
    selectChapter(chapters.some(c => c.id === wanted) ? wanted : chapters[0].id);
    updateMsStats();
    clearReview();
    setSaveState('saved');
  }

  function renderChapterList() {
    const item = project();
    const chapters = ensureChapters(item);
    const list = $('#bv-chapter-list');
    list.innerHTML = chapters.map((chapter, index) => {
      const active = chapter.id === state.selectedChapter[item.id];
      return `<li><button type="button" class="bv-chapter ${active ? 'is-on' : ''}" data-chapter="${chapter.id}">
        <span class="bv-chapter__n">${String(index + 1).padStart(2, '0')}</span>
        <span class="bv-chapter__title">${escapeHTML(chapter.title)}</span>
        <span class="bv-chapter__w">${format(chapter.words)}</span>
      </button></li>`;
    }).join('');
    const total = Number(item.chapters) || chapters.length;
    $('#bv-chapters-total').textContent = chapters.length + (total > chapters.length ? ' de ' + total : '') + ' capítulos';
    $('#bv-chapters-words').textContent = format(item.words) + ' palavras';
    const totalWords = chapters.reduce((sum, c) => sum + (c.words || 0), 0);
    $('#bv-chapters-words').title = format(totalWords) + ' palavras nos capítulos carregados';
  }

  function selectChapter(id) {
    const item = project();
    const chapters = ensureChapters(item);
    const chapter = chapters.find(c => c.id === id) || chapters[0];
    if (!chapter) return;
    if (state.selectedChapter[item.id] && state.selectedChapter[item.id] !== chapter.id) commitChapter();
    state.selectedChapter[item.id] = chapter.id;
    $('#bv-chapter-title').value = chapter.title;
    const editor = $('#bv-editor');
    editor.innerHTML = chapter.content || '';
    currentChapterWords = chapter.words || countWords(editor.innerText);
    chapter.words = currentChapterWords;
    renderChapterList();
    $('#bv-page').scrollTop = 0;
    updateMsStats();
    clearReview();
    renderChapterStats();
    save();
  }

  function persistChapter() {
    const item = project();
    const chapters = ensureChapters(item);
    const chapter = chapters.find(c => c.id === state.selectedChapter[item.id]);
    if (!chapter) return;
    chapter.title = ($('#bv-chapter-title').value || 'Sem título').trim() || 'Sem título';
    chapter.content = $('#bv-editor').innerHTML;
    renderChapterList();
    saveNow();
    setSaveState('saved');
  }

  let commitTimer = null;
  function commitChapter() {
    clearTimeout(commitTimer);
    persistChapter();
  }

  function scheduleCommit() {
    setSaveState('dirty');
    clearTimeout(commitTimer);
    commitTimer = setTimeout(() => { persistChapter(); renderProject(); renderProgress(); renderRecent(); }, 850);
  }

  function setSaveState(mode) {
    const el = $('#bv-save-state');
    if (!el) return;
    if (mode === 'dirty') {
      el.classList.add('is-dirty');
      el.innerHTML = '<i class="fa-solid fa-circle-half-stroke" aria-hidden="true"></i> salvando…';
    } else {
      el.classList.remove('is-dirty');
      el.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i> salvo ' + nowLabel();
    }
  }

  function updateMsStats() {
    const editor = $('#bv-editor');
    const text = editor.innerText || '';
    const words = countWords(text);
    const paragraphs = Array.from(editor.children).filter(el => el.textContent.trim()).length || (text.trim() ? 1 : 0);
    const pages = Math.max(1, Math.ceil(words / 300));
    const minutes = Math.ceil(words / 200);
    $('#bv-ms-words').textContent = format(words);
    $('#bv-ms-paras').textContent = format(paragraphs);
    $('#bv-ms-pages').textContent = pages;
    $('#bv-ms-reading').textContent = minutes + ' min';
    $('#bv-ms-pagecount').textContent = '1 / ' + pages;
    const dailyPct = Math.min(100, Math.round((state.daily.written / Math.max(1, state.daily.goal)) * 100));
    $('#bv-ms-daily').textContent = dailyPct + '%';
    $('#bv-goal-label').textContent = dailyPct + '% meta';
    return words;
  }

  function onEditorInput() {
    const editor = $('#bv-editor');
    const item = project();
    const chapter = ensureChapters(item).find(c => c.id === state.selectedChapter[item.id]);
    if (!chapter) return;
    const words = countWords(editor.innerText || '');
    const delta = words - (chapter.words || 0);
    chapter.words = words;
    if (delta) {
      item.words = Math.max(0, (item.words || 0) + delta);
      if (delta > 0) state.daily.written += delta;
      item.modified = todayBR();
      $('#bv-stat-words').textContent = format(item.words);
      $('#bv-chapters-words').textContent = format(item.words) + ' palavras';
    }
    updateMsStats();
    renderChapterStats();
    scheduleCommit();
    if (delta) { renderRecent(); renderSummary(); renderProgress(); }
  }

  function renderChapterStats() {
    const item = project();
    const chapter = ensureChapters(item).find(c => c.id === state.selectedChapter[item.id]);
    if (!chapter) return;
    const text = $('#bv-editor').innerText || '';
    const words = countWords(text);
    const chars = text.length;
    const paragraphs = Array.from($('#bv-editor').children).filter(el => el.textContent.trim()).length;
    const minutes = Math.ceil(words / 200);
    const rows = [
      ['Palavras', format(words)],
      ['Caracteres', format(chars)],
      ['Parágrafos', format(paragraphs)],
      ['Leitura', minutes + ' min'],
      ['Capítulo', chapter.title],
      ['Meta do livro', item.goal ? item.goal.target + ' ' + item.goal.measure.toLowerCase() : 'sem meta']
    ];
    $('#bv-chapterstats').innerHTML = rows.map(([label, value]) =>
      `<div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>`
    ).join('');
  }

  function addChapter() {
    commitChapter();
    const item = project();
    const chapters = ensureChapters(item);
    const chapter = { id: 'c' + Date.now(), title: 'Capítulo ' + (chapters.length + 1), content: '', words: 0 };
    chapters.push(chapter);
    item.chapters = (Number(item.chapters) || 0) + 1;
    item.modified = todayBR();
    state.selectedChapter[item.id] = chapter.id;
    renderChapterList();
    selectChapter(chapter.id);
    addActivity('fa-plus', 'Capítulo “' + chapter.title + '” criado');
    save();
    setTimeout(() => $('#bv-editor').focus(), 60);
    toast('Capítulo criado. A página espera.', 'fa-feather');
  }

  function exportChapter() {
    const item = project();
    const chapter = ensureChapters(item).find(c => c.id === state.selectedChapter[item.id]);
    if (!chapter) return;
    const editor = $('#bv-editor');
    const text = (chapter.title || 'Capítulo') + '\n\n' + (editor.innerText || '');
    download(slug(item.title + '-' + chapter.title) + '.txt', text, 'text/plain;charset=utf-8');
    toast('Capítulo exportado em .txt.', 'fa-file-arrow-down');
  }

  /* ------------------------------------------------------------- revisão local */
  function editorBlocks() {
    const editor = $('#bv-editor');
    const blocks = Array.from(editor.children).filter(el => el.textContent.trim());
    if (blocks.length) return blocks;
    return editor.textContent.trim() ? [editor] : [];
  }

  function rangeFor(block, start, end) {
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    let pos = 0;
    let startNode = null, startOffset = 0, endNode = null, endOffset = 0;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const len = node.nodeValue.length;
      if (startNode === null && start >= pos && start <= pos + len) {
        startNode = node;
        startOffset = start - pos;
      }
      if (startNode !== null && end >= pos && end <= pos + len) {
        endNode = node;
        endOffset = end - pos;
        break;
      }
      pos += len;
    }
    if (!startNode || !endNode) return null;
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    return range;
  }

  function runReview() {
    if (!window.Ortografia) { toast('O motor de ortografia não carregou.', 'fa-triangle-exclamation'); return; }
    setReviewTab('review');
    const blocks = editorBlocks();
    reviewIssues = [];
    blocks.forEach(block => {
      const text = block.textContent;
      window.Ortografia.analisar(text, { regras: state.settings.rules }).forEach(issue => {
        reviewIssues.push(Object.assign({}, issue, { block }));
      });
    });
    renderReview();
    highlightReview();
    if (!blocks.length) toast('A página está vazia — escreva algo primeiro.', 'fa-feather');
    else toast(reviewIssues.length ? reviewIssues.length + ' achados neste capítulo.' : 'Nenhum ponto encontrado nas regras ativas.', reviewIssues.length ? 'fa-wand-magic-sparkles' : 'fa-check');
  }

  function renderReview() {
    const summary = $('#bv-review-summary');
    const list = $('#bv-review-issues');
    const empty = $('#bv-review-empty');
    const apply = $('#bv-apply-safe');
    const ignore = $('#bv-ignore-all');

    if (!reviewIssues.length) {
      summary.hidden = true;
      summary.innerHTML = '';
      list.innerHTML = '';
      empty.hidden = false;
      empty.textContent = 'Nenhuma revisão ativa. O botão acima lê o capítulo inteiro.';
      apply.hidden = true;
      ignore.hidden = true;
      return;
    }

    const counts = {};
    reviewIssues.forEach(issue => { counts[issue.tipo] = (counts[issue.tipo] || 0) + 1; });
    summary.hidden = false;
    summary.innerHTML = Object.keys(counts).map(tipo => {
      const meta = (window.Ortografia.TIPOS && window.Ortografia.TIPOS[tipo]) || { label: tipo };
      return `<span>${escapeHTML(meta.label)} <b>${counts[tipo]}</b></span>`;
    }).join('');

    empty.hidden = true;
    list.innerHTML = reviewIssues.map((issue, index) => {
      const meta = (window.Ortografia.TIPOS && window.Ortografia.TIPOS[issue.tipo]) || { label: issue.tipo };
      const snippet = issue.block.textContent.slice(Math.max(0, issue.start - 14), issue.end + 14);
      const fix = issue.sugestao != null ? `<button type="button" class="bv-issue__fix" data-review-fix="${index}">corrigir</button>` : '';
      const diff = issue.sugestao != null
        ? `<div class="bv-issue__diff"><del>${escapeHTML(visual(issue.block.textContent.slice(issue.start, issue.end)))}</del> → <ins>${escapeHTML(visual(issue.sugestao))}</ins></div>`
        : `<div class="bv-issue__diff"><ins>${escapeHTML(visual(snippet))}</ins></div>`;
      return `<li class="bv-issue" data-tipo="${issue.tipo}" data-review-index="${index}" tabindex="0">
        <div class="bv-issue__top"><span class="bv-issue__tipo">${escapeHTML(meta.label)}</span>${fix}</div>
        <p class="bv-issue__msg">${escapeHTML(issue.mensagem)}</p>
        ${diff}
      </li>`;
    }).join('');
    apply.hidden = !reviewIssues.some(issue => issue.seguro && issue.sugestao != null);
    ignore.hidden = false;
  }

  function visual(value) {
    return String(value || '').replace(/ /g, '·').replace(/\n/g, '↵');
  }

  function highlightReview() {
    if (!(window.CSS && CSS.highlights && window.Highlight)) return;
    try {
      const ranges = reviewIssues.map(issue => rangeFor(issue.block, issue.start, issue.end)).filter(Boolean);
      if (ranges.length) CSS.highlights.set('bv-revisao', new Highlight(...ranges));
      else CSS.highlights.delete('bv-revisao');
    } catch (e) {}
  }

  function clearReviewHighlights() {
    if (!(window.CSS && CSS.highlights)) return;
    try { CSS.highlights.delete('bv-revisao'); CSS.highlights.delete('bv-revisao-ativa'); } catch (e) {}
  }

  function clearReview() {
    reviewIssues = [];
    clearReviewHighlights();
    renderReview();
  }

  function selectReviewIssue(index) {
    const issue = reviewIssues[index];
    if (!issue) return;
    const range = rangeFor(issue.block, issue.start, issue.end);
    if (!range) return;
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    const rect = range.getBoundingClientRect();
    const page = $('#bv-page');
    if (rect && (rect.top < 80 || rect.bottom > window.innerHeight - 80)) {
      page.scrollTop += rect.top - 180;
    }
    $$('.bv-issue').forEach(el => el.classList.toggle('is-active', el.dataset.reviewIndex === String(index)));
    if (window.CSS && CSS.highlights && window.Highlight) {
      try { CSS.highlights.set('bv-revisao-ativa', new Highlight(range)); } catch (e) {}
    }
  }

  function fixReviewIssue(index) {
    const issue = reviewIssues[index];
    if (!issue || issue.sugestao == null) return;
    const range = rangeFor(issue.block, issue.start, issue.end);
    if (!range) return;
    range.deleteContents();
    range.insertNode(document.createTextNode(issue.sugestao));
    issue.block.normalize();
    onEditorInput();
    persistChapter();
    runReview();
    toast('Correção aplicada.', 'fa-check');
  }

  function applyAllSafe() {
    const blocks = editorBlocks();
    let count = 0;
    blocks.forEach(block => {
      const text = block.textContent;
      const issues = window.Ortografia.analisar(text, { regras: state.settings.rules })
        .filter(issue => issue.seguro && issue.sugestao != null);
      if (!issues.length) return;
      const fixed = window.Ortografia.aplicar(text, issues);
      if (fixed !== text) {
        block.textContent = fixed;
        count += issues.length;
      }
    });
    if (!count) { toast('Nada seguro para aplicar.'); return; }
    onEditorInput();
    persistChapter();
    runReview();
    toast(count + ' correções seguras aplicadas.', 'fa-check-double');
  }

  function bindManuscript() {
    $('#bv-ms-back').addEventListener('click', () => showView('library'));
    $('#bv-continue').addEventListener('click', () => showView('manuscript'));
    $('#bv-edit').addEventListener('click', () => showView('manuscript'));
    $('#bv-add-chapter').addEventListener('click', addChapter);
    $('#bv-ms-export').addEventListener('click', exportChapter);
    $('#bv-ms-goal').addEventListener('click', goalModal);
    $('#bv-ms-review').addEventListener('click', runReview);
    $('#bv-ms-review').addEventListener('click', () => setReviewTab('review'));
    $('#bv-run-review').addEventListener('click', runReview);
    $('#bv-apply-safe').addEventListener('click', applyAllSafe);
    $('#bv-ignore-all').addEventListener('click', () => { clearReview(); toast('Achados ignorados nesta revisão.', 'fa-eye-slash'); });

    $('#bv-editor').addEventListener('input', onEditorInput);
    $('#bv-chapter-title').addEventListener('input', () => {
      const item = project();
      const chapter = ensureChapters(item).find(c => c.id === state.selectedChapter[item.id]);
      if (chapter) chapter.title = $('#bv-chapter-title').value || 'Sem título';
      renderChapterList();
      renderChapterStats();
      scheduleCommit();
    });

    $('#bv-chapter-list').addEventListener('click', event => {
      const btn = event.target.closest('[data-chapter]');
      if (btn) selectChapter(btn.dataset.chapter);
    });

    $$('#bv-review-issues').forEach(() => {});
    $('#bv-review-issues').addEventListener('click', event => {
      const fix = event.target.closest('[data-review-fix]');
      if (fix) { fixReviewIssue(Number(fix.dataset.reviewFix)); return; }
      const row = event.target.closest('[data-review-index]');
      if (row) selectReviewIssue(Number(row.dataset.reviewIndex));
    });
    $('#bv-review-issues').addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const row = event.target.closest('[data-review-index]');
      if (!row) return;
      event.preventDefault();
      selectReviewIssue(Number(row.dataset.reviewIndex));
    });

    $$('.bv-review__tabs button').forEach(btn => btn.addEventListener('click', () => setReviewTab(btn.dataset.panel)));

    $$('.bv-fmt [data-cmd]').forEach(btn => {
      btn.addEventListener('mousedown', event => event.preventDefault());
      btn.addEventListener('click', () => {
        document.execCommand(btn.dataset.cmd, false, null);
        $('#bv-editor').focus();
        onEditorInput();
        updateFormatState();
      });
    });
    $$('.bv-fmt [data-block]').forEach(btn => {
      btn.addEventListener('mousedown', event => event.preventDefault());
      btn.addEventListener('click', () => {
        document.execCommand('formatBlock', false, btn.dataset.block === 'blockquote' ? 'blockquote' : 'h2');
        $('#bv-editor').focus();
        onEditorInput();
      });
    });
    $('#bv-editor').addEventListener('keyup', updateFormatState);
    $('#bv-editor').addEventListener('mouseup', updateFormatState);

    $('#bv-save-state').addEventListener('click', () => { commitChapter(); toast('Capítulo salvo neste navegador.', 'fa-check'); });
  }

  function setReviewTab(tab) {
    $$('.bv-review__tabs button').forEach(btn => {
      const on = btn.dataset.panel === tab;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-selected', String(on));
    });
    $('#bv-review-panel').hidden = tab !== 'review';
    $('#bv-stats-panel').hidden = tab !== 'stats';
    if (tab === 'stats') renderChapterStats();
  }

  function updateFormatState() {
    $$('.bv-fmt [data-cmd]').forEach(btn => {
      const cmd = btn.dataset.cmd;
      if (['bold', 'italic', 'underline', 'insertUnorderedList', 'justifyLeft', 'justifyCenter'].includes(cmd)) {
        try { btn.classList.toggle('is-on', document.queryCommandState(cmd)); } catch (e) {}
      }
    });
  }

  /* ------------------------------------------------------------- ajustes */
  function openSettings(tab) {
    $('#bv-settings').hidden = false;
    $('#bv-settings-scrim').hidden = false;
    setSettingsTab(tab || 'aparencia');
    syncSettingsControls();
    const core = $('#bv-compass-core');
    if (core) core.setAttribute('aria-expanded', 'true');
  }

  function closeSettings() {
    $('#bv-settings').hidden = true;
    $('#bv-settings-scrim').hidden = true;
    const core = $('#bv-compass-core');
    if (core) core.setAttribute('aria-expanded', 'false');
  }

  function setSettingsTab(tab) {
    $$('.bv-settings__tabs button').forEach(btn => {
      const on = btn.dataset.tab === tab;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-selected', String(on));
    });
    $$('.bv-settings__panel').forEach(panel => { panel.hidden = panel.dataset.panel !== tab; });
  }

  function syncSettingsControls() {
    $('#bv-motion').checked = !!state.settings.motion;
    $('#bv-native-spell').checked = !!state.settings.spellcheck;
    $('#bv-font').value = state.settings.editor.font;
    $('#bv-size').value = state.settings.editor.size;
    $('#bv-line').value = state.settings.editor.line;
    $('#bv-size-value').textContent = state.settings.editor.size + ' px';
    $('#bv-line-value').textContent = Number(state.settings.editor.line).toFixed(1);
    $$('#bv-rules input[data-rule]').forEach(input => { input.checked = state.settings.rules[input.dataset.rule] !== false; });
    $$('#bv-density button').forEach(btn => btn.classList.toggle('is-on', btn.dataset.density === state.settings.density));
    renderSkinUI();
  }

  function applyEditorSettings() {
    document.body.style.setProperty('--bv-editor-font', state.settings.editor.font === 'Montserrat' ? "'Montserrat', sans-serif" : state.settings.editor.font === 'Cinzel' ? "'Cinzel', serif" : "'Lora', serif");
    document.body.style.setProperty('--bv-editor-size', state.settings.editor.size + 'px');
    document.body.style.setProperty('--bv-editor-line', String(state.settings.editor.line));
    document.body.classList.toggle('no-motion', !state.settings.motion);
    const editor = $('#bv-editor');
    if (editor) editor.setAttribute('spellcheck', String(!!state.settings.spellcheck));
    $('#bv-app').classList.toggle('is-compact', state.settings.density === 'compact');
  }

  function bindSettings() {
    $('#bv-compass-core').addEventListener('click', () => openSettings('aparencia'));
    $$('.bv-settings__tabs button').forEach(btn => btn.addEventListener('click', () => setSettingsTab(btn.dataset.tab)));
    $('#bv-settings-close').addEventListener('click', closeSettings);
    $('#bv-settings-done').addEventListener('click', closeSettings);
    $('#bv-settings-scrim').addEventListener('click', closeSettings);

    $('#bv-motion').addEventListener('change', event => {
      state.settings.motion = event.target.checked;
      applyEditorSettings();
      save();
    });
    $('#bv-native-spell').addEventListener('change', event => {
      state.settings.spellcheck = event.target.checked;
      applyEditorSettings();
      save();
    });
    $('#bv-font').addEventListener('change', event => {
      state.settings.editor.font = event.target.value;
      applyEditorSettings();
      save();
    });
    $('#bv-size').addEventListener('input', event => {
      state.settings.editor.size = Number(event.target.value);
      $('#bv-size-value').textContent = event.target.value + ' px';
      applyEditorSettings();
      save();
    });
    $('#bv-line').addEventListener('input', event => {
      state.settings.editor.line = Number(event.target.value);
      $('#bv-line-value').textContent = Number(event.target.value).toFixed(1);
      applyEditorSettings();
      save();
    });
    $$('#bv-density button').forEach(btn => btn.addEventListener('click', () => {
      state.settings.density = btn.dataset.density;
      $$('#bv-density button').forEach(item => item.classList.toggle('is-on', item === btn));
      applyEditorSettings();
      save();
    }));
    $('#bv-rules').addEventListener('change', event => {
      const input = event.target.closest('input[data-rule]');
      if (!input) return;
      state.settings.rules[input.dataset.rule] = input.checked;
      save();
    });
    $('#bv-export-all').addEventListener('click', exportLibrary);
    $('#bv-reset').addEventListener('click', resetExperiment);
  }

  function labClose() {
    try {
      if (window.parent && window.parent !== window && typeof window.parent.labCloseExperiment === 'function') {
        window.parent.labCloseExperiment();
        return;
      }
    } catch (e) {}
    try { window.top.location.href = new URL('../../index.html', document.baseURI).href; } catch (e) { history.back(); }
  }

  /* ------------------------------------------------------------- eventos gerais */
  function bindGlobal() {
    $('#bv-lab-back').addEventListener('click', () => {
      if (state.view === 'manuscript') commitChapter();
      labClose();
    });
    $('#bv-project-cover').addEventListener('click', () => openCoverEditor('front'));
    $('#bv-backup-project').addEventListener('click', backupProject);
    $('#bv-rename').addEventListener('click', renameModal);
    $('#bv-goal').addEventListener('click', goalModal);
    $('#bv-quote-edit').addEventListener('click', quoteModal);
    $('#bv-delete').addEventListener('click', deleteModal);
    $('#bv-open-project').addEventListener('click', () => openAllProjects(''));
    $('#bv-new-project').addEventListener('click', newProjectModal);
    $('#bv-all-projects').addEventListener('click', () => openAllProjects(''));

    $('#bv-rail-toggle').addEventListener('click', () => {
      state.railMin = !state.railMin;
      renderRail();
      save();
    });

    $$('.bv-nav__item[data-view]').forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.view)));
    $$('[data-toggle]').forEach(btn => btn.addEventListener('click', () => {
      const key = btn.dataset.toggle;
      if (key === 'fullscreen') { toggleFullscreen(); return; }
      if (key === 'goal') { goalModal(); return; }
      if (key === 'arca') { backupProject(); return; }
      state.toggles[key] = !state.toggles[key];
      btn.classList.toggle('is-on', !!state.toggles[key]);
      save();
      toast(key === 'salvo' ? (state.toggles.salvo ? 'Salvamento automático ativo.' : 'Salvamento automático pausado.') : 'Estado atualizado.');
    }));

    $$('.bv-iconbtn[data-soon], .bv-nav__item[data-soon]').forEach(btn => btn.addEventListener('click', () => {
      toast('“' + btn.dataset.soon + '” chega em uma próxima versão do experimento.', 'fa-flask');
    }));

    $('#bv-fullscreen').addEventListener('click', toggleFullscreen);
    $('#bv-skins-btn').addEventListener('click', event => { event.stopPropagation(); toggleSkinPop(); });
    $('#bv-skinpop-close').addEventListener('click', () => toggleSkinPop(false));
    $('#bv-skinpop').addEventListener('click', event => { if (event.target === $('#bv-skinpop')) toggleSkinPop(false); });

    const search = $('#bv-search');
    search.addEventListener('input', () => { searchQuery = search.value; renderRecent(); });
    search.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); openAllProjects(search.value); }
    });

    $('#bv-new-quote').addEventListener('click', () => {
      state.quoteIndex = (state.quoteIndex + 1) % DAILY_QUOTES.length;
      renderDailyQuote();
      save();
    });

    // delegação: skins, ajustes, abas, futuro
    document.addEventListener('click', event => {
      const settingsBtn = event.target.closest('[data-settings]');
      if (settingsBtn) {
        event.preventDefault();
        openSettings(settingsBtn.dataset.settings);
        return;
      }
      const skinBtn = event.target.closest('[data-skin]');
      if (skinBtn) {
        swapSkin(skinBtn.dataset.skin, event);
        toggleSkinPop(false);
        return;
      }
      const future = event.target.closest('[data-soon]');
      if (future && !future.closest('.bv-nav__item') && !future.classList.contains('bv-iconbtn')) {
        toast('“' + future.dataset.soon + '” chega em uma próxima versão do experimento.', 'fa-flask');
        return;
      }
      if (!event.target.closest('#bv-skinpop') && !event.target.closest('#bv-skins-btn')) toggleSkinPop(false);
    });

    // recentes
    $('#bv-recent-grid').addEventListener('click', event => {
      const pin = event.target.closest('[data-pin-card]');
      if (pin) { event.stopPropagation(); togglePin(pin.dataset.pinCard); return; }
      const card = event.target.closest('[data-project-card]');
      if (card) selectProject(card.dataset.projectCard);
    });
    $('#bv-recent-grid').addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const card = event.target.closest('[data-project-card]');
      if (!card) return;
      event.preventDefault();
      selectProject(card.dataset.projectCard);
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        if (closeTopModal()) return;
        if (!$('#bv-coverdrawer').hidden) { closeCoverEditor(); return; }
        if (!$('#bv-settings').hidden) { closeSettings(); return; }
        if (!$('#bv-skinpop').hidden) { toggleSkinPop(false); return; }
        const active = document.activeElement;
        if (active && (active.id === 'bv-search' || active.id === 'bv-editor' || active.id === 'bv-chapter-title')) {
          active.blur();
          return;
        }
        if (state.view === 'manuscript') { commitChapter(); showView('library'); return; }
        labClose();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        commitChapter();
        toast('Salvo neste navegador.', 'fa-check');
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && state.view === 'manuscript') {
        event.preventDefault();
        runReview();
      }
    });

    window.addEventListener('beforeunload', () => {
      if (suppressBeforeUnloadSave) return;
      try { persistChapter(); } catch (e) {}
    });
  }

  function toggleFullscreen() {
    const doc = document;
    if (!doc.fullscreenElement) {
      (doc.documentElement.requestFullscreen ? doc.documentElement.requestFullscreen() : Promise.reject())
        .catch(() => toast('O navegador não liberou a tela cheia aqui.', 'fa-expand'));
    } else {
      doc.exitFullscreen && doc.exitFullscreen().catch(() => {});
    }
  }

  function renderDailyQuote() {
    const quote = DAILY_QUOTES[state.quoteIndex % DAILY_QUOTES.length];
    $('#bv-daily-quote').textContent = '“' + quote.text + '”';
    $('#bv-daily-author').textContent = '— ' + quote.author;
  }

  /* ------------------------------------------------------------- início */
  function init() {
    load();
    const reopenManuscript = state.view === 'manuscript';
    state.view = 'library';

    // tema do experimento é próprio: garante a skin salva
    let savedSkin = null;
    try { savedSkin = localStorage.getItem(SKIN_KEY); } catch (e) {}
    const skin = savedSkin && SKINS.some(s => s.id === savedSkin) ? savedSkin : (state.skin || 'abissal');
    state.skin = skin;
    document.documentElement.setAttribute('data-bv-skin', skin);
    document.body.setAttribute('data-bv-skin', skin);

    // datas de "hoje" em projetos criados hoje
    if (state.daily.date !== localDay()) state.daily = { goal: state.daily.goal || 1000, written: 0, date: localDay() };

    ensureChapters(project());
    renderAll();
    renderDailyQuote();
    renderSkinUI();
    applyEditorSettings();
    syncSettingsControls();
    bindBook();
    bindCoverEditor();
    bindManuscript();
    bindSettings();
    bindGlobal();

    // posição inicial do livro
    applyRotation();
    setFace('front');

    // se a view salva era manuscrito, reabre
    if (reopenManuscript) {
      setTimeout(() => showView('manuscript'), 120);
    }

    // atalho para depuração
    window.BV = { state, renderAll, showView, openCoverEditor, runReview };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
