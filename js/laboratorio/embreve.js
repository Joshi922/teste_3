/* Laboratório · sala em preparação — preenche o módulo com o desenho do experimento. */
(function () {
  'use strict';

  const data = window.LAB_SOON || null;

  const $ = sel => document.querySelector(sel);

  function labBack() {
    try {
      if (window.parent && window.parent !== window && typeof window.parent.labCloseExperiment === 'function') {
        window.parent.labCloseExperiment();
        return;
      }
    } catch (e) {}
    try { window.top.location.href = new URL('../../index.html', document.baseURI).href; } catch (e) { history.back(); }
  }
  window.labBack = labBack;

  function openFrom(id) {
    try {
      if (window.parent && typeof window.parent.labOpenExperiment === 'function') {
        window.parent.labOpenExperiment(id);
        return;
      }
    } catch (e) {}
    toast('Volte ao laboratório para abrir a sala.');
  }

  function toast(message) {
    const el = $('#lab-toast');
    if (!el) return;
    el.querySelector('span').textContent = message;
    el.classList.add('is-on');
    setTimeout(() => el.classList.remove('is-on'), 2800);
  }

  function render() {
    if (!data) {
      $('#soon-title').textContent = 'Sala em preparação';
      $('#soon-desc').textContent = 'Este espaço ainda não recebeu um desenho. Abra o laboratório e escolha uma sala em desenvolvimento.';
      $('#soon-features').innerHTML = '<li><i class="fa-solid fa-minus"></i> Nada desenhado por aqui ainda.</li>';
      $('#soon-roadmap').innerHTML = '<li data-state="next"><span class="soon-roadmap__phase">Fase 01</span><span class="soon-roadmap__title">Definir o experimento</span></li>';
      return;
    }

    document.title = data.title + ' — Laboratório Ctônia';
    $('#soon-crumb').textContent = data.title;
    $('#soon-title').textContent = data.title;
    $('#soon-desc').textContent = data.description || '';
    if (data.kicker) $('#soon-kicker').textContent = data.kicker;

    const features = $('#soon-features');
    features.innerHTML = (data.features || []).map(item =>
      `<li><i class="fa-solid fa-check" aria-hidden="true"></i><span>${escapeHTML(item)}</span></li>`
    ).join('');

    const roadmap = $('#soon-roadmap');
    roadmap.innerHTML = (data.roadmap || []).map(step => {
      const state = ['done', 'doing', 'next'].includes(step.state) ? step.state : 'next';
      return `<li data-state="${state}"><span class="soon-roadmap__phase">${escapeHTML(step.phase || '')}</span><span class="soon-roadmap__title">${escapeHTML(step.title || '')}</span></li>`;
    }).join('');

    if (data.from) {
      const btn = $('#soon-from');
      btn.hidden = false;
      const label = data.from === 'corretor-local' ? 'Abrir o Corretor Local' : 'Abrir a Biblioteca Viva';
      btn.querySelector('span').textContent = label;
      btn.addEventListener('click', () => openFrom(data.from));
    }

    if (data.id) $('#soon-path').textContent = 'destino previsto · modules/laboratorio/experimentos/' + data.id + '/';
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); labBack(); }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
