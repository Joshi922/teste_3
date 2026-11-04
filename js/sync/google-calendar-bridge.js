/* Ponte OAuth Google Agenda: roda no documento principal (nunca nos iframes srcdoc) e atende
   o Gerenciador e a Academia. Guarda o token em memória e o compartilha entre os dois. */
(function(){
  const SCOPE='https://www.googleapis.com/auth/calendar.events';
  const FRAMES=['ctonia-manager-frame','ctonia-academia-frame'];
  let cache=null,gisPromise=null;
  const origin=()=>location.origin==='null'?'*':location.origin;
  function reply(src,response,peek){
    try{src.postMessage({type:'ct-gcal-auth-result',peek:!!peek,response:response},origin());}
    catch(e){console.error('[Ctônia Google Agenda] Falha ao devolver a autorização.',e);}
  }
  function loadGoogleIdentity(){
    if(window.google&&google.accounts&&google.accounts.oauth2)return Promise.resolve();
    if(gisPromise)return gisPromise;
    gisPromise=new Promise(function(resolve,reject){
      const s=document.createElement('script');
      s.src='https://accounts.google.com/gsi/client';s.async=true;s.defer=true;s.dataset.ctGisParent='1';
      s.onload=resolve;s.onerror=function(){gisPromise=null;reject(new Error('gis_load_failed'));};
      document.head.appendChild(s);
    });
    return gisPromise;
  }
  function fromKnownFrame(src){return FRAMES.some(function(id){const f=document.getElementById(id);return f&&f.contentWindow===src;});}
  // Pré-carrega o login do Google para a janela de autorização abrir logo após o clique (evita bloqueio de pop-up).
  if(location.protocol!=='file:')window.addEventListener('load',function(){loadGoogleIdentity().catch(function(){});});
  window.addEventListener('message',async function(event){
    const d=event.data;
    if(!d||!fromKnownFrame(event.source))return;
    const src=event.source;
    if(d.type==='ct-gcal-token-peek'){
      reply(src,cache&&cache.exp>Date.now()?cache.response:{error:'no_token'},true);return;
    }
    if(d.type!=='ct-gcal-auth-request')return;
    if(location.protocol==='file:'){reply(src,{error:'file_protocol'});return;}
    const clientId=String(d.clientId||'').trim();
    if(!clientId.endsWith('.apps.googleusercontent.com')){reply(src,{error:'invalid_client_id'});return;}
    if(cache&&cache.clientId===clientId&&cache.exp>Date.now()&&!d.force){reply(src,cache.response);return;}
    try{await loadGoogleIdentity();}catch(e){reply(src,{error:'gis_load_failed'});return;}
    let consented=false;try{consented=localStorage.getItem('ct_gcal_consented')==='1';}catch(e){}
    try{
      const tc=google.accounts.oauth2.initTokenClient({
        client_id:clientId,scope:SCOPE,
        callback:function(r){
          if(r&&r.access_token){
            cache={clientId:clientId,response:r,exp:Date.now()+((+r.expires_in||3600)-60)*1000};
            try{localStorage.setItem('ct_gcal_consented','1');}catch(e){}
          }
          reply(src,r||{error:'empty_response'});
        },
        error_callback:function(err){reply(src,{error:(err&&err.type)||'popup_failed_to_open'});}
      });
      tc.requestAccessToken({prompt:consented?'':'consent'});
    }catch(error){reply(src,{error:error&&error.message?error.message:'oauth_init_failed'});}
  });
})();
