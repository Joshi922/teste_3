/* ===== PWA: instalação, tela cheia e atalhos ===== */
(function(){
  // Service worker (só funciona em https ou localhost)
  if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost')){
    window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(e){console.warn('SW',e)})});
  }
  // Cor da barra do sistema acompanha o tema
  var meta=document.querySelector('meta[name="theme-color"]');
  function syncThemeColor(){if(meta)meta.setAttribute('content',document.documentElement.classList.contains('light')?'#F0EAD8':'#1B132B')}
  new MutationObserver(syncThemeColor).observe(document.documentElement,{attributes:true,attributeFilter:['class']});syncThemeColor();
  // Tela cheia: esconde a barra do navegador (Android/PC). Não existe no iPhone.
  var root=document.documentElement,btn=document.getElementById('fs-toggle');
  var standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  var canFs=!!(root.requestFullscreen||root.webkitRequestFullscreen);
  var inst=document.getElementById('install-btn'),deferred=null,portal=document.getElementById('portal-view');
  function onPortal(){return portal&&!portal.classList.contains('hidden')}
  function syncPortalButtons(){
    var on=onPortal();
    if(btn)btn.style.display=(on&&canFs&&!standalone)?'flex':'none';
    if(inst)inst.style.display=(on&&deferred&&!standalone)?'flex':'none';
  }
  if(portal)new MutationObserver(syncPortalButtons).observe(portal,{attributes:true,attributeFilter:['class']});
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferred=e;syncPortalButtons()});
  window.addEventListener('appinstalled',function(){deferred=null;syncPortalButtons()});
  window.installCtonia=function(){if(!deferred)return;deferred.prompt();deferred.userChoice.finally(function(){deferred=null;syncPortalButtons()})};
  syncPortalButtons();
  window.toggleFullscreenCtonia=function(){
    var fs=document.fullscreenElement||document.webkitFullscreenElement;
    if(fs){(document.exitFullscreen||document.webkitExitFullscreen).call(document)}
    else{var p=(root.requestFullscreen||root.webkitRequestFullscreen).call(root,{navigationUI:'hide'});if(p&&p.catch)p.catch(function(){})}
  };
  // Atalhos do ícone (Biblioteca / Forja / Gerenciar)
  window.addEventListener('load',function(){
    var o=new URLSearchParams(location.search).get('open');
    try{
      if(o==='library')openCtoniaLibrary();
      else if(o==='forja')enterPdfHub();
      else if(o==='manager')openCtoniaManager();
    }catch(e){}
    if(o&&history.replaceState)history.replaceState(null,'',location.pathname);
  });
})();
