/* ===== Academia ↔ Google Agenda (sincronização real via ponte OAuth do site principal) ===== */
(function(){
 const CFG='ct_gcal_config_v1',TRK='ct_gcal_academia_ids_v1',API='https://www.googleapis.com/calendar/v3/calendars/primary/events';
 const G={tok:null,exp:0,busy:false,sig:'',msg:'',err:false,n:0};
 const cfg=()=>{try{return JSON.parse(localStorage.getItem(CFG)||'{}')}catch(e){return{}}};
 const trk=()=>{try{return JSON.parse(localStorage.getItem(TRK)||'[]')}catch(e){return[]}};
 const ok=()=>!!G.tok&&Date.now()<G.exp;
 const orig=()=>location.origin==='null'?'*':location.origin;
 const ERR={file_protocol:'O Google não funciona com o site aberto como arquivo (file://). Abra por um endereço http(s): hospedagem (ex.: GitHub Pages) ou servidor local (http://localhost).',invalid_client_id:'ID do cliente inválido. Ele deve terminar em .apps.googleusercontent.com.',popup_closed:'A janela do Google foi fechada antes de concluir.',popup_failed_to_open:'O navegador bloqueou a janela do Google. Permita pop-ups para este site e tente de novo.',access_denied:'Acesso negado. Se o app está em modo de teste, adicione seu e-mail em "Usuários de teste" no Google Cloud.',gis_load_failed:'Não foi possível carregar o login do Google. Verifique a internet.'};
 const errMsg=c=>ERR[c]||('Erro do Google: '+c);
 const hid=s=>{let h=2166136261,g=5381;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);g=Math.imul(g,33)^s.charCodeAt(i)}return 'ctacad'+(h>>>0).toString(16).padStart(8,'0')+(g>>>0).toString(16).padStart(8,'0')};
 const nxt=v=>{const d=new Date(v+'T12:00:00');d.setDate(d.getDate()+1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
 function events(){const out=[];materiasAtuais().forEach(m=>(m.ativ||[]).forEach(a=>{
  if(!a||a.feito||a.kStatus==='done'||!/^\d{4}-\d{2}-\d{2}$/.test(a.data||''))return;
  const tp=a.tipo||'Atividade',prova=/prova|exame|avalia/i.test(tp);
  out.push({id:hid('acad:'+m.id+':'+a.id),status:'confirmed',summary:(tp+': '+(a.titulo||'Sem título')+' · '+m.nome).slice(0,250),
   description:['Origem: Ctônia Hub — Academia','Matéria: '+m.nome,m.prof?'Professor: '+m.prof:'',m.local?'Local: '+m.local:'',m.hor?'Horário da matéria: '+m.hor:'',a.peso?'Peso: '+a.peso:''].filter(Boolean).join('\n'),
   start:{date:a.data},end:{date:nxt(a.data)},colorId:prova?'11':/semin|apres/i.test(tp)?'6':'9',
   reminders:{useDefault:false,overrides:(prova?[{method:'popup',minutes:10080}]:[]).concat([{method:'popup',minutes:1440},{method:'popup',minutes:60}])},
   extendedProperties:{private:{ctoniaManaged:'true',ctoniaApp:'academia'}}})}));return out}
 async function api(url,method,body){
  const r=await fetch(url,{method,headers:{Authorization:'Bearer '+G.tok,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  if(r.status===401){G.tok=null;throw new Error('A autorização expirou. Clique em Conectar novamente.')}
  if(!r.ok){let m='';try{m=(await r.json()).error.message||''}catch(e){}
   if(r.status===403&&/not been used|disabled|accessNotConfigured/i.test(m))throw new Error('A Google Calendar API não está ativada neste projeto do Google Cloud (ou ainda está propagando; aguarde alguns minutos).');
   throw new Error('Google Agenda ('+r.status+'): '+(m||r.statusText))}
  return r.status===204?null:r.json().catch(()=>null)}
 async function put(ev){const u=API+'/'+encodeURIComponent(ev.id);
  try{return await api(u,'PUT',ev)}catch(e){if(!/\(404\)/.test(e.message))throw e;
   try{return await api(API,'POST',ev)}catch(x){if(/\(409\)/.test(x.message))return api(u,'PUT',ev);throw x}}}
 function paint(msg,err){if(msg!=null){G.msg=msg;G.err=!!err}const el=document.getElementById('gc-status');if(el){el.textContent=G.msg;el.style.color=G.err?'var(--bad)':''}}
 async function sync(force){
  if(!ok()){paint('Conecte sua conta Google para sincronizar.');return}
  if(G.busy)return;G.busy=true;
  try{const evs=events(),want=evs.map(e=>e.id),sig=JSON.stringify(evs.map(e=>[e.id,e.summary,e.description,e.start.date]));
   if(!force&&sig===G.sig)return;
   paint('Sincronizando '+evs.length+' evento(s)…');
   for(const e of evs)await put(e);
   for(const id of trk())if(!want.includes(id)){try{await api(API+'/'+encodeURIComponent(id),'DELETE')}catch(e){if(!/\((404|410)\)/.test(e.message))throw e}}
   try{localStorage.setItem(TRK,JSON.stringify(want))}catch(e){}
   G.sig=sig;G.n=evs.length;
   paint('Sincronizado: '+evs.length+' evento(s) na sua Google Agenda ('+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+').');
   if(force){showToast('Google Agenda sincronizada!','success');if(!S.gcalXp){S.gcalXp=1;addXP(100,'Agenda Sincronizada')}}
  }catch(e){console.error('[Academia ↔ Google Agenda]',e);paint(e.message||'Falha ao sincronizar.',true)}finally{G.busy=false}}
 function connect(){
  const id=((document.getElementById('gc-cid')||{}).value||cfg().clientId||'').trim();
  if(!id.endsWith('.apps.googleusercontent.com')){paint(errMsg('invalid_client_id'),true);return}
  const c=cfg();c.clientId=id;try{localStorage.setItem(CFG,JSON.stringify(c))}catch(e){}
  paint('Abrindo a autorização do Google…');
  try{parent.postMessage({type:'ct-gcal-auth-request',clientId:id},orig())}catch(e){paint('Não foi possível falar com a página principal.',true)}}
 function repaintModal(){if(document.getElementById('gc-cid'))window.openGCalModal(true)}
 window.addEventListener('message',e=>{
  if(e.source!==parent||!e.data||e.data.type!=='ct-gcal-auth-result')return;
  const r=e.data.response||{};
  if(r.access_token){G.tok=r.access_token;G.exp=Date.now()+((+r.expires_in||3600)-60)*1000;repaintModal();sync(!e.data.peek);return}
  if(!e.data.peek)paint(errMsg(r.error),true)});
 window.openGCalModal=function(keep){
  const c=cfg(),n=events().length;
  mo_(`<div class="text-center mb-4"><div class="w-16 h-16 bg-[#4285F4]/20 text-[#4285F4] rounded-full flex items-center justify-center text-3xl mx-auto mb-3 border border-[#4285F4]/50"><i class="fa-brands fa-google"></i></div><h3 class="text-xl font-bold font-serif mb-1">Google Agenda</h3><p class="text-sm text-mut">Provas, seminários e entregas pendentes viram eventos de dia inteiro na sua agenda, com lembretes. <b>${n}</b> pronto(s) para enviar.</p></div>
  <label>ID do cliente OAuth do Google<input id="gc-cid" value="${esc(c.clientId||'')}" placeholder="000000000000-abc123.apps.googleusercontent.com" autocomplete="off" spellcheck="false"></label>
  <p id="gc-status" class="text-xs mt-3 mb-4" style="min-height:18px" role="status"></p>
  <div class="flex flex-wrap gap-2 justify-center"><button class="btn pri" onclick="gcConnect()">${ok()?'Reconectar':'Conectar'}</button>${ok()?'<button class="btn" onclick="gcSync()">Sincronizar agora</button>':''}<a class="btn" href="https://calendar.google.com" target="_blank" rel="noopener noreferrer">Abrir Agenda</a><button class="btn" onclick="fm()">Fechar</button></div>`);
  paint(keep&&G.msg?G.msg:ok()?(G.n?G.msg:'Conta conectada. Clique em "Sincronizar agora".'):c.clientId?'Clique em Conectar para autorizar o acesso à sua agenda.':'Cole o ID do cliente OAuth (pode ser o mesmo do Drive) e clique em Conectar.')};
 window.gcConnect=connect;window.gcSync=()=>sync(true);
 function peek(){try{parent.postMessage({type:'ct-gcal-token-peek'},orig())}catch(e){}}
 setInterval(()=>{const b=document.querySelector('[onclick="openGCalModal()"] i');if(b)b.style.color=ok()?'#34A853':'';if(ok())sync(false)},5000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!ok())peek()});
 peek();
})();
