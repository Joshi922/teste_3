        // --- MOTOR DE FERRAMENTAS (tudo local, nada é enviado a servidores) ---
        const LIBS={
            pdflib:['https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js','https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js'],
            pdfjs:['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js'],
            zip:['https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js','https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'],
            tesseract:['https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js']
        };
        const loaded={};
        function lib(k){return loaded[k]??=(async()=>{for(const u of LIBS[k]){try{await new Promise((ok,no)=>{const e=document.createElement('script');e.src=u;e.onload=ok;e.onerror=no;document.head.appendChild(e)});if(k==='pdfjs')pdfjsLib.GlobalWorkerOptions.workerSrc=u.replace('pdf.min','pdf.worker.min');return}catch(e){}}delete loaded[k];throw Error('Não foi possível carregar a biblioteca '+k)})()}
        const buf=f=>f.arrayBuffer(), bn=f=>f.name.replace(/\.[^.]+$/,''), kb=n=>(n/1024).toFixed(0)+' KB';
        const pb=u=>new Blob([u],{type:'application/pdf'});
        /* Decifragem local (AES-256) para PDFs com senha de abertura vazia ou informada */
async function pdfDecryptDoc(d,pw){
  const P=PDFLib,ctx=d.context,tr=ctx.trailerInfo,encRef=tr.Encrypt;
  if(!encRef)return false;
  const enc=ctx.lookup(encRef);
  if(!(enc instanceof P.PDFDict))throw Error('Estrutura de criptografia ilegível.');
  const N=P.PDFName.of,num=k=>{const v=enc.lookup(N(k));return v instanceof P.PDFNumber?v.asNumber():0},byt=k=>{const v=enc.lookup(N(k));return v&&v.asBytes?v.asBytes():null};
  const R=num('R'),V=num('V');
  if(V<5||R<5)throw Error('Este PDF usa uma criptografia antiga (RC4/AES-128), que a Forja ainda não decifra. Use o botão “Desbloquear PDF”.');
  const sub=crypto.subtle,cat=(...a)=>{const o=new Uint8Array(a.reduce((s,x)=>s+x.length,0));let p=0;a.forEach(x=>{o.set(x,p);p+=x.length});return o};
  const sha=(n,b)=>sub.digest('SHA-'+n,b).then(x=>new Uint8Array(x));
  const pwb=new TextEncoder().encode(pw||'').slice(0,127),none=new Uint8Array(0);
  const U=byt('U'),UE=byt('UE');
  if(!U||!UE||U.length<48||UE.length<32)throw Error('Dados de criptografia incompletos.');
  // Algoritmo 2.B (ISO 32000-2); R5 usa só SHA-256
  const hash=async(salt,u)=>{
    if(R===5)return sha(256,cat(pwb,salt,u));
    let K=await sha(256,cat(pwb,salt,u)),i=0,last=0;
    while(i<64||last>i-32){
      const k1=cat(pwb,K,u),rep=new Uint8Array(k1.length*64);
      for(let j=0;j<64;j++)rep.set(k1,j*k1.length);
      const key=await sub.importKey('raw',K.slice(0,16),'AES-CBC',false,['encrypt']);
      const E=new Uint8Array(await sub.encrypt({name:'AES-CBC',iv:K.slice(16,32)},key,rep)).slice(0,rep.length);
      let m=0;for(let j=0;j<16;j++)m+=E[j];
      K=await sha([256,384,512][m%3],E);last=E[E.length-1];i++;
    }
    return K.slice(0,32);
  };
  const vh=await hash(U.slice(32,40),none),uv=U.slice(0,32);
  if(vh.some((b,i)=>b!==uv[i]))throw Error('Este PDF exige uma senha de abertura. Informe a senha no “Desbloquear PDF”.');
  const ik=await hash(U.slice(40,48),none),ikKey=await sub.importKey('raw',ik,'AES-CBC',false,['encrypt','decrypt']),z=new Uint8Array(16);
  // UE vem sem padding: forja-se um 3º bloco para o WebCrypto aceitar o PKCS7
  const c2=UE.slice(16,32),x=new Uint8Array(16).map((_,i)=>16^c2[i]);
  const c3=new Uint8Array(await sub.encrypt({name:'AES-CBC',iv:z},ikKey,x)).slice(0,16);
  const fk=new Uint8Array(await sub.decrypt({name:'AES-CBC',iv:z},ikKey,cat(UE.slice(0,32),c3)));
  const fkey=await sub.importKey('raw',fk,'AES-CBC',false,['decrypt']);
  const nameOf=k=>{const v=enc.lookup(N(k));return v instanceof P.PDFName?v.decodeText():'Identity'};
  const stmCrypt=nameOf('StmF')!=='Identity',strCrypt=nameOf('StrF')!=='Identity';
  const em=enc.lookup(N('EncryptMetadata')),encMeta=!(em instanceof P.PDFBool&&em.asBoolean()===false);
  const dec=async b=>b.length<=16?new Uint8Array(0):new Uint8Array(await sub.decrypt({name:'AES-CBC',iv:b.slice(0,16)},fkey,b.slice(16)));
  const hex=b=>Array.from(b,v=>v.toString(16).padStart(2,'0')).join('');
  const isStr=v=>v instanceof P.PDFString||v instanceof P.PDFHexString;
  const decStr=async s=>P.PDFHexString.of(hex(await dec(s.asBytes())));
  const walk=async o=>{
    if(o instanceof P.PDFDict){for(const[k,v]of o.entries()){if(isStr(v))o.set(k,await decStr(v));else if(v instanceof P.PDFDict||v instanceof P.PDFArray)await walk(v)}}
    else if(o instanceof P.PDFArray){for(let i=0;i<o.size();i++){const v=o.get(i);if(isStr(v))o.set(i,await decStr(v));else if(v instanceof P.PDFDict||v instanceof P.PDFArray)await walk(v)}}
  };
  const hasCryptFilter=dict=>{const f=dict.lookup(N('Filter'));const l=f instanceof P.PDFArray?f.asArray():[f];return l.some(v=>v instanceof P.PDFName&&v.decodeText()==='Crypt')};
  const rebuildObjStm=async b=>{
    const head=new TextDecoder('latin1').decode(b.slice(0,Math.min(b.length,1000))),m=head.match(/stream(\r\n|\n)/);
    if(!m||!/\/Type\s*\/ObjStm/.test(head))return null;
    const dtxt=head.slice(0,m.index),g=k=>{const r=dtxt.match(new RegExp('/'+k+'\\s+(\\d+)(?:\\s+(\\d+)\\s+R)?'));return r};
    const nm=g('N'),fm=g('First'),lm=g('Length');
    if(!nm||!fm)return null;
    const start=m.index+m[0].length;let len=null;
    if(lm){if(lm[2]===undefined)len=+lm[1];else{const v=ctx.lookup(P.PDFRef.of(+lm[1],+lm[2]));if(v instanceof P.PDFNumber)len=v.asNumber()}}
    if(len===null||start+len>b.length){let e=b.length;const t=new TextDecoder('latin1').decode(b.slice(Math.max(0,b.length-40)));const k=t.lastIndexOf('endstream');if(k>=0)e=b.length-40+k;if(b[e-1]===10)e--;if(b[e-1]===13)e--;len=e-start}
    const dict=ctx.obj({Type:'ObjStm',N:+nm[1],First:+fm[1],Filter:'FlateDecode'});
    return P.PDFRawStream.of(dict,await dec(b.slice(start,start+len)));
  };
  const objStms=[];
  for(const[ref,obj]of ctx.enumerateIndirectObjects()){
    if(encRef instanceof P.PDFRef&&ref.tag===encRef.tag)continue;
    if(obj instanceof P.PDFRawStream){
      const t=obj.dict.lookup(N('Type')),tn=t instanceof P.PDFName?t.decodeText():'';
      if(tn==='XRef'){ctx.delete(ref);continue}
      if(strCrypt)await walk(obj.dict);
      const skip=!stmCrypt||(tn==='Metadata'&&!encMeta)||hasCryptFilter(obj.dict);
      const cur=skip?obj:P.PDFRawStream.of(obj.dict,await dec(obj.contents));
      if(!skip)ctx.assign(ref,cur);
      if(tn==='ObjStm')objStms.push([ref,cur]);
    }else if(obj instanceof P.PDFInvalidObject){
      // ObjStm com /Length indireto: o pdf-lib não lê, então recuperamos o fluxo dos bytes crus
      const s=await rebuildObjStm(obj.data);
      if(s){ctx.assign(ref,s);objStms.push([ref,s])}
    }else if(strCrypt){
      if(isStr(obj))ctx.assign(ref,await decStr(obj));else await walk(obj);
    }
  }
  // Objetos dentro de ObjStm só puderam ser lidos agora que o fluxo foi decifrado
  for(const[ref,s]of objStms){await P.PDFObjectStreamParser.forStream(s).parseIntoContext();ctx.delete(ref)}
  if(encRef instanceof P.PDFRef)ctx.delete(encRef);
  delete tr.Encrypt;
  return true;
}
// Abre o PDF; se estiver criptografado com senha de abertura vazia (ou informada), decifra na memória.
async function pdfDocOpen(bytes,pw){
  const d=await PDFLib.PDFDocument.load(bytes,{ignoreEncryption:true,updateMetadata:false});
  if(d.context.trailerInfo.Encrypt){await pdfDecryptDoc(d,pw);d.__enc=true}
  else{d.setProducer('pdf-lib (https://github.com/Hopding/pdf-lib)');d.setCreator('pdf-lib (https://github.com/Hopding/pdf-lib)');d.setModificationDate(new Date())}
  return d;
}
        async function pdfDoc(f,pw){await lib('pdflib');return pdfDocOpen(await buf(f),pw)}
        async function renderPages(f,scale,pw){await lib('pdfjs');const d=await pdfjsLib.getDocument({data:await buf(f),password:pw||undefined}).promise,out=[];for(let i=1;i<=d.numPages;i++){const p=await d.getPage(i),v=p.getViewport({scale}),c=document.createElement('canvas');c.width=v.width;c.height=v.height;await p.render({canvasContext:c.getContext('2d'),viewport:v}).promise;out.push(c)}return out}
        async function rasterPdf(f,scale,q,pw,enc){const cs=await renderPages(f,scale,pw),{jsPDF}=window.jspdf;let d;cs.forEach((c,i)=>{const w=c.width/scale,h=c.height/scale,or=w>h?'l':'p';if(i===0)d=new jsPDF({unit:'pt',format:[w,h],orientation:or,encryption:enc});else d.addPage([w,h],or);d.addImage(c.toDataURL('image/jpeg',q),'JPEG',0,0,w,h)});return d.output('blob')}
        function parseRange(s,n){if(!s||!s.trim())return[...Array(n).keys()];const r=[];s.split(',').forEach(p=>{const[a,b]=p.split('-').map(x=>parseInt(x));if(!a)return;for(let i=a;i<=(b||a)&&i<=n;i++)r.push(i-1)});if(!r.length)throw Error('Intervalo de páginas inválido.');return r}
        async function zipIt(list){await lib('zip');const z=new JSZip();list.forEach(x=>z.file(x.name,x.blob));return z.generateAsync({type:'blob'})}
        function dl(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000)}
        const hexRgb=c=>PDFLib.rgb(parseInt(c.slice(1,3),16)/255,parseInt(c.slice(3,5),16)/255,parseInt(c.slice(5,7),16)/255);

        const T={
            juntar:{accept:'.pdf',multi:1,fields:[],async run(fs){await lib('pdflib');const out=await PDFLib.PDFDocument.create();for(const f of fs){const s=await pdfDoc(f);(await out.copyPages(s,s.getPageIndices())).forEach(p=>out.addPage(p))}return{name:'ctonia_juntado.pdf',blob:pb(await out.save())}}},
            dividir:{accept:'.pdf',fields:[{k:'m',label:'Modo',opts:[['r','Extrair intervalo'],['e','Uma página por arquivo'],['n','A cada N páginas']]},{k:'v',label:'Intervalo ou N',ph:'ex.: 1-3,5  ou  2'}],async run([f],o){const s=await pdfDoc(f),n=s.getPageCount(),all=s.getPageIndices();let g;
                if(o.m==='r')g=[parseRange(o.v,n)];else if(o.m==='e')g=all.map(i=>[i]);else{const k=Math.max(1,+o.v||1);g=[];for(let i=0;i<n;i+=k)g.push(all.slice(i,i+k))}
                const out=[];for(const[j,idx]of g.entries()){const d=await PDFLib.PDFDocument.create();(await d.copyPages(s,idx)).forEach(p=>d.addPage(p));out.push({name:`${bn(f)}_${j+1}.pdf`,blob:pb(await d.save())})}return out}},
            rodar:{accept:'.pdf',fields:[{k:'a',label:'Rotação',opts:[['90','90° horário'],['180','180°'],['270','90° anti-horário']]},{k:'v',label:'Páginas (vazio = todas)',ph:'ex.: 1-3,5'}],async run([f],o){const d=await pdfDoc(f),ps=d.getPages();parseRange(o.v,ps.length).forEach(i=>ps[i].setRotation(PDFLib.degrees((ps[i].getRotation().angle+ +o.a)%360)));return{name:bn(f)+'_rodado.pdf',blob:pb(await d.save())}}},
            numeros:{accept:'.pdf',fields:[{k:'p',label:'Posição',opts:[['bc','Inferior centro'],['br','Inferior direita'],['bl','Inferior esquerda'],['tc','Superior centro'],['tr','Superior direita'],['tl','Superior esquerda']]},{k:'s',label:'Primeiro número',type:'number',def:1},{k:'t',label:'Texto ({n}=número, {t}=total)',def:'{n}'},{k:'range',label:'Páginas (vazio = todas)',ph:'ex.: 1-5,8'},{k:'size',label:'Tamanho da fonte',type:'number',def:11},{k:'margin',label:'Margem (pt)',type:'number',def:25},{k:'c',label:'Cor',type:'color',def:'#333333'}],async run([f],o){const d=await pdfDoc(f),h=await d.embedFont(PDFLib.StandardFonts.Helvetica),ps=d.getPages(),st=+o.s||1,chosen=new Set(parseRange(o.range,ps.length));ps.forEach((p,i)=>{if(!chosen.has(i))return;const{width:w,height:ht}=p.getSize(),z=Math.max(5,Math.min(72,+o.size||11)),tx=(o.t||'{n}').replaceAll('{n}',i+st).replaceAll('{t}',ps.length+st-1),tw=h.widthOfTextAtSize(tx,z),m=Math.max(0,+o.margin||25),x=o.p[1]==='c'?(w-tw)/2:o.p[1]==='l'?m:w-m-tw,y=o.p[0]==='b'?m:ht-m-z;p.drawText(tx,{x:Math.max(0,x),y:Math.max(0,y),size:z,font:h,color:hexRgb(o.c||'#333333')})});return{name:bn(f)+'_numerado.pdf',blob:pb(await d.save())}}},
            'marca-dagua':{accept:'.pdf',fields:[{k:'x',label:'Texto da marca',def:'CONFIDENCIAL'},{k:'z',label:'Tamanho',type:'number',def:60},{k:'op',label:'Opacidade (%)',type:'number',def:25},{k:'r',label:'Rotação (°)',type:'number',def:45},{k:'c',label:'Cor',type:'color',def:'#E1414F'},{k:'pos',label:'Posição',opts:[['center','Centro'],['top','Superior'],['bottom','Inferior'],['tl','Superior esquerda'],['tr','Superior direita'],['bl','Inferior esquerda'],['br','Inferior direita']]},{k:'range',label:'Páginas (vazio = todas)',ph:'ex.: 1-3,5'}],async run([f],o){const d=await pdfDoc(f),h=await d.embedFont(PDFLib.StandardFonts.HelveticaBold),a=(+o.r||0)*Math.PI/180,z=Math.max(6,Math.min(150,+o.z||60)),ps=d.getPages(),chosen=new Set(parseRange(o.range,ps.length)),txt=o.x||'CONFIDENCIAL';ps.forEach((p,i)=>{if(!chosen.has(i))return;const{width:w,height:ht}=p.getSize(),tw=h.widthOfTextAtSize(txt,z);let x=(w-tw)/2,y=(ht-z)/2;const m=24;if(o.pos==='top')y=ht-m-z;else if(o.pos==='bottom')y=m;else if(o.pos==='tl'){x=m;y=ht-m-z}else if(o.pos==='tr'){x=w-m-tw;y=ht-m-z}else if(o.pos==='bl'){x=m;y=m}else if(o.pos==='br'){x=w-m-tw;y=m}p.drawText(txt,{x,y,size:z,font:h,color:hexRgb(o.c||'#E1414F'),opacity:Math.max(0,Math.min(100,+o.op||0))/100,rotate:PDFLib.degrees(+o.r||0)})});return{name:bn(f)+'_marca.pdf',blob:pb(await d.save())}}},
            metadados:{accept:'.pdf',fields:[{k:'title',label:'Título',ph:'Título do livro'},{k:'author',label:'Autor',ph:'Autor'},{k:'collection',label:'Coleção',ph:'Ex.: Umbanda'},{k:'genre',label:'Gênero',ph:'Ex.: Religião'},{k:'subgenre',label:'Subgênero',ph:'Ex.: Ocultismo, Orientalismo (separe por vírgula)'},{k:'series',label:'Série',ph:'Ex.: Umbanda Esotérica'},{k:'volume',label:'Volume',ph:'Único, I, II, III… ou 1, 2, 3…'}],async run([f],o){const d=await pdfDoc(f);const t=x=>(x||'').trim();const v={title:t(o.title),author:t(o.author),collection:t(o.collection),genre:t(o.genre),subgenre:t(o.subgenre),series:t(o.series),volume:t(o.volume)};if(v.title)d.setTitle(v.title);if(v.author)d.setAuthor(v.author);d.setCreator('Ctônia PDF Hub');d.setProducer('Ctônia PDF Hub');{const info=d.getInfoDict(),N=PDFLib.PDFName.of,H=x=>PDFLib.PDFHexString.fromText(x);[['collection','CtoniaCollection'],['genre','CtoniaGenre'],['subgenre','CtoniaSubgenre'],['series','CtoniaSeries'],['volume','CtoniaVolume']].forEach(([k,key])=>{if(v[k])info.set(N(key),H(v[k]))});if(v.collection)info.set(N('Keywords'),H(v.collection));}const subj=[v.genre,v.subgenre,v.series&&'Série: '+v.series,v.volume&&'Volume: '+v.volume].filter(Boolean).join(' | ');if(subj)d.setSubject(subj);return{name:bn(f)+'_metadados.pdf',blob:pb(await d.save()),note:'Coleção, gênero, subgênero, série e volume foram gravados em campos próprios do Ctônia (série e volume também no Assunto, para outros leitores). A Biblioteca reconhece tudo ao importar e usa esses dados nos filtros.'+(d.__enc?' Este PDF tinha restrições de edição; a cópia salva não as mantém.':'')}}},
            ocr:{accept:'.pdf',fields:[{k:'lang',label:'Idioma do reconhecimento',opts:[['por','Português'],['eng','Inglês'],['spa','Espanhol']]},{k:'range',label:'Páginas (vazio = todas)',ph:'ex.: 1-3,5'},{k:'scale',label:'Resolução',opts:[['1.5','Padrão (mais rápido)'],['2','Alta'],['3','Muito alta (mais lento)']]}],async run([f],o){await lib('pdfjs');await lib('tesseract');const d=await pdfjsLib.getDocument({data:await buf(f)}).promise,ids=parseRange(o.range,d.numPages),worker=await Tesseract.createWorker(o.lang||'por');let txt='';try{for(const i of ids){const p=await d.getPage(i+1),v=p.getViewport({scale:+o.scale||1.5}),c=document.createElement('canvas');c.width=v.width;c.height=v.height;await p.render({canvasContext:c.getContext('2d'),viewport:v}).promise;const r=await worker.recognize(c);txt+='\\n\\n--- Página '+(i+1)+' ---\\n'+r.data.text;c.width=0;c.height=0}}finally{await worker.terminate()}return{name:bn(f)+'_ocr.txt',blob:new Blob([txt.trim()],{type:'text/plain;charset=utf-8'}),note:'OCR concluído. O resultado é um arquivo TXT com o texto reconhecido.'}}},
            recortar:{accept:'.pdf',fields:[['t','Topo (%)'],['b','Base (%)'],['l','Esquerda (%)'],['r','Direita (%)']].map(([k,label])=>({k,label,type:'number',def:5})),async run([f],o){const d=await pdfDoc(f);d.getPages().forEach(p=>{const{width:w,height:h}=p.getSize(),l=w*o.l/100,r=w*o.r/100,t=h*o.t/100,b=h*o.b/100;p.setCropBox(l,b,w-l-r,h-t-b)});return{name:bn(f)+'_recortado.pdf',blob:pb(await d.save())}}},
            reparar:{accept:'.pdf',fields:[],async run([f]){await lib('pdflib');const s=await PDFLib.PDFDocument.load(await buf(f),{ignoreEncryption:true,throwOnInvalidObject:false}),d=await PDFLib.PDFDocument.create();(await d.copyPages(s,s.getPageIndices())).forEach(p=>d.addPage(p));return{name:bn(f)+'_reparado.pdf',blob:pb(await d.save())}}},
            comprimir:{accept:'.pdf',fields:[{k:'l',label:'Nível (páginas viram imagens)',opts:[['.7,1.5','Baixa compressão'],['.5,1.2','Recomendada'],['.3,1','Extrema']]}],async run([f],o){const[q,sc]=o.l.split(',').map(Number),b=await rasterPdf(f,sc,q),out={name:bn(f)+'_comprimido.pdf',blob:b};if(b.size>=f.size){out.blob=f;out.note='O arquivo já estava otimizado; foi mantido o original.'}else out.note=`Reduzido de ${kb(f.size)} para ${kb(b.size)}.`;return out}},
            'pdf-jpg':{accept:'.pdf',fields:[],async run([f]){const cs=await renderPages(f,2);return Promise.all(cs.map(async(c,i)=>({name:`${bn(f)}_p${i+1}.jpg`,blob:await new Promise(r=>c.toBlob(r,'image/jpeg',.92))})))}},
            proteger:{accept:'.pdf',fields:[{k:'p',label:'Senha',type:'password',ph:'Sua senha secreta'}],async run([f],o){if(!o.p)throw Error('Informe uma senha.');return{name:bn(f)+'_protegido.pdf',blob:await rasterPdf(f,2,.92,null,{userPassword:o.p,ownerPassword:o.p,userPermissions:['print']}),note:'PDF protegido (páginas convertidas em imagem).'}}},
            desbloquear:{accept:'.pdf',fields:[{k:'p',label:'Senha de abertura (se o PDF pedir)',type:'password',ph:'Deixe vazio se não houver senha'}],async run([f],o){try{const d=await pdfDoc(f,o.p);return{name:bn(f)+'_desbloqueado.pdf',blob:pb(await d.save()),note:'Restrições removidas com o texto preservado (arquivos que abrem sem senha ou com a senha informada).'}}catch(e){try{return{name:bn(f)+'_desbloqueado.pdf',blob:await rasterPdf(f,2,.92,o.p),note:'PDF reconstruído como páginas-imagem; pode perder texto selecionável e acessibilidade.'}}catch(err){if(/password/i.test(err.message||err.name))throw Error('Este PDF exige uma senha de abertura. Não é possível garantir a recuperação da senha por esta ferramenta.');throw err}}}}
        };

        let tf=[];
        function renderTool(tool){
            const t=T[tool.id];tf=[];
            workspaceContent.innerHTML=`<div class="flex-1 flex bg-abyssal relative">
                <div id="tl" class="flex-1 editor-canvas-bg flex flex-col relative overflow-hidden"></div>
                <div class="w-80 bg-indigo border-l border-night flex flex-col z-10">
                    <div class="p-5 border-b border-night"><h2 class="font-serif text-lg text-salmon uppercase title-glow">Opções de Rito</h2></div>
                    <div class="flex-1 p-5 overflow-y-auto space-y-5">${t.fields.map(f=>`<div><h3 class="text-xs text-night uppercase tracking-widest font-bold mb-2">${f.label}</h3>${f.opts?`<select id="o-${f.k}" class="w-full bg-abyssal border border-night text-salmon text-sm rounded p-2.5 outline-none focus:border-luminous">${f.opts.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join('')}</select>`:`<input id="o-${f.k}" type="${f.type||'text'}" value="${f.def??''}" placeholder="${f.ph||''}" class="w-full bg-abyssal border border-night text-salmon text-sm rounded p-2.5 outline-none focus:border-luminous">`}</div>`).join('')||'<p class="text-xs text-night italic">Sem opções: basta processar.</p>'}</div>
                    <div class="p-6 border-t border-night"><button id="run-btn" onclick="runTool('${tool.id}')" class="w-full bg-magenta hover:opacity-90 text-abyssal font-bold uppercase tracking-wider py-4 rounded-lg shadow-lg transition-all flex items-center justify-center gap-3">Processar <i class="fas fa-magic"></i></button></div>
                </div></div>`;
            drawList(tool.id);
        }
        function drawList(id){
            const t=T[id];
            document.getElementById('tl').innerHTML=`<div class="flex-1 overflow-auto p-8 flex flex-col items-center" ondragover="event.preventDefault()" ondrop="event.preventDefault();addFiles('${id}',event.dataTransfer.files)">
                <label class="cursor-pointer bg-magenta text-abyssal px-8 py-4 rounded-lg font-bold uppercase shadow-lg mb-3"><i class="fas fa-plus"></i> ${t.multi?'Selecionar arquivos':'Selecionar arquivo'}<input type="file" class="hidden" ${t.multi?'multiple':''} accept="${t.accept}" onchange="addFiles('${id}',this.files)"></label>
                <p class="text-mystic text-xs mb-6">ou arraste para cá${t.multi?' (arraste os itens para reordenar)':''}</p>
                <div id="fl" class="w-full max-w-xl space-y-2">${tf.map((f,i)=>`<div class="bg-indigo border border-night rounded p-3 flex items-center gap-3 ${t.multi?'cursor-move':''}"><i class="fas fa-file-pdf text-mystic"></i><span class="flex-1 truncate text-salmon text-xs">${f.name}</span><span class="text-[10px] text-mystic">${kb(f.size)}</span><button onclick="tf.splice(${i},1);drawList('${id}')" class="text-magenta"><i class="fas fa-times"></i></button></div>`).join('')}</div></div>`;
            new Sortable(document.getElementById('fl'),{animation:150,onEnd:e=>tf.splice(e.newIndex,0,tf.splice(e.oldIndex,1)[0])});
        }
        function addFiles(id,fl){const t=T[id];let a=[...fl];if(!t.multi){a=a.slice(0,1);tf=[]}tf.push(...a);drawList(id)}
        async function runTool(id){
            if(!tf.length)return alert('Adicione um arquivo primeiro.');
            const t=T[id],o={},b=document.getElementById('run-btn');
            t.fields.forEach(f=>o[f.k]=document.getElementById('o-'+f.k).value);
            b.disabled=true;b.innerHTML='<i class="fas fa-spinner fa-spin"></i> Processando...';
            try{
                await lib('pdflib');
                let r=await t.run(tf,o);if(!Array.isArray(r))r=[r];
                const out=r.length>1?{name:'ctonia_'+id+'.zip',blob:await zipIt(r)}:r[0];
                showResult(id,out)
            }catch(e){console.error(e);alert('Erro: '+e.message)}
            b.disabled=false;b.innerHTML='Processar <i class="fas fa-magic"></i>';
        }
        function showResult(id,out){
            window._out=out;
            document.getElementById('tl').innerHTML=`<div class="flex-1 flex flex-col items-center justify-center text-center p-8">
                <i class="fas fa-check-circle text-6xl text-mystic mb-4"></i>
                <h2 class="text-2xl font-serif text-salmon title-glow uppercase mb-2">Rito concluído</h2>
                <p class="text-xs text-mystic mb-6">${out.name} · ${kb(out.blob.size)}${out.note?'<br>'+out.note:''}</p>
                <button onclick="dl(_out.blob,_out.name)" class="bg-luminous text-abyssal px-10 py-4 rounded-lg font-bold text-lg uppercase shadow-lg mb-4"><i class="fas fa-download"></i> Baixar</button>
                <button onclick="drawList('${id}')" class="text-xs text-night underline">Processar outro arquivo</button></div>`;
            tf=[];
        }

