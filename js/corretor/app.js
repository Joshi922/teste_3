/* Laboratório · Corretor Local — usa o motor Ortografia (sem IA). */
(function () {
  'use strict';

  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  const SAMPLE = `Quero que entenda, hoje, a afirmação de sua coroa depende de nosso sucesso. Mas, se trabalharmos nosso poder, poderá não retomar, mas afirmar que é teu porque és, dente todas as Cindars, a mair.

 As palavras de Leyrian martelavam a cabeça da jovem princesa. Embora exausta das aulas com a feiticeira, não perdia a fé em seu poder, o esforço da jovem era heroico . Ele gostou muito do que havia feito, e tambem disse que voce nao deveria temer, porque a magia que ela carregava era antiga e o mundo ainda não sabia o nome dela, e mesmo assim todos os reinos temiam a menina que caminhava entre as estrelas e falava com os mortos sem pedir licença a ninguem.

— O que que voce está fazendo aqui? Um teste de execução!!!`;

  const DEFAULT_RULES = { acento: true, repeticao: true, espaco: true, pontuacao: true, maiuscula: true, frase: true };
  const STORE = 'ct-lab-corretor-v1';

  const state = {
    issues: [],
    filter: 'all',
    ignored: new Set(),
    analyzed: false,
    custom: [],
    rules: Object.assign({}, DEFAULT_RULES)
  };

  const textarea = $('#cor-text');

  function load() {
    try {
      const raw = localStorage.getItem(STORE);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved && typeof saved === 'object') {
        if (Array.isArray(saved.custom)) state.custom = saved.custom.filter(w => typeof w === 'string').slice(0, 80);
        if (saved.rules) Object.assign(state.rules, saved.rules);
        if (typeof saved.text === 'string' && saved.text.trim()) textarea.value = saved.text;
      }
    } catch (e) { /* sem armazenamento */ }
  }

  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({
        text: textarea.value,
        custom: state.custom,
        rules: state.rules
      }));
    } catch (e) { /* cota cheia */ }
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function toast(message, icon) {
    const el = $('#cor-toast');
    if (!el) return;
    el.querySelector('span').textContent = message;
    el.querySelector('i').className = 'fa-solid ' + (icon || 'fa-circle-info');
    el.classList.add('is-on');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('is-on'), 3000);
  }

  function countWords(text) {
    return (text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || []).length;
  }

  function issueKey(issue) {
    return issue.start + ':' + issue.end + ':' + issue.tipo;
  }

  function visibleIssues() {
    return state.issues.filter(issue => {
      if (state.ignored.has(issueKey(issue))) return false;
      if (state.filter !== 'all' && issue.tipo !== state.filter) return false;
      return true;
    });
  }

  function safeIssues() {
    return state.issues.filter(issue => !state.ignored.has(issueKey(issue)) && issue.seguro && issue.sugestao != null);
  }

  function snippet(text, issue) {
    const ini = Math.max(0, issue.start - 34);
    const fim = Math.min(text.length, issue.end + 34);
    return {
      before: (ini > 0 ? '…' : '') + text.slice(ini, issue.start),
      match: text.slice(issue.start, issue.end),
      after: text.slice(issue.end, fim) + (fim < text.length ? '…' : '')
    };
  }

  function renderChips() {
    const chips = $('#cor-chips');
    const resumo = window.Ortografia.resumo(state.issues.filter(i => !state.ignored.has(issueKey(i))));
    const types = Object.keys(window.Ortografia.TIPOS);
    const active = types.filter(t => resumo[t]);
    if (!active.length) {
      chips.innerHTML = '';
      return;
    }
    chips.innerHTML = active.map(tipo => {
      const meta = window.Ortografia.TIPOS[tipo];
      const on = state.filter === tipo;
      return `<button type="button" class="cor-chip ${on ? 'is-on' : ''}" data-tipo="${tipo}" style="${on ? 'border-color:var(--lk-gold)' : ''}" aria-pressed="${on}">
        <i class="${meta.icon}" aria-hidden="true"></i>
        <span>${escapeHTML(meta.label)}</span>
        <b>${resumo[tipo]}</b>
      </button>`;
    }).join('');
  }

  function visual(value) {
    return String(value)
      .replace(/ /g, '·')
      .replace(/\t/g, '⇥')
      .replace(/\n/g, '↵');
  }

  function renderIssues() {
    const list = $('#cor-issues');
    const empty = $('#cor-empty');
    const text = textarea.value;
    const visible = visibleIssues();

    $('#cor-issuecount').innerHTML = state.analyzed
      ? `${visible.length}<small> ${visible.length === 1 ? 'achado' : 'achados'}</small>`
      : '—';

    if (!state.analyzed) {
      empty.hidden = false;
      empty.textContent = 'Rode a revisão para ver o que o corretor encontrou. Nenhum texto sai daqui.';
      list.innerHTML = '';
      return;
    }

    if (!visible.length) {
      list.innerHTML = '';
      empty.hidden = false;
      empty.textContent = state.issues.length
        ? 'Tudo que sobrou está escondido pelo filtro ou foi ignorado. Volte a “Todos” para ver.'
        : 'Nenhum ponto encontrado nas regras ativas. O texto pode seguir — ou desligue uma regra e teste de novo.';
      return;
    }

    empty.hidden = true;
    list.innerHTML = visible.map((issue, index) => {
      const meta = window.Ortografia.TIPOS[issue.tipo] || { label: issue.tipo, icon: 'fa-solid fa-circle' };
      const part = snippet(text, issue);
      const diff = issue.sugestao != null
        ? `<span><del>${escapeHTML(visual(part.match))}</del> <em>→</em> <ins>${escapeHTML(visual(issue.sugestao))}</ins></span>`
        : `<span><em>${escapeHTML(visual(part.match))}</em></span>`;
      const fix = issue.sugestao != null
        ? `<button type="button" class="cor-issue__fix" data-fix="${index}">corrigir</button>`
        : '';
      return `<li class="cor-issue" data-tipo="${issue.tipo}" data-index="${index}" tabindex="0">
        <div class="cor-issue__top">
          <span class="cor-issue__tipo"><i class="${meta.icon}" aria-hidden="true"></i>${escapeHTML(meta.label)}</span>
          <span class="cor-issue__tools">${fix}<button type="button" class="cor-issue__ignore" data-ignore="${index}">ignorar</button></span>
        </div>
        <p class="cor-issue__msg">${escapeHTML(issue.mensagem)}</p>
        <div class="cor-issue__diff">${diff}</div>
      </li>`;
    }).join('');
  }

  function renderStats() {
    $('#cor-wordcount').textContent = countWords(textarea.value).toLocaleString('pt-BR');
    $('#cor-dictcount').textContent = state.custom.length;
    const safe = safeIssues().length;
    $('#cor-apply').disabled = !safe;
    $('#cor-applyall').disabled = !safe;
    $('#cor-resetignore').hidden = state.ignored.size === 0;
  }

  function renderDictionary() {
    const box = $('#cor-dict-words');
    if (!state.custom.length) {
      box.innerHTML = '<span class="cor-dict__empty">Nenhuma palavra adicionada ainda.</span>';
      return;
    }
    box.innerHTML = state.custom.map(word =>
      `<span class="cor-word">${escapeHTML(word)}<button type="button" data-remove="${escapeHTML(word)}" aria-label="Remover ${escapeHTML(word)}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></span>`
    ).join('');
  }

  function render() {
    renderChips();
    renderIssues();
    renderStats();
    renderDictionary();
  }

  function analyze() {
    if (!window.Ortografia) {
      toast('O motor de ortografia não foi carregado.', 'fa-triangle-exclamation');
      return;
    }
    state.issues = window.Ortografia.analisar(textarea.value, {
      regras: state.rules,
      ignorar: state.custom
    });
    state.ignored = new Set();
    state.filter = 'all';
    state.analyzed = true;
    save();
    render();
  }

  function applyAll() {
    const seguro = safeIssues();
    if (!seguro.length) return;
    const before = textarea.value;
    const after = window.Ortografia.aplicar(before, seguro);
    if (after === before) { toast('Nada para aplicar.'); return; }
    textarea.value = after;
    analyze();
    toast(`${seguro.length} ${seguro.length === 1 ? 'correção aplicada' : 'correções aplicadas'}.`, 'fa-check');
  }

  function applyOne(index) {
    const visible = visibleIssues();
    const issue = visible[index];
    if (!issue || issue.sugestao == null) return;
    const value = textarea.value;
    textarea.value = value.slice(0, issue.start) + issue.sugestao + value.slice(issue.end);
    const caret = issue.start + issue.sugestao.length;
    analyze();
    textarea.focus();
    textarea.setSelectionRange(caret, caret);
    toast('Correção aplicada.', 'fa-check');
  }

  function focusIssue(index) {
    const visible = visibleIssues();
    const issue = visible[index];
    if (!issue) return;
    textarea.focus();
    textarea.setSelectionRange(issue.start, issue.end);
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 24;
    const lines = textarea.value.slice(0, issue.start).split('\n').length;
    textarea.scrollTop = Math.max(0, (lines - 3) * lineHeight);
    $$('.cor-issue').forEach(el => el.classList.toggle('is-active', el.dataset.index === String(index)));
  }

  function selectIssue(index) {
    const issue = visibleIssues()[index];
    if (!issue) return;
    textarea.focus();
    textarea.setSelectionRange(issue.start, issue.end);
  }

  /* ------------------------------------------------------------- eventos */
  function bind() {
    $('#cor-run').addEventListener('click', analyze);
    $('#cor-apply').addEventListener('click', applyAll);
    $('#cor-applyall').addEventListener('click', applyAll);

    textarea.addEventListener('input', () => {
      state.analyzed = false;
      state.filter = 'all';
      save();
      render();
    });

    textarea.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        analyze();
      }
    });

    $('#cor-sample').addEventListener('click', () => {
      textarea.value = SAMPLE;
      state.analyzed = false;
      save();
      render();
      analyze();
      toast('Exemplo carregado — repare nos achados.', 'fa-flask');
    });

    $('#cor-clear').addEventListener('click', () => {
      textarea.value = '';
      state.issues = [];
      state.ignored = new Set();
      state.analyzed = false;
      state.filter = 'all';
      save();
      render();
      textarea.focus();
    });

    $('#cor-copy').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(textarea.value);
        toast('Texto copiado.', 'fa-copy');
      } catch (e) {
        toast('O navegador não liberou a área de transferência.', 'fa-triangle-exclamation');
      }
    });

    $('#cor-chips').addEventListener('click', event => {
      const chip = event.target.closest('.cor-chip');
      if (!chip) return;
      state.filter = state.filter === chip.dataset.tipo ? 'all' : chip.dataset.tipo;
      render();
    });

    $('#cor-issues').addEventListener('click', event => {
      const ignore = event.target.closest('[data-ignore]');
      if (ignore) {
        const issue = visibleIssues()[Number(ignore.dataset.ignore)];
        if (issue) {
          state.ignored.add(issueKey(issue));
          render();
          toast('Achado ignorado nesta revisão.', 'fa-eye-slash');
        }
        return;
      }
      const fix = event.target.closest('[data-fix]');
      if (fix) {
        applyOne(Number(fix.dataset.fix));
        return;
      }
      const row = event.target.closest('.cor-issue');
      if (row) focusIssue(Number(row.dataset.index));
    });

    $('#cor-issues').addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const row = event.target.closest('.cor-issue');
      if (!row) return;
      event.preventDefault();
      focusIssue(Number(row.dataset.index));
    });

    // Ignorar um achado: clique no tipo (pequeno atalho escondido) — usamos botão dedicado via teclado?
    // O botão "Ignorar" aparece no menu de contexto do item.
    $('#cor-issues').addEventListener('contextmenu', event => {
      const row = event.target.closest('.cor-issue');
      if (!row) return;
      event.preventDefault();
      const issue = visibleIssues()[Number(row.dataset.index)];
      if (!issue) return;
      state.ignored.add(issueKey(issue));
      render();
      toast('Achado ignorado nesta revisão.', 'fa-eye-slash');
    });

    $('#cor-resetignore').addEventListener('click', () => {
      state.ignored = new Set();
      render();
    });

    $('#cor-rules').addEventListener('change', event => {
      const input = event.target.closest('input[data-rule]');
      if (!input) return;
      state.rules[input.dataset.rule] = input.checked;
      save();
      if (state.analyzed) analyze();
    });

    $('#cor-dict-form').addEventListener('submit', event => {
      event.preventDefault();
      const input = $('#cor-dict-input');
      const word = input.value.trim();
      if (!word) return;
      if (state.custom.some(w => w.toLowerCase() === word.toLowerCase())) {
        toast('Essa palavra já está no dicionário.');
        return;
      }
      state.custom.push(word);
      input.value = '';
      save();
      if (state.analyzed) analyze();
      else render();
      toast('“' + word + '” agora é aceita.', 'fa-book');
    });

    $('#cor-dict-words').addEventListener('click', event => {
      const button = event.target.closest('[data-remove]');
      if (!button) return;
      const word = button.dataset.remove;
      state.custom = state.custom.filter(w => w !== word);
      save();
      if (state.analyzed) analyze();
      else render();
    });

    function labBack() {
      try {
        if (window.parent && window.parent !== window && typeof window.parent.labCloseExperiment === 'function') {
          window.parent.labCloseExperiment();
          return;
        }
      } catch (e) {}
      try { window.top.location.href = new URL('../../index.html', document.baseURI).href; } catch (e) { history.back(); }
    }
    $('#cor-back').addEventListener('click', labBack);
    $('#cor-back2').addEventListener('click', labBack);

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        if (document.activeElement === textarea) { textarea.blur(); return; }
        labBack();
      }
    });
  }

  function init() {
    load();
    // espelha as regras salvas nos interruptores
    $$('#cor-rules input[data-rule]').forEach(input => {
      input.checked = state.rules[input.dataset.rule] !== false;
    });
    if (!textarea.value.trim()) textarea.value = SAMPLE;
    bind();
    renderStats();
    renderDictionary();
    render();
    // primeira análise sem susto: só roda se o texto já veio do exemplo
    if (textarea.value === SAMPLE) analyze();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
