function voltarAoPortal(event){
  if(event) event.preventDefault();
  const portal=document.getElementById('portal-view');
  const hub=document.getElementById('hub-view');
  const workspace=document.getElementById('workspace-view');
  const modal=document.getElementById('global-modal');
  if(portal) portal.classList.remove('hidden');
  if(hub){hub.classList.add('hidden');hub.classList.remove('flex');}
  if(workspace) workspace.classList.add('hidden');
  if(modal) modal.classList.add('hidden');
  window.scrollTo({top:0,behavior:'smooth'});
  atualizarBotaoVoltar();
  return false;
}
function atualizarBotaoVoltar(){
  const back=document.getElementById('ctonia-portal-back');
  const hub=document.getElementById('hub-view');
  const workspace=document.getElementById('workspace-view');
  if(!back) return;
  const hubAtivo=hub && !hub.classList.contains('hidden');
  const workspaceAtivo=workspace && !workspace.classList.contains('hidden');
  // O botão aparece somente na tela do Hub, nunca dentro de uma ferramenta.
  back.classList.toggle('visible',!!hubAtivo && !workspaceAtivo);
}
document.addEventListener('DOMContentLoaded', atualizarBotaoVoltar);
const observerVoltar=new MutationObserver(atualizarBotaoVoltar);
observerVoltar.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
