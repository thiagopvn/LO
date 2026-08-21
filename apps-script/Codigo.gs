/**
 * LIVRO DE ORDENS - GOCG
 * Leitura da planilha e entrega da pagina de consulta.
 *
 * Cada aba da planilha tem um formato proprio (uma tem Nº DO BOL/DATA/INTERESSE,
 * outra so tem o nome, o POP tem TIPO DO POP + NOME...). Por isso a leitura aqui
 * e feita por cabecalho: o script procura a linha que contem "NOME", descobre o
 * papel de cada coluna e so entao le os dados. Aba nova na planilha entra
 * sozinha no sistema, sem mexer no codigo.
 */

var PLANILHA_ID = '1Dfy5i1clsAMUVYQnOh6sPQo-vZwL5A4aoxnjabCpg7Q';

var CACHE_VERSAO  = 'v5';          // troque quando mudar o formato do acervo
var CACHE_MINUTOS = 360;           // 6 horas
var CACHE_PEDACO  = 90000;         // limite pratico por chave do CacheService

var FUSO = 'America/Sao_Paulo';


/* ============================================================
   ENTRADA DA APLICACAO WEB
   ============================================================ */

function doGet(e) {
  var parametros = (e && e.parameter) || {};

  // ?recarregar=1 forca releitura da planilha (usar depois de atualizar dados)
  if (parametros.recarregar) limparCache();

  var pagina = HtmlService.createTemplateFromFile('Dashboard');
  pagina.dadosJSON = obterAcervoJSON_();

  return pagina.evaluate()
    .setTitle('Livro de Ordens - CBMERJ')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


/**
 * Chamada pelo botao "Reler a planilha agora" (rodape da pagina) via
 * google.script.run. Devolve o mesmo JSON que a pagina recebe no carregamento,
 * ja com o cache renovado - por isso a pagina nao precisa ser recarregada.
 */
function recarregarAcervo() {
  limparCache();
  return obterAcervoJSON_();
}


/**
 * Limpa o cache do acervo. Pode ser rodada na mao pelo editor do Apps Script
 * (menu de funcoes -> limparCache -> Executar) ou pelo link no rodape da pagina.
 */
function limparCache() {
  var cache = CacheService.getScriptCache();
  var qtd = Number(cache.get(chaveIndice_()) || 0);
  var chaves = [chaveIndice_()];
  for (var i = 0; i < qtd; i++) chaves.push(chavePedaco_(i));
  cache.removeAll(chaves);
  return 'Cache limpo (' + qtd + ' pedacos).';
}


/* ============================================================
   CACHE
   ============================================================ */

function chaveIndice_()      { return 'lo_' + CACHE_VERSAO + '_indice'; }
function chavePedaco_(i)     { return 'lo_' + CACHE_VERSAO + '_' + i;   }

function obterAcervoJSON_() {
  var cache = CacheService.getScriptCache();
  var guardado = lerDoCache_(cache);
  if (guardado) return guardado;

  var json = JSON.stringify(montarAcervo_())
    // evita que qualquer "</script>" vindo da planilha quebre a pagina
    .replace(/</g, '\\u003c');

  gravarNoCache_(cache, json);
  return json;
}

function lerDoCache_(cache) {
  var qtd = Number(cache.get(chaveIndice_()) || 0);
  if (!qtd) return null;

  var chaves = [];
  for (var i = 0; i < qtd; i++) chaves.push(chavePedaco_(i));

  var mapa = cache.getAll(chaves);
  var texto = '';
  for (var j = 0; j < chaves.length; j++) {
    var parte = mapa[chaves[j]];
    if (parte == null) return null;   // pedaco expirou: refaz tudo
    texto += parte;
  }
  return texto;
}

function gravarNoCache_(cache, json) {
  try {
    var pedacos = {};
    var total = Math.ceil(json.length / CACHE_PEDACO);
    for (var i = 0; i < total; i++) {
      pedacos[chavePedaco_(i)] = json.substr(i * CACHE_PEDACO, CACHE_PEDACO);
    }
    pedacos[chaveIndice_()] = String(total);
    cache.putAll(pedacos, CACHE_MINUTOS * 60);
  } catch (erro) {
    // cache e conveniencia, nao requisito: se falhar, a pagina abre igual
    console.warn('Nao foi possivel gravar o cache: ' + erro);
  }
}


/* ============================================================
   LEITURA DA PLANILHA
   ============================================================ */

function montarAcervo_() {
  var planilha = SpreadsheetApp.openById(PLANILHA_ID);
  var colecoes = [];
  var registros = [];

  planilha.getSheets().forEach(function (aba) {
    if (aba.isSheetHidden()) return;

    var lido = lerAba_(aba, colecoes.length);
    if (!lido || !lido.itens.length) return;

    colecoes.push(lido.colecao);
    registros = registros.concat(lido.itens);
  });

  return {
    geradoEm: Utilities.formatDate(new Date(), FUSO, "dd/MM/yyyy 'as' HH:mm"),
    planilha: 'https://docs.google.com/spreadsheets/d/' + PLANILHA_ID + '/edit',
    colecoes: colecoes,
    registros: registros
  };
}

/**
 * Le uma aba inteira e devolve { colecao, itens }.
 *
 * Chaves curtas nos registros so para o JSON nao ficar gigante:
 *   c = indice da colecao   t = titulo      u = url
 *   b = nº do boletim       d = data (dd/MM/aaaa)   s = data em ms (ordenacao)
 *   a = ano                 i = interesse   p = tipo (POP)
 */
function lerAba_(aba, indice) {
  var intervalo = aba.getDataRange();
  if (intervalo.getNumRows() < 2) return null;

  var textos   = intervalo.getDisplayValues();
  var valores  = intervalo.getValues();
  var ricos    = intervalo.getRichTextValues();
  var formulas = intervalo.getFormulas();

  var linhaCabecalho = acharCabecalho_(textos);
  var colunas = {};
  var primeiraLinha;

  if (linhaCabecalho >= 0) {
    textos[linhaCabecalho].forEach(function (rotulo, c) {
      var papel = papelDaColuna_(rotulo);
      if (papel && colunas[papel] === undefined) colunas[papel] = c;
    });
    primeiraLinha = linhaCabecalho + 1;
  } else {
    // Abas sem cabecalho (MANUAIS): os dados comecam na primeira linha com link.
    primeiraLinha = primeiraLinhaComLink_(ricos, formulas);
  }
  if (colunas.titulo === undefined) colunas.titulo = 0;

  var itens = [];
  var campos = {};

  for (var r = primeiraLinha; r < textos.length; r++) {
    var titulo = limpar_(textos[r][colunas.titulo]);
    if (!titulo) continue;

    var item = { c: indice, t: titulo };

    var url = urlDaLinha_(ricos[r], formulas[r], colunas.titulo);
    if (url) item.u = url;

    if (colunas.boletim !== undefined) {
      var bol = limpar_(textos[r][colunas.boletim]);
      if (bol) { item.b = bol; campos.boletim = true; }
    }

    if (colunas.data !== undefined) {
      var data = valores[r][colunas.data];
      if (data instanceof Date) {
        item.d = Utilities.formatDate(data, FUSO, 'dd/MM/yyyy');
        item.s = data.getTime();
        item.a = data.getFullYear();
        campos.data = true;
      } else {
        var texto = limpar_(textos[r][colunas.data]);
        var partes = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (partes) {
          item.d = texto;
          item.s = new Date(+partes[3], +partes[2] - 1, +partes[1]).getTime();
          item.a = +partes[3];
          campos.data = true;
        } else if (texto) {
          item.d = texto;
          campos.data = true;
        }
      }
    }

    if (colunas.ano !== undefined) {
      var ano = limpar_(textos[r][colunas.ano]).match(/\d{4}/);
      if (ano) { item.a = +ano[0]; campos.ano = true; }
    }

    if (colunas.interesse !== undefined) {
      var interesse = limpar_(textos[r][colunas.interesse]).toUpperCase();
      if (interesse) { item.i = interesse; campos.interesse = true; }
    }

    if (colunas.tipo !== undefined) {
      var tipo = limpar_(textos[r][colunas.tipo]).toUpperCase();
      if (tipo) { item.p = tipo; campos.tipo = true; }
    }

    itens.push(item);
  }

  var colecao = {
    id: indice,
    nome: limpar_(aba.getName()).toUpperCase(),
    total: itens.length,
    campos: Object.keys(campos),
    semLink: itens.filter(function (i) { return !i.u; }).length
  };

  var conferido = ultimoBoletimConferido_(textos, linhaCabecalho);
  if (conferido) colecao.conferido = conferido;

  return { colecao: colecao, itens: itens };
}

/** Procura, nas primeiras linhas, a que funciona como cabecalho (tem "NOME"). */
function acharCabecalho_(textos) {
  var limite = Math.min(textos.length, 8);
  for (var l = 0; l < limite; l++) {
    for (var c = 0; c < textos[l].length; c++) {
      if (chave_(textos[l][c]) === 'nome') return l;
    }
  }
  return -1;
}

function papelDaColuna_(rotulo) {
  var k = chave_(rotulo);
  if (!k) return null;
  if (k === 'nome' || k === 'documento' || k === 'titulo') return 'titulo';
  if (k.indexOf('bol') >= 0)       return 'boletim';
  if (k.indexOf('data') >= 0)      return 'data';
  if (k.indexOf('interesse') >= 0) return 'interesse';
  if (k.indexOf('tipo') >= 0)      return 'tipo';
  if (k.indexOf('ano') >= 0)       return 'ano';
  return null;
}

function primeiraLinhaComLink_(ricos, formulas) {
  for (var r = 0; r < ricos.length; r++) {
    if (urlDaLinha_(ricos[r], formulas[r], 0)) return r;
  }
  return Math.min(2, ricos.length);  // sobra: pula titulo + subtitulo
}

/**
 * Pega o link da linha. Tenta primeiro a coluna do titulo e depois as demais,
 * cobrindo link colado no texto, link em parte do texto e =HYPERLINK().
 */
function urlDaLinha_(linhaRica, linhaFormulas, colunaTitulo) {
  var ordem = [colunaTitulo];
  for (var c = 0; c < linhaRica.length; c++) if (c !== colunaTitulo) ordem.push(c);

  for (var i = 0; i < ordem.length; i++) {
    var col = ordem[i];

    var rico = linhaRica[col];
    if (rico) {
      var url = rico.getLinkUrl();
      if (url) return url;

      var trechos = rico.getRuns();
      for (var t = 0; t < trechos.length; t++) {
        var parcial = trechos[t].getLinkUrl();
        if (parcial) return parcial;
      }
    }

    var formula = linhaFormulas[col] || '';
    var achado = formula.match(/HYPERLINK\s*\(\s*"([^"]+)"/i);
    if (achado) return achado[1];
  }
  return '';
}

/** Le o "DATA DO ULTIMO BOLETIM CONFERIDO ---->" que fica acima do cabecalho. */
function ultimoBoletimConferido_(textos, linhaCabecalho) {
  var limite = linhaCabecalho > 0 ? linhaCabecalho : Math.min(textos.length, 5);
  for (var l = 0; l < limite; l++) {
    var linha = textos[l];
    var temRotulo = false;
    for (var c = 0; c < linha.length; c++) {
      if (chave_(linha[c]).indexOf('ultimo boletim') >= 0) { temRotulo = true; continue; }
      if (temRotulo) {
        var valor = limpar_(linha[c]);
        if (valor && chave_(valor).indexOf('ultimo boletim') < 0) return valor;
      }
    }
  }
  return '';
}


/* ============================================================
   UTILITARIOS
   ============================================================ */

function limpar_(valor) {
  return String(valor == null ? '' : valor).replace(/\s+/g, ' ').trim();
}

/** minusculo, sem acento e sem pontuacao - usado para comparar rotulos. */
function chave_(valor) {
  return limpar_(valor)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


/* ============================================================
   DIAGNOSTICO - rode no editor para conferir a leitura das abas
   ============================================================ */

function conferirLeitura() {
  var acervo = montarAcervo_();
  acervo.colecoes.forEach(function (col) {
    console.log(
      col.nome + ': ' + col.total + ' registros | campos: ' +
      (col.campos.join(', ') || '-') +
      ' | sem link: ' + col.semLink +
      (col.conferido ? ' | conferido ate ' + col.conferido : '')
    );
  });
  console.log('TOTAL: ' + acervo.registros.length + ' registros em ' + acervo.colecoes.length + ' abas.');
}
