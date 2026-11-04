(function(){
 function setup(){
  const drawer=document.getElementById('ct-google-drawer');
  const backdrop=document.getElementById('ct-google-drawer-backdrop');
  const panel=document.getElementById('ct-google-calendar-panel');
  const content=document.getElementById('ct-google-drawer-content');
  if(panel&&content&&panel.parentElement!==content)content.appendChild(panel);
  function open(){drawer?.classList.add('open');backdrop?.classList.remove('hidden');drawer?.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';}
  function close(){drawer?.classList.remove('open');backdrop?.classList.add('hidden');drawer?.setAttribute('aria-hidden','true');document.body.style.overflow='';}
  document.getElementById('ct-google-drawer-open')?.addEventListener('click',open);
  document.getElementById('ct-google-drawer-close')?.addEventListener('click',close);
  backdrop?.addEventListener('click',close);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
