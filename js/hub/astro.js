(function(){
  if (window.__ctAstroLoaded) return; window.__ctAstroLoaded = true;
  var RAD = Math.PI/180, DEG = 180/Math.PI;
  function norm(x){ x = x % 360; return x < 0 ? x + 360 : x; }
  function sin(d){ return Math.sin(d*RAD); } function cos(d){ return Math.cos(d*RAD); }

  /* ---------- Cidades (lat, lon, fuso) ---------- */
  var BR = 'America/Sao_Paulo';
  var CITIES = [
    ['Sorocaba/SP',-23.5015,-47.4526,BR],['São Paulo/SP',-23.5505,-46.6333,BR],['Campinas/SP',-22.9099,-47.0626,BR],
    ['Santos/SP',-23.9608,-46.3336,BR],['Ribeirão Preto/SP',-21.1775,-47.8103,BR],['São José dos Campos/SP',-23.1896,-45.8841,BR],
    ['Jundiaí/SP',-23.1857,-46.8978,BR],['Itu/SP',-23.2640,-47.2992,BR],['Votorantim/SP',-23.5467,-47.4378,BR],
    ['Araçoiaba da Serra/SP',-23.5053,-47.6153,BR],['Piracicaba/SP',-22.7253,-47.6492,BR],['Bauru/SP',-22.3147,-49.0587,BR],
    ['Rio de Janeiro/RJ',-22.9068,-43.1729,BR],['Niterói/RJ',-22.8832,-43.1034,BR],['Belo Horizonte/MG',-19.9167,-43.9345,BR],
    ['Uberlândia/MG',-18.9186,-48.2772,BR],['Vitória/ES',-20.3155,-40.3128,BR],['Curitiba/PR',-25.4284,-49.2733,BR],
    ['Londrina/PR',-23.3045,-51.1696,BR],['Florianópolis/SC',-27.5954,-48.5480,BR],['Joinville/SC',-26.3044,-48.8487,BR],
    ['Porto Alegre/RS',-30.0346,-51.2177,BR],['Caxias do Sul/RS',-29.1678,-51.1794,BR],['Brasília/DF',-15.7939,-47.8828,BR],
    ['Goiânia/GO',-16.6869,-49.2648,BR],['Campo Grande/MS',-20.4697,-54.6201,'America/Campo_Grande'],
    ['Cuiabá/MT',-15.6014,-56.0979,'America/Cuiaba'],['Salvador/BA',-12.9777,-38.5016,'America/Bahia'],
    ['Aracaju/SE',-10.9472,-37.0731,BR],['Maceió/AL',-9.6498,-35.7089,BR],['Recife/PE',-8.0476,-34.8770,'America/Recife'],
    ['João Pessoa/PB',-7.1195,-34.8450,BR],['Natal/RN',-5.7945,-35.2110,BR],['Fortaleza/CE',-3.7319,-38.5267,'America/Fortaleza'],
    ['Teresina/PI',-5.0892,-42.8019,BR],['São Luís/MA',-2.5307,-44.3068,BR],['Belém/PA',-1.4558,-48.4902,'America/Belem'],
    ['Palmas/TO',-10.2491,-48.3243,BR],['Macapá/AP',0.0349,-51.0694,BR],['Manaus/AM',-3.1190,-60.0217,'America/Manaus'],
    ['Porto Velho/RO',-8.7612,-63.9004,'America/Porto_Velho'],['Boa Vista/RR',2.8235,-60.6758,'America/Boa_Vista'],
    ['Rio Branco/AC',-9.9747,-67.8100,'America/Rio_Branco'],['Lisboa/PT',38.7223,-9.1393,'Europe/Lisbon']
  ];
  var KEY = 'ct-astro-city';
  function loadCity(){
    try { var raw = localStorage.getItem(KEY); if (raw) { var c = JSON.parse(raw); if (c && isFinite(c.lat) && isFinite(c.lon)) return c; } } catch(e){}
    return { name:'Sorocaba/SP', lat:-23.5015, lon:-47.4526, tz:BR };
  }
  function saveCity(c){ try { localStorage.setItem(KEY, JSON.stringify(c)); } catch(e){} }
  var city = loadCity();

  /* ---------- Astronomia ---------- */
  function julian(d){ return d.getTime()/86400000 + 2440587.5; }
  function obliquity(T){ return 23.439291 - 0.0130042*T - 1.64e-7*T*T; }
  // Sol (Meeus cap. 25, baixa precisão) — longitude aparente
  function sunLon(jd){
    var T = (jd-2451545)/36525;
    var L0 = norm(280.46646 + 36000.76983*T + 0.0003032*T*T);
    var M = norm(357.52911 + 35999.05029*T - 0.0001537*T*T);
    var C = (1.914602 - 0.004817*T - 0.000014*T*T)*sin(M) + (0.019993 - 0.000101*T)*sin(2*M) + 0.000289*sin(3*M);
    var tl = L0 + C;
    var om = 125.04 - 1934.136*T;
    return norm(tl - 0.00569 - 0.00478*sin(om));
  }
  // Lua (Meeus cap. 47, termos principais)
  var MT = [
    [0,0,1,0,6288774,-20905355],[2,0,-1,0,1274027,-3699111],[2,0,0,0,658314,-2955968],[0,0,2,0,213618,-569925],
    [0,1,0,0,-185116,48888],[0,0,0,2,-114332,-3149],[2,0,-2,0,58793,246158],[2,-1,-1,0,57066,-152138],
    [2,0,1,0,53322,-170733],[2,-1,0,0,45758,-204586],[0,1,-1,0,-40923,-129620],[1,0,0,0,-34720,108743],
    [0,1,1,0,-30383,104755],[2,0,0,-2,15327,10321],[0,0,1,2,-12528,0],[0,0,1,-2,10980,79661],
    [4,0,-1,0,10675,-34782],[0,0,3,0,10034,-23210],[4,0,-2,0,8548,-21636],[2,1,-1,0,-7888,24208],
    [2,1,0,0,-6766,30824],[1,0,-1,0,-5163,-8379],[1,1,0,0,4987,-16675],[2,-1,1,0,4036,-12831],
    [2,0,2,0,3994,-10445],[4,0,0,0,3861,-11650],[2,0,-3,0,3665,14403],[0,1,-2,0,-2689,-7003],
    [2,0,-1,2,-2602,0],[2,-1,-2,0,2390,10056],[1,0,1,0,-2348,6322],[2,-2,0,0,2236,-9884]
  ];
  var MB = [
    [0,0,0,1,5128122],[0,0,1,1,280602],[0,0,1,-1,277693],[2,0,0,-1,173237],[2,0,-1,1,55413],[2,0,-1,-1,46271],
    [2,0,0,1,32573],[0,0,2,1,17198],[2,0,1,-1,9266],[0,0,2,-1,8822],[2,-1,0,-1,8216],[2,0,-2,-1,4324],[2,0,1,1,4200]
  ];
  function moonLon(jd){
    var T = (jd-2451545)/36525;
    var Lp = norm(218.3164477 + 481267.88123421*T - 0.0015786*T*T);
    var D  = norm(297.8501921 + 445267.1114034*T - 0.0018819*T*T);
    var M  = norm(357.5291092 + 35999.0502909*T - 0.0001536*T*T);
    var Mp = norm(134.9633964 + 477198.8675055*T + 0.0087414*T*T);
    var F  = norm(93.2720950 + 483202.0175233*T - 0.0036539*T*T);
    var A1 = norm(119.75 + 131.849*T), A2 = norm(53.09 + 479264.290*T);
    var E = 1 - 0.002516*T - 0.0000074*T*T;
    var sl = 0, i, t, e;
    for (i=0;i<MT.length;i++){ t = MT[i]; e = Math.abs(t[1])===1 ? E : 1;
      sl += t[4]*e*sin(t[0]*D + t[1]*M + t[2]*Mp + t[3]*F); }
    sl += 3958*sin(A1) + 1962*sin(Lp-F) + 318*sin(A2);
    var lon = Lp + sl/1000000;
    // nutação aproximada em longitude
    var om = 125.04452 - 1934.136261*T;
    var dpsi = -17.20*sin(om)/3600 - 1.32*sin(2*(280.4665+36000.7698*T))/3600 - 0.23*sin(2*Lp)/3600 + 0.21*sin(2*om)/3600;
    return norm(lon + dpsi);
  }
  function sunLonMean(jd){ return sunLon(jd); }
  // Ascendente e MC + casas Placidus
  function gmst(jd){
    var T = (jd-2451545)/36525;
    return norm(280.46061837 + 360.98564736629*(jd-2451545) + 0.000387933*T*T - T*T*T/38710000);
  }
  function houses(jd, lat, lon){
    var T = (jd-2451545)/36525, eps = obliquity(T), cosE = cos(eps), sinE = sin(eps);
    var ramc = norm(gmst(jd) + lon);
    var mc = norm(Math.atan2(sin(ramc), cos(ramc)*cosE)*DEG);
    var asc = norm(Math.atan2(cos(ramc), -(sin(ramc)*cosE + Math.tan(lat*RAD)*sinE))*DEG);
    var c = new Array(13);
    c[1] = asc; c[10] = mc; c[4] = norm(mc+180); c[7] = norm(asc+180);
    var tanLat = Math.tan(lat*RAD), ok = Math.abs(lat) < 66;
    // Placidus: 11 e 12 usam o semi-arco diurno; 2 e 3 o noturno (iteração em ascensão reta)
    function solve(upper, n){
      var R = norm(ramc + (upper ? 30*n : 180 - 30*n)), i, prev, lam, decl, ad;
      for (i=0;i<80;i++){
        prev = R;
        lam = Math.atan2(sin(R), cos(R)*cosE)*DEG;
        decl = Math.asin(sinE*sin(lam))*DEG;
        ad = Math.asin(Math.max(-1, Math.min(1, tanLat*Math.tan(decl*RAD))))*DEG;
        R = upper ? norm(ramc + n*(90+ad)/3) : norm(ramc + 180 - n*(90-ad)/3);
        if (Math.abs(norm(R-prev+180)-180) < 1e-8) break;
      }
      return norm(Math.atan2(sin(R), cos(R)*cosE)*DEG);
    }
    if (ok) { c[11] = solve(true,1); c[12] = solve(true,2); c[2] = solve(false,2); c[3] = solve(false,1); }
    if (!ok || [11,12,2,3].some(function(k){ return !isFinite(c[k]); })) {
      var s1 = norm(asc - mc), s2 = norm(c[4] - asc);   // Porphyry (reserva)
      c[11] = norm(mc + s1/3); c[12] = norm(mc + 2*s1/3); c[2] = norm(asc + s2/3); c[3] = norm(asc + 2*s2/3);
    }
    c[5] = norm(c[11]+180); c[6] = norm(c[12]+180); c[8] = norm(c[2]+180); c[9] = norm(c[3]+180);
    return c;
  }
  function houseOf(lon, cusps){
    for (var h=1; h<=12; h++){
      var a = cusps[h], b = cusps[h===12?1:h+1];
      var span = norm(b - a), pos = norm(lon - a);
      if (pos < span) return h;
    }
    return 1;
  }

  /* ---------- Símbolos, nomes ---------- */
  var V = '\uFE0E';
  var SIGNS = [
    ['Áries','♈','fire'],['Touro','♉','earth'],['Gêmeos','♊','air'],['Câncer','♋','water'],['Leão','♌','fire'],['Virgem','♍','earth'],
    ['Libra','♎','air'],['Escorpião','♏','water'],['Sagitário','♐','fire'],['Capricórnio','♑','earth'],['Aquário','♒','air'],['Peixes','♓','water']
  ];
  var DAYS = [
    ['Domingo','☉','sun','Sol'],['Segunda-Feira','☽','moon','Lua'],['Terça-Feira','♂','mars','Marte'],['Quarta-Feira','☿','mercury','Mercúrio'],
    ['Quinta-Feira','♃','jupiter','Júpiter'],['Sexta-Feira','♀','venus','Vênus'],['Sábado','♄','saturn','Saturno']
  ];
  function dms(lon){
    var inSign = lon % 30, deg = Math.floor(inSign), min = Math.floor((inSign - deg)*60);
    return { sign: Math.floor(lon/30), deg: deg, min: min };
  }
  function pad(n){ return (n<10?'0':'')+n; }
  function moonPhase(sl, ml){
    var el = norm(ml - sl), illum = (1 - cos(el))/2*100, name, emoji;
    if (el < 5.5 || el >= 354.5) name = 'Lua Nova';
    else if (el < 85) name = 'Lua Crescente';
    else if (el < 95) name = 'Quarto Crescente';
    else if (el < 175) name = 'Crescente Gibosa';
    else if (el < 185) name = 'Lua Cheia';
    else if (el < 265) name = 'Minguante Gibosa';
    else if (el < 275) name = 'Quarto Minguante';
    else name = 'Lua Minguante';
    return { elong: el, illum: illum, name: name };
  }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  /* ---------- UI ---------- */
  var roots = [];
  function build(host){
    host.classList.add('ct-astro');
    host.innerHTML =
      '<div class="ct-astro-inner">' +
        '<div class="ct-astro-clock" aria-live="off"><span class="ct-h">--</span><span class="ct-colon">:</span><span class="ct-m">--</span></div>' +
        '<div class="ct-astro-day"><span class="ct-day-sym"></span><span class="ct-day-name"></span></div>' +
        '<div class="ct-astro-bodies">' +
          '<div class="ct-body ct-sun"><span class="ct-planet" style="--c:var(--ct-sun)">☉' + V + '</span><span class="ct-in">in</span><span class="ct-sign"></span><span class="ct-deg"></span><span class="ct-house"></span></div>' +
          '<span class="ct-sep" aria-hidden="true"></span>' +
          '<div class="ct-body ct-moon"><span class="ct-planet" style="--c:var(--ct-moon)">☽' + V + '</span><span class="ct-in">in</span><span class="ct-sign"></span><span class="ct-deg"></span><span class="ct-house"></span></div>' +
        '</div>' +
        '<div class="ct-astro-phase"></div>' +
        '<button type="button" class="ct-astro-city" title="Escolher cidade"><i class="ct-pin">⌖</i><span class="ct-city-name"></span><i class="ct-caret">▾</i></button>' +
      '</div>';
    var btn = host.querySelector('.ct-astro-city');
    btn.addEventListener('click', function(ev){ ev.stopPropagation(); openPicker(); });
    roots.push(host);
    return host;
  }
  function tzParts(date, tz){
    try {
      var f = new Intl.DateTimeFormat('pt-BR', { timeZone: tz, hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23', weekday:'long', day:'2-digit', month:'long', year:'numeric' });
      var o = {}; f.formatToParts(date).forEach(function(p){ o[p.type] = p.value; }); return o;
    } catch(e){ return null; }
  }
  function brWeekday(date){
    var f = new Intl.DateTimeFormat('en-US', { timeZone: BR, weekday:'short' }).format(date);
    return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(f);
  }
  var lastCalc = 0, calc = null;
  function compute(now){
    var jd = julian(now), sl = sunLon(jd), ml = moonLon(jd), cusps = houses(jd, city.lat, city.lon);
    calc = { sl: sl, ml: ml, sh: houseOf(sl, cusps), mh: houseOf(ml, cusps), phase: moonPhase(sl, ml), asc: cusps[1], mc: cusps[10] };
    lastCalc = now.getTime();
  }
  function render(){
    var now = new Date();
    var p = tzParts(now, BR) || {};
    var hh = p.hour || pad(now.getHours()), mm = p.minute || pad(now.getMinutes());
    var colonOn = now.getSeconds() % 2 === 0;
    if (!calc || now.getTime() - lastCalc > 20000) compute(now);
    var wd = brWeekday(now); if (wd < 0) wd = now.getDay();
    var d = DAYS[wd];
    var sd = dms(calc.sl), md = dms(calc.ml);
    var S = SIGNS[sd.sign], M = SIGNS[md.sign];
    var moonTitle = calc.phase.name + ' · ' + Math.round(calc.phase.illum) + '% iluminada';
    roots.forEach(function(r){
      if (!r.isConnected || r.offsetParent === null) return;
      r.querySelector('.ct-h').textContent = hh;
      r.querySelector('.ct-m').textContent = mm;
      r.querySelector('.ct-colon').style.opacity = colonOn ? '1' : '.25';
      var ds = r.querySelector('.ct-day-sym'); ds.textContent = d[1] + V; ds.style.setProperty('--c', 'var(--ct-' + d[2] + ')');
      r.querySelector('.ct-day-name').textContent = d[0];
      r.querySelector('.ct-day-name').title = 'Dia regido por ' + d[3];
      var sunEl = r.querySelector('.ct-sun'), moonEl = r.querySelector('.ct-moon');
      var sSign = sunEl.querySelector('.ct-sign'); sSign.textContent = S[1] + V; sSign.className = 'ct-sign el-' + S[2] + ' sign-' + ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'][sd.sign]; sSign.title = S[0];
      sunEl.querySelector('.ct-deg').textContent = pad(sd.deg) + '° ' + pad(sd.min) + "'";
      sunEl.querySelector('.ct-house').textContent = 'Casa ' + calc.sh;
      var mSign = moonEl.querySelector('.ct-sign'); mSign.textContent = M[1] + V; mSign.className = 'ct-sign el-' + M[2] + ' sign-' + ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'][md.sign]; mSign.title = M[0];
      moonEl.querySelector('.ct-deg').textContent = pad(md.deg) + '° ' + pad(md.min) + "'";
      moonEl.querySelector('.ct-house').textContent = 'Casa ' + calc.mh;
      sunEl.title = 'Sol em ' + S[0] + ' · ' + sd.deg + '°' + pad(sd.min) + "' · Casa " + calc.sh;
      moonEl.title = 'Lua em ' + M[0] + ' · ' + md.deg + '°' + pad(md.min) + "' · Casa " + calc.mh;
      var ph = r.querySelector('.ct-astro-phase');
      var key = calc.phase.name + '|' + Math.round(calc.phase.illum) + '|' + p.day + p.month + '|' + city.name;
      if (ph.dataset.k !== key) {
        ph.dataset.k = key;
        ph.innerHTML = '<span class="ct-phase-ico">' + moonSvg(calc.phase.elong) + '</span><span class="ct-phase-name">' + esc(calc.phase.name) + '</span><span class="ct-phase-dot">·</span><span class="ct-phase-pct">' + Math.round(calc.phase.illum) + '% iluminada</span>' +
          (p.day ? '<span class="ct-phase-dot">·</span><span class="ct-phase-date">' + esc(p.day) + ' de ' + esc(p.month) + ' de ' + esc(p.year) + '</span>' : '');
      }
      r.querySelector('.ct-city-name').textContent = city.name;
    });
  }
  function moonSvg(el){
    // disco com a parte iluminada desenhada conforme a elongação
    var r = 9, c = 10, k = cos(el), rx = Math.abs(k)*r, waxing = el < 180;
    var lit = 'var(--ct-moon)', dark = 'rgba(120,130,160,.28)';
    var big = (k > 0) ? 0 : 1; // gibosa: elipse do lado escuro
    var path;
    // terminador: arco elíptico entre polos
    var sweepOuter = waxing ? 1 : 0;
    var outer = 'M '+c+' '+(c-r)+' A '+r+' '+r+' 0 0 '+sweepOuter+' '+c+' '+(c+r);
    var termSweep = (waxing ? (k>0?0:1) : (k>0?1:0));
    var term = ' A '+rx.toFixed(2)+' '+r+' 0 0 '+termSweep+' '+c+' '+(c-r)+' Z';
    path = outer + term;
    return '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="'+dark+'"/><path d="'+path+'" fill="'+lit+'"/><circle cx="10" cy="10" r="9" fill="none" stroke="var(--ct-moon)" stroke-opacity=".55" stroke-width=".8"/></svg>';
  }

  /* ---------- Seletor de cidade ---------- */
  var picker;
  function closePicker(){ if (picker) { picker.remove(); picker = null; document.removeEventListener('keydown', onKey, true); } }
  function onKey(e){ if (e.key === 'Escape') closePicker(); }
  function setCity(c){ city = c; saveCity(c); calc = null; render(); try { var ev = document.createEvent('Event'); ev.initEvent('ct-astro-city-changed', true, true); window.dispatchEvent(ev); } catch(e){} }
  function nearest(lat, lon){
    var best = null, bd = 1e9;
    CITIES.forEach(function(c){ var d = Math.pow(c[1]-lat,2) + Math.pow((c[2]-lon)*cos(lat),2); if (d < bd){ bd = d; best = c; } });
    return best && Math.sqrt(bd) < 0.6 ? best : null; // ~65 km
  }
  function openPicker(){
    closePicker();
    var ov = document.createElement('div'); picker = ov; ov.className = 'ct-astro-overlay';
    ov.innerHTML =
      '<div class="ct-astro-modal" role="dialog" aria-label="Escolher cidade">' +
        '<div class="ct-astro-modal-head"><b>Local do mapa astral</b><button type="button" class="ct-x" aria-label="Fechar">✕</button></div>' +
        '<button type="button" class="ct-geo">⌖ Usar minha localização atual</button>' +
        '<input type="text" class="ct-search" placeholder="Buscar cidade da lista…" autocomplete="off">' +
        '<div class="ct-list"></div>' +
        '<details class="ct-custom"><summary>Outro local (coordenadas)</summary>' +
          '<div class="ct-custom-row"><input class="ct-c-name" placeholder="Nome do local"><input class="ct-c-lat" inputmode="decimal" placeholder="Latitude (-23.50)"><input class="ct-c-lon" inputmode="decimal" placeholder="Longitude (-47.45)"><button type="button" class="ct-c-ok">Usar</button></div>' +
        '</details>' +
        '<p class="ct-note">O horário exibido é sempre o de Brasília. A cidade define o Ascendente e as casas (sistema Placidus).</p>' +
      '</div>';
    document.body.appendChild(ov);
    document.addEventListener('keydown', onKey, true);
    ov.addEventListener('click', function(e){ if (e.target === ov) closePicker(); });
    ov.querySelector('.ct-x').addEventListener('click', closePicker);
    var list = ov.querySelector('.ct-list'), search = ov.querySelector('.ct-search');
    function fill(q){
      var n = (q||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      list.innerHTML = '';
      CITIES.filter(function(c){ return !n || c[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').indexOf(n) >= 0; }).forEach(function(c){
        var b = document.createElement('button'); b.type = 'button'; b.textContent = c[0]; if (c[0] === city.name) b.className = 'on';
        b.addEventListener('click', function(){ setCity({ name:c[0], lat:c[1], lon:c[2], tz:c[3] }); closePicker(); });
        list.appendChild(b);
      });
      if (!list.children.length) list.innerHTML = '<p class="ct-empty">Nenhuma cidade na lista — use “Outro local”.</p>';
    }
    fill(''); search.addEventListener('input', function(){ fill(search.value); });
    ov.querySelector('.ct-geo').addEventListener('click', function(){
      var b = this; if (!navigator.geolocation) { b.textContent = 'Geolocalização indisponível neste navegador'; return; }
      b.textContent = 'Buscando localização…';
      navigator.geolocation.getCurrentPosition(function(pos){
        var lat = pos.coords.latitude, lon = pos.coords.longitude, n = nearest(lat, lon);
        setCity(n ? { name:n[0], lat:lat, lon:lon, tz:n[3] } : { name:'Local atual (' + lat.toFixed(2) + ', ' + lon.toFixed(2) + ')', lat:lat, lon:lon, tz:BR });
        closePicker();
      }, function(){ b.textContent = 'Não foi possível obter — escolha na lista'; }, { enableHighAccuracy:false, timeout:9000, maximumAge:600000 });
    });
    ov.querySelector('.ct-c-ok').addEventListener('click', function(){
      var lat = parseFloat(String(ov.querySelector('.ct-c-lat').value).replace(',','.')), lon = parseFloat(String(ov.querySelector('.ct-c-lon').value).replace(',','.'));
      if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 89 || Math.abs(lon) > 180) { ov.querySelector('.ct-c-lat').focus(); return; }
      setCity({ name: ov.querySelector('.ct-c-name').value.trim() || ('Local (' + lat.toFixed(2) + ', ' + lon.toFixed(2) + ')'), lat:lat, lon:lon, tz:BR });
      closePicker();
    });
    setTimeout(function(){ search.focus(); }, 30);
  }

  window.addEventListener('storage', function(e){ if (e.key === KEY) { city = loadCity(); calc = null; render(); } });

  function init(){
    document.querySelectorAll('[data-ct-astro]').forEach(function(h){ if (!h.classList.contains('ct-astro')) build(h); });
    if (!roots.length) return;
    render();
    setInterval(function(){ if (!document.hidden) render(); }, 1000);
  }
  window.ctAstro = { init: init, compute: function(d){ var jd = julian(d||new Date()); return { sunLon: sunLon(jd), moonLon: moonLon(jd), houses: houses(jd, city.lat, city.lon) }; }, _h: houses, _sun: sunLon, _moon: moonLon, _jd: julian };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
