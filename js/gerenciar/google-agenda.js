/* Integração Ctônia ↔ Google Agenda.
   OAuth é feito no navegador com Google Identity Services; nenhum segredo é armazenado no HTML. */
(function(){
  'use strict';
  const CFG_KEY='ct_gcal_config_v1';
  const TRACK_KEY='ct_gcal_synced_event_ids_v1';
  const SCOPE='https://www.googleapis.com/auth/calendar.events';
  let accessToken=null, tokenClient=null, busy=false, syncTimer=null, lastPayloadSignature='';
  const $=id=>document.getElementById(id);
  function config(){try{return JSON.parse(localStorage.getItem(CFG_KEY)||'{}')}catch(_){return {}}}
  function saveConfig(c){try{localStorage.setItem(CFG_KEY,JSON.stringify(c))}catch(_){} }
  function status(msg,error){const e=$('ct-gcal-status');if(e){e.textContent=msg;e.style.color=error?'#ff9ca8':''}}
  function tracked(){try{return JSON.parse(localStorage.getItem(TRACK_KEY)||'[]')}catch(_){return []}}
  function saveTracked(v){try{localStorage.setItem(TRACK_KEY,JSON.stringify([...new Set(v)]))}catch(_){}}
  function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
  function done(s){const v=norm(s);return v.includes('conclu')||v==='pago'||v==='cancelado'||v==='arquivado'}
  function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(String(v||'')) && !Number.isNaN(Date.parse(v+'T12:00:00'))}
  function nextDate(v){const d=new Date(v+'T12:00:00');d.setDate(d.getDate()+1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
  function hashId(v){let h=2166136261;for(let i=0;i<v.length;i++){h^=v.charCodeAt(i);h=Math.imul(h,16777619)}return 'ctonia'+(h>>>0).toString(16).padStart(8,'0')}
  function makeEvent(id,title,date,description){
    return {id:hashId(id),summary:String(title||'Tarefa').slice(0,250),description:String(description||'').slice(0,8000),start:{date},end:{date:nextDate(date)},reminders:{useDefault:false,overrides:[{method:'popup',minutes:1440},{method:'popup',minutes:60}]},extendedProperties:{private:{ctoniaSourceId:id,ctoniaManaged:'true'}}};
  }
  function buildEvents(){
    const c=config(), out=[];
    if(c.includeTasks!==false){
      (Array.isArray(window.tarefasItems)?window.tarefasItems:[]).forEach(t=>{
        if(!t||done(t.status))return;
        const title=t.title||'Tarefa sem título';
        const details=['Origem: Ctônia Hub — Tarefas',t.module?'Frente: '+t.module:'',t.status?'Status: '+t.status:'',t.responsavel?'Responsável: '+t.responsavel:'',t.terceiro?'Terceiro/órgão: '+t.terceiro:'',t.desc?'Detalhes: '+t.desc:'',t.nextAction?'Próxima ação: '+t.nextAction:'',t.checklist&&t.checklist.length?'Checklist: '+t.checklist.map(x=>(x.done?'[x] ':'[ ] ')+x.text).join('\n'):''].filter(Boolean).join('\n');
        if(validDate(t.date))out.push(makeEvent('task:'+t.id+':deadline','Prazo: '+title,t.date,details));
        if(validDate(t.followup))out.push(makeEvent('task:'+t.id+':followup','Acompanhar: '+title,t.followup,details+'\nData de acompanhamento da tarefa.'));
      });
    }
    if(c.includeFinance!==false){
      (Array.isArray(window.contabilItems)?window.contabilItems:[]).forEach(t=>{
        if(!t||done(t.status))return;
        const title=t.title||t.descricao||t.description||'Lançamento financeiro';
        const details=['Origem: Ctônia Hub — Tesouraria',t.status?'Status: '+t.status:'',t.nu?'NU: '+t.nu:'',t.emissor?'Emissor: '+t.emissor:'',t.valorDoc?'Valor: R$ '+t.valorDoc:'',t.descricao?'Descrição: '+t.descricao:'',t.top?'TOP: '+t.top:''].filter(Boolean).join('\n');
        const due=t.vencimentoBoleto||t.vencimento||t.dataVencimento;
        if(validDate(due))out.push(makeEvent('finance:'+t.id+':due','Vencimento: '+title,due,details));
        if(validDate(t.dataPagamento)&&t.dataPagamento!==due)out.push(makeEvent('finance:'+t.id+':payment','Pagamento previsto: '+title,t.dataPagamento,details));
      });
    }
    const byId=new Map();out.forEach(e=>byId.set(e.id,e));return [...byId.values()];
  }
  function loadGIS(){return new Promise((resolve,reject)=>{
    if(window.google&&google.accounts&&google.accounts.oauth2){resolve();return}
    const existing=document.querySelector('script[data-ct-gis]');if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}
    const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.defer=true;s.dataset.ctGis='1';s.onload=resolve;s.onerror=()=>reject(new Error('Não foi possível carregar o serviço de autenticação do Google.'));document.head.appendChild(s);
  })}
  function currentConfigFromUI(){return {clientId:($('ct-gcal-client-id')?.value||'').trim(),includeTasks:!!$('ct-gcal-include-tasks')?.checked,includeFinance:!!$('ct-gcal-include-finance')?.checked}}
  function applyConfig(){const c=config();if($('ct-gcal-client-id'))$('ct-gcal-client-id').value=c.clientId||'';if($('ct-gcal-include-tasks'))$('ct-gcal-include-tasks').checked=c.includeTasks!==false;if($('ct-gcal-include-finance'))$('ct-gcal-include-finance').checked=c.includeFinance!==false}
  async function api(url,method,body){
    const res=await fetch(url,{method,headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
    if(res.status===401){accessToken=null;status('A autorização expirou. Clique em “Conectar” novamente para continuar a sincronização.',true);throw new Error('Autorização Google expirada.');}
    if(!res.ok){let msg='';try{msg=(await res.json()).error?.message||''}catch(_){}throw new Error('Google Agenda ('+res.status+'): '+(msg||res.statusText))}
    if(res.status===204)return null;return res.json().catch(()=>null);
  }
  async function putEvent(ev){
    const url='https://www.googleapis.com/calendar/v3/calendars/primary/events/'+encodeURIComponent(ev.id);
    try{return await api(url,'PUT',ev)}catch(e){
      if(!String(e.message).includes('(404)'))throw e;
      try{return await api('https://www.googleapis.com/calendar/v3/calendars/primary/events','POST',ev)}catch(postErr){if(String(postErr.message).includes('(409)'))return api(url,'PUT',ev);throw postErr}
    }
  }
  async function runSync(force){
    if(!accessToken){status('Conecte sua conta Google para iniciar a sincronização.');return}
    if(busy)return;busy=true;
    try{
      const events=buildEvents(), desired=events.map(e=>e.id), prior=tracked();
      const signature=JSON.stringify(events.map(e=>({id:e.id,summary:e.summary,description:e.description,date:e.start.date})).sort((a,b)=>a.id.localeCompare(b.id)));
      if(!force && signature===lastPayloadSignature)return;
      for(const ev of events)await putEvent(ev);
      for(const id of prior){if(!desired.includes(id)){try{await api('https://www.googleapis.com/calendar/v3/calendars/primary/events/'+encodeURIComponent(id),'DELETE')}catch(e){if(!String(e.message).includes('(404)'))throw e}}}
      saveTracked(desired);lastPayloadSignature=signature;
      status('Sincronizado: '+events.length+' evento(s) atualizado(s). A sincronização automática está ativa nesta sessão.');
      if(force && window.showToast)window.showToast('Google Agenda sincronizado.','success');
    }catch(e){console.error('[Ctônia Google Agenda]',e);status(e.message||'Falha ao sincronizar com o Google Agenda.',true);if(window.showToast)window.showToast('Falha na sincronização do Google Agenda.','error')}
    finally{busy=false}
  }
  function scheduleSync(){if(!accessToken)return;clearTimeout(syncTimer);syncTimer=setTimeout(runSync,1200)}
  async function connect(){
    const c=config();if(!c.clientId){$('ct-gcal-settings')?.classList.remove('hidden');status('Informe e salve o ID do cliente OAuth antes de conectar.',true);return}
    // O OAuth é iniciado pela página principal, não pelo iframe srcdoc.
    // Isso evita que o Google receba origin=null em fluxos iniciados no documento incorporado.
    status('Abrindo autorização Google…');
    try{window.parent.postMessage({type:'ct-gcal-auth-request',clientId:c.clientId},window.location.origin==='null'?'*':window.location.origin);}
    catch(e){status('Não foi possível solicitar autorização à página principal.',true)}
  }
  window.addEventListener('message',async function(event){
    if(event.source!==window.parent||!event.data||event.data.type!=='ct-gcal-auth-result')return;
    const response=event.data.response||{};
    if(response.error){const E_={file_protocol:'O Google não funciona com o site aberto como arquivo (file://). Abra por um endereço http(s): hospedagem (ex.: GitHub Pages) ou servidor local (http://localhost).',invalid_client_id:'ID do cliente inválido. Ele deve terminar em .apps.googleusercontent.com.',popup_closed:'A janela do Google foi fechada antes de concluir.',popup_failed_to_open:'O navegador bloqueou a janela do Google. Permita pop-ups para este site e tente de novo.',access_denied:'Acesso negado. Se o app está em modo de teste, adicione seu e-mail em Usuários de teste no Google Cloud.',gis_load_failed:'Não foi possível carregar o login do Google. Verifique a internet.'};status(E_[response.error]||('O Google não autorizou a conexão: '+response.error),true);return}
    if(!response.access_token){status('O Google não retornou um token de acesso.',true);return}
    accessToken=response.access_token;lastPayloadSignature='';status('Conta Google conectada. Preparando sincronização…');$('ct-gcal-sync-btn')?.classList.remove('hidden');if($('ct-gcal-connect-btn'))$('ct-gcal-connect-btn').textContent='Reconectar';await runSync(true);
  });
  function init(){
    if(!$('ct-google-calendar-panel'))return;applyConfig();
    $('ct-gcal-settings-btn')?.addEventListener('click',()=>$('ct-gcal-settings')?.classList.toggle('hidden'));
    $('ct-gcal-save-settings')?.addEventListener('click',()=>{const c=currentConfigFromUI();if(!c.clientId||!c.clientId.includes('.apps.googleusercontent.com')){status('Confira o ID do cliente OAuth. Ele deve terminar em .apps.googleusercontent.com.',true);return}saveConfig(c);accessToken=null;lastPayloadSignature='';status('Configuração salva neste navegador. Agora clique em “Conectar”.');$('ct-gcal-settings')?.classList.add('hidden')});
    $('ct-gcal-connect-btn')?.addEventListener('click',connect);$('ct-gcal-sync-btn')?.addEventListener('click',()=>runSync(true));
    const originalTask=window.saveTarefa;if(typeof originalTask==='function')window.saveTarefa=async function(){const r=await originalTask.apply(this,arguments);scheduleSync();return r};
    const originalFinance=window.saveItem;if(typeof originalFinance==='function')window.saveItem=async function(){const r=await originalFinance.apply(this,arguments);scheduleSync();return r};
    // Captura alterações recebidas por sincronização remota e mudanças de status.
    window.addEventListener('focus',scheduleSync);document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleSync()});
    setInterval(()=>{if(accessToken)scheduleSync()},60000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
