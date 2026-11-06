/* ==========================================================================
   Ctônia · Laboratório — Ortografia local (sem IA)
   Analisador de texto em português para o Manuscrito e para o Corretor Local.
   Não substitui um corretor completo: cobre acentuação de palavras comuns,
   repetições, espaçamento, pontuação, maiúsculas e frases longas.
   API: Ortografia.analisar(texto, opcoes) -> issues[]
        Ortografia.aplicar(texto, issues) -> texto corrigido
        Ortografia.resumo(issues) -> { tipo: quantidade }
   ========================================================================== */
(function (global) {
  'use strict';

  const TIPOS = {
    acento:    { label: 'Acentuação',  color: 'gold',    icon: 'fa-solid fa-italic' },
    repeticao: { label: 'Repetição',   color: 'magenta', icon: 'fa-solid fa-repeat' },
    espaco:    { label: 'Espaçamento', color: 'teal',    icon: 'fa-solid fa-arrows-left-right' },
    pontuacao: { label: 'Pontuação',   color: 'teal',    icon: 'fa-solid fa-quote-right' },
    maiuscula: { label: 'Maiúsculas',  color: 'violet',  icon: 'fa-solid fa-a' },
    frase:     { label: 'Frase longa', color: 'muted',   icon: 'fa-solid fa-text-width' }
  };

  // Palavras que costumam aparecer sem acento. Só entram as formas sem
  // ambiguidade real (por isso "esta", "e", "as" e "la" ficam de fora).
  const ACENTOS = {
    'voce': 'você', 'voces': 'vocês', 'nao': 'não', 'tambem': 'também',
    'alguem': 'alguém', 'ninguem': 'ninguém', 'porem': 'porém', 'entao': 'então',
    'estao': 'estão', 'sao': 'são', 'ja': 'já', 'so': 'só', 'ha': 'há',
    'ate': 'até', 'apos': 'após', 'tres': 'três', 'mes': 'mês',
    'mao': 'mão', 'maos': 'mãos', 'pao': 'pão', 'paes': 'pães',
    'cao': 'cão', 'caes': 'cães', 'irma': 'irmã', 'irmas': 'irmãs',
    'mae': 'mãe', 'maes': 'mães', 'cafe': 'café', 'cafes': 'cafés',
    'area': 'área', 'areas': 'áreas', 'agua': 'água', 'aguas': 'águas',
    'sera': 'será', 'tera': 'terá', 'fara': 'fará',
    'unico': 'único', 'unica': 'única', 'unicos': 'únicos', 'unicas': 'únicas',
    'ultimo': 'último', 'ultima': 'última', 'ultimos': 'últimos', 'ultimas': 'últimas',
    'proximo': 'próximo', 'proxima': 'próxima', 'proximos': 'próximos', 'proximas': 'próximas',
    'proprio': 'próprio', 'propria': 'própria', 'proprios': 'próprios', 'proprias': 'próprias',
    'otimo': 'ótimo', 'otima': 'ótima', 'otimos': 'ótimos', 'otimas': 'ótimas',
    'pessimo': 'péssimo', 'pessima': 'péssima', 'pessimos': 'péssimos', 'pessimas': 'péssimas',
    'minimo': 'mínimo', 'minima': 'mínima', 'maximo': 'máximo', 'maxima': 'máxima',
    'publico': 'público', 'publica': 'pública', 'publicos': 'públicos', 'publicas': 'públicas',
    'musica': 'música', 'musicas': 'músicas', 'pagina': 'página', 'paginas': 'páginas',
    'capitulo': 'capítulo', 'capitulos': 'capítulos', 'titulo': 'título', 'titulos': 'títulos',
    'paragrafo': 'parágrafo', 'paragrafos': 'parágrafos', 'simbolo': 'símbolo', 'simbolos': 'símbolos',
    'numero': 'número', 'numeros': 'números', 'calculo': 'cálculo', 'calculos': 'cálculos',
    'angulo': 'ângulo', 'angulos': 'ângulos', 'circulo': 'círculo', 'circulos': 'círculos',
    'triangulo': 'triângulo', 'triangulos': 'triângulos',
    'magico': 'mágico', 'magica': 'mágica', 'magicos': 'mágicos', 'magicas': 'mágicas',
    'logico': 'lógico', 'logica': 'lógica', 'critico': 'crítico', 'critica': 'crítica',
    'classico': 'clássico', 'classica': 'clássica', 'fisico': 'físico', 'fisica': 'física',
    'medico': 'médico', 'medica': 'médica', 'tecnico': 'técnico', 'tecnica': 'técnica',
    'pratico': 'prático', 'pratica': 'prática', 'basico': 'básico', 'basica': 'básica',
    'possivel': 'possível', 'possiveis': 'possíveis', 'dificil': 'difícil', 'dificeis': 'difíceis',
    'facil': 'fácil', 'faceis': 'fáceis', 'util': 'útil', 'uteis': 'úteis',
    'fragil': 'frágil', 'frageis': 'frágeis', 'agil': 'ágil', 'ageis': 'ágeis',
    'portatil': 'portátil', 'portateis': 'portáteis', 'movel': 'móvel', 'moveis': 'móveis',
    'nivel': 'nível', 'niveis': 'níveis', 'fiel': 'fiel', 'fieis': 'fiéis',
    'hotel': 'hotel', 'hoteis': 'hotéis', 'anel': 'anel', 'aneis': 'anéis',
    'orgao': 'órgão', 'orgaos': 'órgãos', 'orfao': 'órfão', 'orfaos': 'órfãos',
    'conteudo': 'conteúdo', 'conteudos': 'conteúdos', 'video': 'vídeo', 'videos': 'vídeos',
    'audio': 'áudio', 'audios': 'áudios',
    'historia': 'história', 'historias': 'histórias', 'memoria': 'memória', 'memorias': 'memórias',
    'gloria': 'glória', 'glorias': 'glórias', 'vitoria': 'vitória', 'vitorias': 'vitórias',
    'familia': 'família', 'familias': 'famílias', 'experiencia': 'experiência', 'experiencias': 'experiências',
    'ciencia': 'ciência', 'ciencias': 'ciências', 'consciencia': 'consciência', 'consciencias': 'consciências',
    'paciencia': 'paciência', 'frequencia': 'frequência', 'consequencia': 'consequência', 'consequencias': 'consequências',
    'influencia': 'influência', 'referencia': 'referência', 'referencias': 'referências',
    'presenca': 'presença', 'presencas': 'presenças', 'ausencia': 'ausência',
    'essencia': 'essência', 'diferenca': 'diferença', 'diferencas': 'diferenças',
    'seguranca': 'segurança', 'confianca': 'confiança', 'esperanca': 'esperança',
    'crianca': 'criança', 'criancas': 'crianças', 'danca': 'dança', 'dancas': 'danças',
    'mudanca': 'mudança', 'mudancas': 'mudanças', 'lembranca': 'lembrança', 'lembrancas': 'lembranças',
    'alianca': 'aliança', 'aliancas': 'alianças', 'heranca': 'herança', 'herancas': 'heranças',
    'amanha': 'amanhã',
    'coracao': 'coração', 'coracoes': 'corações', 'cancao': 'canção', 'cancoes': 'canções',
    'revisao': 'revisão', 'revisoes': 'revisões', 'decisao': 'decisão', 'decisoes': 'decisões',
    'visao': 'visão', 'visoes': 'visões', 'missao': 'missão', 'missoes': 'missões',
    'paixao': 'paixão', 'paixoes': 'paixões', 'criacao': 'criação', 'criacoes': 'criações',
    'edicao': 'edição', 'edicoes': 'edições', 'eleicao': 'eleição', 'eleicoes': 'eleições',
    'informacao': 'informação', 'informacoes': 'informações', 'imaginacao': 'imaginação',
    'construcao': 'construção', 'construcoes': 'construções',
    'lingua': 'língua', 'linguas': 'línguas', 'ambigua': 'ambígua', 'ambiguas': 'ambíguas',
    'disponivel': 'disponível', 'disponiveis': 'disponíveis', 'acessivel': 'acessível',
    'responsavel': 'responsável', 'flexivel': 'flexível', 'incrivel': 'incrível',
    'visivel': 'visível', 'invisivel': 'invisível', 'possibilidade': 'possibilidade',
    'excecao': 'exceção', 'excecoes': 'exceções', 'privilégio': 'privilégio', 'previlegio': 'privilégio'
  };

  const ERROS = {
    'concerteza': 'com certeza', 'derrepente': 'de repente', 'porisso': 'por isso',
    'apartir': 'a partir', 'excessao': 'exceção', 'previlégio': 'privilégio',
    'beneficiente': 'beneficente', 'menas': 'menos', 'seje': 'seja', 'esteje': 'esteja',
    'imprecionante': 'impressionante', 'reinvindicar': 'reivindicar',
    'prosseguir': 'prosseguir', 'advinhar': 'adivinhar', 'entrar em contato': 'entrar em contato'
  };

  const PALAVRAS_MAP = new Map();
  const IGNORADAS = new Set();

  function normalizar(palavra) {
    return palavra.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  Object.keys(ACENTOS).forEach(chave => {
    if (ACENTOS[chave] !== chave) PALAVRAS_MAP.set(chave, ACENTOS[chave]);
  });
  Object.keys(ERROS).forEach(chave => {
    if (ERROS[chave] !== chave) PALAVRAS_MAP.set(chave, ERROS[chave]);
  });

  function preservarCaixa(original, sugestao) {
    if (original.length > 2 && original === original.toUpperCase()) return sugestao.toUpperCase();
    if (/^[\p{Lu}]/u.test(original)) return sugestao.charAt(0).toUpperCase() + sugestao.slice(1);
    return sugestao;
  }

  function issue(start, end, tipo, mensagem, sugestao, seguro) {
    return {
      start,
      end,
      tipo,
      mensagem,
      sugestao: sugestao == null ? null : sugestao,
      seguro: !!seguro
    };
  }

  function analisar(texto, opcoes) {
    const opts = opcoes || {};
    const regras = Object.assign({
      acento: true, repeticao: true, espaco: true, pontuacao: true,
      maiuscula: true, frase: true
    }, opts.regras || {});
    const ignorar = new Set((opts.ignorar || []).map(p => p.toLowerCase()));
    const issues = [];
    if (!texto || !texto.trim()) return issues;

    // 1. Espaços repetidos
    if (regras.espaco) {
      const re = /[ \t]{2,}/g;
      let m;
      while ((m = re.exec(texto))) {
        issues.push(issue(m.index, m.index + m[0].length, 'espaco', 'Espaço duplicado.', ' ', true));
      }
      const reInicio = /(^|\n)[ \t]+/g;
      while ((m = reInicio.exec(texto))) {
        const start = m.index + m[1].length;
        issues.push(issue(start, start + m[0].length - m[1].length, 'espaco', 'Recuo desnecessário no começo da linha.', '', true));
      }
    }

    // 2. Espaço antes de pontuação
    if (regras.pontuacao) {
      const re = /[ \t]+([,.;:!?…])/g;
      let m;
      while ((m = re.exec(texto))) {
        issues.push(issue(m.index, m.index + m[0].length, 'pontuacao', 'Não se usa espaço antes da pontuação.', m[1], true));
      }
      // Pontuação repetida (!!!, ??, ,,,) — reticências ficam de fora
      const reRep = /([!?;,])\1+/g;
      while ((m = reRep.exec(texto))) {
        issues.push(issue(m.index, m.index + m[0].length, 'pontuacao', 'Pontuação repetida.', m[1], true));
      }
      // Falta de espaço depois de vírgula, ponto e vírgula, dois-pontos e exclamação/interrogação
      const reFalta = /([,;:!?])(?=[\p{L}])/gu;
      while ((m = reFalta.exec(texto))) {
        issues.push(issue(m.index, m.index + 1, 'pontuacao', 'Falta um espaço depois da pontuação.', m[1] + ' ', true));
      }
    }

    // 3. Palavras repetidas
    if (regras.repeticao) {
      const re = /\b([\p{L}]{2,})\b([ \t,;:]+)\1\b/giu;
      let m;
      while ((m = re.exec(texto))) {
        issues.push(issue(m.index, m.index + m[0].length, 'repeticao', 'Palavra repetida: “' + m[1] + '”.', preservarCaixa(m[1], m[1]), true));
      }
    }

    // 4. Acentuação e erros frequentes
    if (regras.acento) {
      const re = /[\p{L}]+/gu;
      let m;
      while ((m = re.exec(texto))) {
        const palavra = m[0];
        if (palavra.length < 2) continue;
        const chave = palavra.toLowerCase();
        if (ignorar.has(chave)) continue;
        const sugestao = PALAVRAS_MAP.get(normalizar(palavra));
        if (!sugestao) continue;
        if (sugestao.toLowerCase() === chave) continue;
        const corrigida = preservarCaixa(palavra, sugestao);
        issues.push(issue(m.index, m.index + palavra.length, 'acento', 'Grafia provável: “' + corrigida + '”.', corrigida, true));
      }
    }

    // 5. Início de frase em minúscula
    if (regras.maiuscula) {
      const re = /(^|[.!?…]["'”’»)\]]?\s+)([\p{Ll}])/gu;
      let m;
      while ((m = re.exec(texto))) {
        const start = m.index + m[1].length;
        const letra = m[2];
        issues.push(issue(start, start + 1, 'maiuscula', 'Início de frase pede maiúscula.', letra.toUpperCase(), true));
      }
    }

    // 6. Frases muito longas (estilo, não corrige sozinho)
    if (regras.frase) {
      const re = /[^.!?…]+[.!?…]*/g;
      let m;
      while ((m = re.exec(texto))) {
        const bruto = m[0];
        if (!bruto.trim()) continue;
        const palavras = bruto.match(/[\p{L}\p{N}]+/gu) || [];
        if (palavras.length <= 38) continue;
        const inicio = m.index + bruto.indexOf(bruto.trim());
        const fim = m.index + bruto.trimEnd().length;
        issues.push(issue(inicio, fim, 'frase', 'Frase com ' + palavras.length + ' palavras — considere dividir.', null, false));
      }
    }

    // Remove sobreposições (mantém a primeira ocorrência). Avisos de frase
    // longa são panorâmicos: não podem esconder os achados pontuais dentro deles.
    issues.sort((a, b) => a.start - b.start || a.end - b.end);
    const limpos = [];
    let ultimoFim = -1;
    issues.forEach(item => {
      if (item.tipo === 'frase') {
        limpos.push(item);
        return;
      }
      if (item.start >= ultimoFim) {
        limpos.push(item);
        ultimoFim = item.end;
      }
    });
    return limpos.sort((a, b) => a.start - b.start || a.end - b.end);
  }

  function aplicar(texto, issues) {
    const seguras = (issues || [])
      .filter(i => i && i.seguro && i.sugestao != null)
      .sort((a, b) => b.start - a.start);
    let resultado = texto;
    seguras.forEach(i => {
      resultado = resultado.slice(0, i.start) + i.sugestao + resultado.slice(i.end);
    });
    return resultado;
  }

  function resumo(issues) {
    const out = {};
    (issues || []).forEach(i => { out[i.tipo] = (out[i.tipo] || 0) + 1; });
    return out;
  }

  global.Ortografia = {
    analisar,
    aplicar,
    resumo,
    TIPOS,
    normalizar
  };
})(window);
