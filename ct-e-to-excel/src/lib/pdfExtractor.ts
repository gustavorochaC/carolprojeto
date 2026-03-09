import * as pdfjsLib from 'pdfjs-dist';
import type { CTeExtractedData } from './types';

// Configure PDF.js worker locally
pdfjsLib.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdfjs/3.11.174/pdf.worker.min.js`;

// ============================================================================
// TIPOS INTERNOS
// ============================================================================

interface TextToken {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TextLine {
  y: number;
  tokens: TextToken[];
  text: string;
}

interface ExtractionContext {
  lines: TextLine[];
  fullText: string;
  tokens: TextToken[];
}

// ============================================================================
// FUNÇÕES DE PARSING (SANITIZAÇÃO)
// ============================================================================

export const sanitizeChaveAcesso = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  return digits.length === 44 ? digits : '';
};

export const parseMoneyPtBrToNumber = (raw: string): number => {
  if (!raw) return 0;
  let clean = raw.replace(/[^\d,\.]/g, '');
  
  if (clean.includes(',') && clean.includes('.')) {
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');
    if (lastComma > lastDot) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      clean = clean.replace(/,/g, '');
    }
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  } else if (clean.includes('.')) {
    const lastDot = clean.lastIndexOf('.');
    if (lastDot === clean.length - 3) {
      const integerPart = clean.slice(0, lastDot).replace(/\./g, '');
      const decimalPart = clean.slice(lastDot + 1);
      clean = `${integerPart}.${decimalPart}`;
    } else {
      clean = clean.replace(/\./g, '');
    }
  }
  
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

export const sanitizeNumeroCTe = (raw: string): string => {
  return raw.replace(/\D/g, '');
};

// ============================================================================
// CONSTRUÇÃO DE LINHAS COM COORDENADAS
// ============================================================================

const buildLines = (items: any[]): TextLine[] => {
  if (!items || items.length === 0) return [];
  
  // Extrair tokens com coordenadas
  const tokens: TextToken[] = items
    .filter((item: any) => item.str && item.str.trim())
    .map((item: any) => ({
      str: item.str,
      x: item.transform[4],
      y: item.transform[5],
      width: item.width || 0,
      height: item.height || 0,
    }));
  
  if (tokens.length === 0) return [];
  
  // Agrupar por Y (tolerância de 5 pontos)
  const Y_TOLERANCE = 5;
  const lineGroups: Map<number, TextToken[]> = new Map();
  
  tokens.forEach(token => {
    let foundY: number | null = null;
    
    for (const existingY of lineGroups.keys()) {
      if (Math.abs(token.y - existingY) < Y_TOLERANCE) {
        foundY = existingY;
        break;
      }
    }
    
    if (foundY !== null) {
      lineGroups.get(foundY)!.push(token);
    } else {
      lineGroups.set(token.y, [token]);
    }
  });
  
  // Converter para array de linhas, ordenar tokens por X
  const lines: TextLine[] = [];
  
  lineGroups.forEach((lineTokens, y) => {
    // Ordenar tokens por X (esquerda para direita)
    lineTokens.sort((a, b) => a.x - b.x);
    
    lines.push({
      y,
      tokens: lineTokens,
      text: lineTokens.map(t => t.str).join(' '),
    });
  });
  
  // Ordenar linhas por Y decrescente (topo para baixo no PDF)
  lines.sort((a, b) => b.y - a.y);
  
  return lines;
};

// ============================================================================
// FUNÇÕES DE BUSCA POR ÂNCORAS
// ============================================================================

/**
 * Encontra o índice da linha que contém a âncora
 */
const findLineIndexByAnchor = (lines: TextLine[], anchor: RegExp): number => {
  return lines.findIndex(line => anchor.test(line.text));
};

/**
 * Encontra a linha que contém a âncora
 */
const findLineByAnchor = (lines: TextLine[], anchor: RegExp): TextLine | null => {
  const idx = findLineIndexByAnchor(lines, anchor);
  return idx >= 0 ? lines[idx] : null;
};

/**
 * Extrai texto após a âncora na mesma linha
 */
const extractAfterAnchorInLine = (line: TextLine, anchor: RegExp): string => {
  const match = line.text.match(anchor);
  if (!match) return '';
  
  const afterAnchor = line.text.slice(match.index! + match[0].length).trim();
  return afterAnchor;
};

/**
 * Extrai um bloco de linhas entre duas âncoras
 */
const extractBlock = (
  lines: TextLine[],
  startAnchor: RegExp,
  endAnchors: RegExp[],
  maxLines: number = 20
): TextLine[] => {
  const startIdx = findLineIndexByAnchor(lines, startAnchor);
  if (startIdx < 0) return [];
  
  const block: TextLine[] = [];
  
  for (let i = startIdx; i < Math.min(startIdx + maxLines, lines.length); i++) {
    const line = lines[i];
    
    // Verificar se chegou em uma âncora de fim
    if (i > startIdx && endAnchors.some(anchor => anchor.test(line.text))) {
      break;
    }
    
    block.push(line);
  }
  
  return block;
};

/**
 * Busca um valor próximo a uma âncora (mesma linha ou próximas)
 */
const findValueNearAnchor = (
  lines: TextLine[],
  anchor: RegExp,
  valuePattern: RegExp,
  searchLines: number = 3
): string => {
  const anchorIdx = findLineIndexByAnchor(lines, anchor);
  if (anchorIdx < 0) return '';
  
  // Buscar na linha da âncora e nas próximas
  for (let i = anchorIdx; i < Math.min(anchorIdx + searchLines, lines.length); i++) {
    const match = lines[i].text.match(valuePattern);
    if (match) return match[1] || match[0];
  }
  
  return '';
};

// ============================================================================
// EXTRAÇÃO POR BLOCOS/ZONAS
// ============================================================================

/**
 * Extrai a data de emissão (DD/MM/YYYY)
 */
const extractData = (ctx: ExtractionContext): string => {
  // Padrão 1: DATA E HORA DE EMISSÃO seguido de data
  const patterns = [
    /DATA\s+E\s+HORA\s+DE\s+EMISS[ÃA]O[^\d]*(\d{2}\/\d{2}\/\d{4})/i,
    /DATA\s+DE\s+EMISS[ÃA]O[^\d]*(\d{2}\/\d{2}\/\d{4})/i,
    /EMISS[ÃA]O[^\d]*(\d{2}\/\d{2}\/\d{4})/i,
  ];
  
  for (const pattern of patterns) {
    const match = ctx.fullText.match(pattern);
    if (match) return match[1];
  }
  
  // Fallback: primeira data encontrada
  const dateMatch = ctx.fullText.match(/(\d{2}\/\d{2}\/\d{4})/);
  return dateMatch ? dateMatch[1] : '';
};

/**
 * Extrai o número do CT-e
 */
const extractNumeroCTe = (ctx: ExtractionContext): string => {
  // Buscar "NÚMERO" seguido de dígitos
  const patterns = [
    /N[ÚU]MERO\s*[:.]?\s*(\d+)/i,
    /N[ºo°\s]*DOCUMENTO[:\s]*(\d+)/i,
    /CT-?e\s*n[°ºo]?[:\s]*(\d+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = ctx.fullText.match(pattern);
    if (match) return sanitizeNumeroCTe(match[1]);
  }
  
  return '';
};

/**
 * Extrai a chave de acesso (44 dígitos)
 */
const extractChaveAcesso = (ctx: ExtractionContext): string => {
  const pattern = /(\d{4}[\s\.]?\d{4}[\s\.]?\d{4}[\s\.]?\d{4}[\s\.]?\d{4}[\s\.]?\d{4}[\s\.]?\d{4}[\s\.]?\d{4}[\s\.]?\d{4}[\s\.]?\d{4}[\s\.]?\d{4})/;
  const match = ctx.fullText.match(pattern);
  return match ? sanitizeChaveAcesso(match[1]) : '';
};

/**
 * Extrai a transportadora.
 * Ordem de tentativas:
 * 1. TOMADOR DO SERVIÇO (layout TRANSAÇO TRANSPORTE LTDA)
 * 2. TRANSPORTADOR (layout genérico)
 * 3. EMITENTE (fallback)
 */
const extractTransportadora = (ctx: ExtractionContext): string => {
  const anchors = [
    /TOMADOR\s+DO\s+SERVI[ÇC]O/i,
    /TRANSPORTADOR/i,
    /EMITENTE/i,
  ];

  for (const anchor of anchors) {
    const block = extractBlock(
      ctx.lines,
      anchor,
      [/CNPJ/i, /ENDERE[ÇC]O/i, /IE\b/i, /REMETENTE/i, /DESTINAT/i, /RECEBEDOR/i],
      5
    );

    if (block.length > 0) {
      const firstLine = block[0];
      let name = extractAfterAnchorInLine(firstLine, anchor);

      // Se não achou na mesma linha, tentar próxima linha
      if (!name && block.length > 1) {
        name = block[1].text.trim();
      }

      // Limpar sufixos comuns (CNPJ, endereço, etc.)
      name = name.replace(/\s*(CNPJ|ENDERE|IE\b|CPF).*$/i, '').trim();
      if (name && name.length > 3) {
        console.log(`[Transportadora] Encontrado via âncora "${anchor.source}": "${name}"`);
        return name;
      }
    }
  }

  // Fallback com regex no texto completo
  const match = ctx.fullText.match(/(?:TOMADOR\s+DO\s+SERVI[ÇC]O|TRANSPORTADOR|EMITENTE)[^A-ZÀ-Ú]*([A-ZÀ-Ú][A-ZÀ-Ú\s]+(?:LTDA|S\.?A\.?|EIRELI|TRANSPORTES?))/i);
  return match ? match[1].trim() : '';
};

/**
 * Extrai a origem (REMETENTE)
 */
const extractOrigem = (ctx: ExtractionContext): string => {
  const block = extractBlock(
    ctx.lines,
    /REMETENTE/i,
    [/ENDERE[ÇC]O/i, /CNPJ/i, /CPF/i, /DESTINAT/i, /MUNIC[ÍI]PIO/i],
    5
  );
  
  if (block.length > 0) {
    const firstLine = block[0];
    let name = extractAfterAnchorInLine(firstLine, /REMETENTE\s*/i);
    
    // Se não achou na mesma linha, tentar próxima
    if (!name && block.length > 1) {
      name = block[1].text.trim();
    }
    
    // Limpar sufixos
    name = name.replace(/\s*(ENDERE|CNPJ|CPF|IE|FONE|CEP).*$/i, '').trim();
    
    // Evitar pegar labels errados
    if (name && !name.match(/^(VALOR|NOME|ENDERECO|CNPJ)/i) && name.length > 3) {
      return name;
    }
  }
  
  // Fallback regex
  const match = ctx.fullText.match(/REMETENTE[^A-ZÀ-Ú]{0,30}([A-ZÀ-Ú][A-ZÀ-Ú\s]+(?:LTDA|S\.?A\.?|EIRELI|ME|EPP))/i);
  return match ? match[1].trim() : '';
};

/**
 * Extrai o cliente (DESTINATÁRIO)
 */
const extractCliente = (ctx: ExtractionContext): string => {
  const block = extractBlock(
    ctx.lines,
    /DESTINAT[ÁA]RIO/i,
    [/ENDERE[ÇC]O/i, /CNPJ/i, /CPF/i, /MUNIC[ÍI]PIO/i, /EXPEDIDOR/i, /RECEBEDOR/i],
    5
  );
  
  if (block.length > 0) {
    const firstLine = block[0];
    let name = extractAfterAnchorInLine(firstLine, /DESTINAT[ÁA]RIO\s*/i);
    
    // Se não achou na mesma linha, tentar próxima
    if (!name && block.length > 1) {
      name = block[1].text.trim();
    }
    
    // Limpar sufixos
    name = name.replace(/\s*(ENDERE|CNPJ|CPF|IE|FONE|CEP).*$/i, '').trim();
    
    // Evitar pegar labels errados
    if (name && !name.match(/^(VALOR|NOME|ENDERECO|CNPJ)/i) && name.length > 3) {
      return name;
    }
  }
  
  // Fallback regex
  const match = ctx.fullText.match(/DESTINAT[ÁA]RIO[^A-ZÀ-Ú]{0,30}([A-ZÀ-Ú][A-ZÀ-Ú\s]+(?:LTDA|S\.?A\.?|EIRELI|ME|EPP|CIA|COMPANHIA))/i);
  return match ? match[1].trim() : '';
};

/**
 * Extrai localidade e UF do bloco DESTINATÁRIO.
 * Problema conhecido: tokens do município podem vir quebrados em vários TextToken
 * na mesma linha Y (ex: "SAO", "BERNARDO", "DO", "CAMPO"). A solução é usar
 * buildLines() que já agrupa por Y, então line.text já tem tudo concatenado.
 */
const extractLocalidadeUF = (ctx: ExtractionContext): { localidade: string; uf: string } => {
  const destIdx = findLineIndexByAnchor(ctx.lines, /DESTINAT[ÁA]RIO/i);
  if (destIdx < 0) return { localidade: '', uf: '' };

  // Buscar MUNICÍPIO nas próximas linhas do bloco destinatário
  for (let i = destIdx; i < Math.min(destIdx + 20, ctx.lines.length); i++) {
    const line = ctx.lines[i];

    // Padrão: linha contém "MUNICÍPIO" e o nome da cidade está no restante
    if (!/MUNIC[ÍI]PIO/i.test(line.text)) continue;

    // Extrair nome da cidade — tudo após "MUNICÍPIO" até UF, CEP ou fim de linha
    const munMatch = line.text.match(/MUNIC[ÍI]PIO\s+(.+?)(?:\s+(?:CEP|UF|PAIS|PA[ÍI]S)\b|$)/i);
    if (!munMatch) continue;

    // Todos os tokens da linha com X >= X da âncora MUNICÍPIO já estão concatenados em line.text
    // Limpar o nome da cidade: remover números (CEP acidental), caracteres especiais
    const rawCity = munMatch[1].trim().replace(/\d{5}-?\d{3}.*$/, '').trim();
    const localidade = rawCity.replace(/\s{2,}/g, ' ').trim();

    // Buscar UF na mesma linha ou nas próximas 3 linhas
    let uf = '';
    const ufInLine = line.text.match(/\bUF\s+([A-Z]{2})\b/i);
    if (ufInLine) {
      uf = ufInLine[1].toUpperCase();
    } else {
      for (let j = i; j < Math.min(i + 4, ctx.lines.length); j++) {
        const ufMatch = ctx.lines[j].text.match(/\bUF\s+([A-Z]{2})\b/i);
        if (ufMatch) {
          uf = ufMatch[1].toUpperCase();
          break;
        }
      }
    }

    if (localidade.length > 1) {
      console.log(`[Localidade] "${localidade}" / UF: "${uf}"`);
      return { localidade, uf };
    }
  }

  // Fallback: regex no texto completo
  const fallback = ctx.fullText.match(/MUNIC[ÍI]PIO\s+([A-ZÀ-Ú][A-ZÀ-Ú\s]+?)\s+(?:UF\s+)?([A-Z]{2})(?:\s|$)/i);
  if (fallback) {
    return {
      localidade: fallback[1].trim(),
      uf: fallback[2].toUpperCase(),
    };
  }

  return { localidade: '', uf: '' };
};

/**
 * Extrai o Valor Total da Carga (Valor_NF)
 */
const extractValorNF = (ctx: ExtractionContext): number => {
  const patterns = [
    /VALOR\s+TOTAL\s+(?:DA\s+)?CARGA\D{0,30}(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
    /VALOR\s+(?:DA\s+)?CARGA\D{0,30}(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
  ];
  
  for (const pattern of patterns) {
    const match = ctx.fullText.match(pattern);
    if (match) return parseMoneyPtBrToNumber(match[1]);
  }
  
  return 0;
};

/**
 * Extrai o Valor a Receber (Cobrança CTE)
 */
const extractCobrancaCTE = (ctx: ExtractionContext): number => {
  const patterns = [
    /VALOR\s+A\s+RECEBER\D{0,30}(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
    /(?:A\s+)?RECEBER\D{0,30}(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
  ];
  
  for (const pattern of patterns) {
    const match = ctx.fullText.match(pattern);
    if (match) return parseMoneyPtBrToNumber(match[1]);
  }
  
  return 0;
};

/**
 * Extrai o Valor Frete (componente)
 */
const extractValorFrete = (ctx: ExtractionContext): number => {
  const patterns = [
    /VALOR\s+FRETE\D{0,30}(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
    /FRETE\s*R?\$?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
  ];
  
  for (const pattern of patterns) {
    const match = ctx.fullText.match(pattern);
    if (match) return parseMoneyPtBrToNumber(match[1]);
  }
  
  return 0;
};

/**
 * Extrai o Frete Total (soma componentes ou Total Prestação)
 */
const extractFreteTotal = (ctx: ExtractionContext): number => {
  const patterns = [
    /(?:VALOR\s+)?TOTAL\s+(?:DA\s+)?PRESTA[ÇC][ÃA]O\s+(?:DO\s+SERVI[ÇC]O\s+)?[:\s]*R?\$?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
    /TOTAL\s+DA\s+PRESTA[ÇC][ÃA]O\D{0,30}(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
  ];
  
  for (const pattern of patterns) {
    const match = ctx.fullText.match(pattern);
    if (match) return parseMoneyPtBrToNumber(match[1]);
  }
  
  return 0;
};

/**
 * Extrai Frete c/ ICMS.
 * Estratégia:
 * 1. Busca direta por "VALOR TOTAL DA PRESTAÇÃO DO SERVIÇO" (layout TRANSAÇO)
 * 2. Fallback: calcula base * (1 + aliq/100) se encontrar base e alíquota
 */
const extractFretecICMS = (ctx: ExtractionContext): number => {
  // 1. Busca direta no texto completo
  const directPatterns = [
    /VALOR\s+TOTAL\s+DA\s+PRESTA[ÇC][ÃA]O\s+DO\s+SERVI[ÇC]O[:\s]*R?\$?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
    /TOTAL\s+DA\s+PRESTA[ÇC][ÃA]O[:\s]*R?\$?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
  ];

  for (const pattern of directPatterns) {
    const match = ctx.fullText.match(pattern);
    if (match) {
      const val = parseMoneyPtBrToNumber(match[1]);
      console.log(`[Frete_c_ICMS] Encontrado via "${pattern.source}": ${val}`);
      return val;
    }
  }

  // 2. Busca por âncora em linha (multi-linha: label numa linha, valor na próxima)
  const anchorIdx = findLineIndexByAnchor(ctx.lines, /TOTAL\s+DA\s+PRESTA[ÇC][ÃA]O/i);
  if (anchorIdx >= 0) {
    for (let i = anchorIdx; i < Math.min(anchorIdx + 3, ctx.lines.length); i++) {
      const moneyMatch = ctx.lines[i].text.match(/(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/);
      if (moneyMatch) {
        const val = parseMoneyPtBrToNumber(moneyMatch[1]);
        console.log(`[Frete_c_ICMS] Encontrado via âncora de linha: ${val}`);
        return val;
      }
    }
  }

  // 3. Fallback: cálculo base * (1 + aliq/100)
  const baseMatch = ctx.fullText.match(/BASE\s+DE\s+C[ÁA]LCULO\s+(?:DO\s+)?ICMS[:\s]*R?\$?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i);
  const aliqMatch = ctx.fullText.match(/AL[ÍI]QUOTA\s+(?:DO\s+)?ICMS[:\s]*([0-9]{1,2}(?:[\.,]\d+)?)\s*%/i);

  const base = baseMatch ? parseMoneyPtBrToNumber(baseMatch[1]) : 0;
  const aliq = aliqMatch ? parseFloat(aliqMatch[1].replace(',', '.')) : 0;

  if (base > 0) {
    const val = base * (1 + aliq / 100);
    console.log(`[Frete_c_ICMS] Calculado via base/alíquota: ${val}`);
    return val;
  }

  console.log('[Frete_c_ICMS] Não encontrado');
  return 0;
};

/**
 * Extrai a Nota Fiscal (Série/Nº Documento)
 */
const extractNotaFiscal = (ctx: ExtractionContext): string => {
  // Buscar no bloco "DOCUMENTOS ORIGINÁRIOS"
  const docsIdx = findLineIndexByAnchor(ctx.lines, /DOCUMENTOS?\s+ORIGIN[ÁA]RIOS?/i);
  
  if (docsIdx >= 0) {
    // Buscar padrão ddd/ddddddddd nas próximas linhas
    for (let i = docsIdx; i < Math.min(docsIdx + 10, ctx.lines.length); i++) {
      const match = ctx.lines[i].text.match(/(\d{1,3})\s*\/\s*(\d{5,12})/);
      if (match) {
        return `${match[1]}/${match[2]}`;
      }
    }
  }
  
  // Fallback no texto completo
  const match = ctx.fullText.match(/(?:S[ÉE]RIE\s*)?(\d{1,3})\s*\/\s*(\d{5,12})/);
  return match ? `${match[1]}/${match[2]}` : '';
};

/**
 * Extrai as placas do veículo.
 * Busca em ordem:
 * 1. INFORMAÇÕES ESPECÍFICAS DO MODAL RODOVIÁRIO (layout TRANSAÇO)
 * 2. OBSERVAÇÕES GERAIS (layout genérico)
 * 3. Texto completo como último recurso
 */
const extractPlacas = (ctx: ExtractionContext): string => {
  const placaPattern = /\b([A-Z]{3}\d{4}|[A-Z]{3}\d[A-Z0-9]\d{2})\b/gi;

  // 1. Tentar MODAL RODOVIÁRIO primeiro (layout específico TRANSAÇO)
  const modalIdx = findLineIndexByAnchor(ctx.lines, /MODAL\s+RODOVI[ÁA]RIO/i);
  if (modalIdx >= 0) {
    const modalText = ctx.lines
      .slice(modalIdx, Math.min(modalIdx + 15, ctx.lines.length))
      .map(l => l.text)
      .join(' ');
    const modalMatches = modalText.toUpperCase().match(placaPattern) || [];
    if (modalMatches.length > 0) {
      const unique = [...new Set(modalMatches)];
      console.log(`[Placas] Encontrado em MODAL RODOVIÁRIO: ${unique.join(', ')}`);
      return unique.join(' / ');
    }
  }

  // 2. Tentar OBSERVAÇÕES GERAIS
  const obsIdx = findLineIndexByAnchor(ctx.lines, /OBSERVA[ÇC][ÕO]ES?\s+GERAIS?/i);
  if (obsIdx >= 0) {
    const obsText = ctx.lines
      .slice(obsIdx, Math.min(obsIdx + 10, ctx.lines.length))
      .map(l => l.text)
      .join(' ');
    const obsMatches = obsText.toUpperCase().match(placaPattern) || [];
    if (obsMatches.length > 0) {
      const unique = [...new Set(obsMatches)];
      console.log(`[Placas] Encontrado em OBSERVAÇÕES GERAIS: ${unique.join(', ')}`);
      return unique.join(' / ');
    }
  }

  // 3. Fallback: buscar no texto completo (excluindo chave de acesso e CNPJs que podem ter padrão similar)
  const fullMatches = ctx.fullText.toUpperCase().match(placaPattern) || [];
  const unique = [...new Set(fullMatches)];
  if (unique.length > 0) {
    console.log(`[Placas] Encontrado no texto completo: ${unique.join(', ')}`);
    return unique.join(' / ');
  }

  console.log('[Placas] Não encontrado');
  return '';
};

/**
 * Condição de venda — sempre 'Venda' conforme especificação do usuário.
 * Não existe campo correspondente no DACTE da TRANSAÇO TRANSPORTE LTDA.
 */
const extractCondicao = (_ctx: ExtractionContext): 'Venda' | 'Transferência' => {
  return 'Venda';
};

/**
 * Extrai a série do CT-e
 */
const extractSerie = (ctx: ExtractionContext): string => {
  const match = ctx.fullText.match(/S[ÉE]RIE[:\s]*(\d+)/i);
  return match ? match[1] : '';
};

/**
 * Extrai CNPJs
 */
const extractCNPJs = (ctx: ExtractionContext): { emitente: string; origem: string; cliente: string } => {
  const result = { emitente: '', origem: '', cliente: '' };
  
  // CNPJ Emitente
  const emiMatch = ctx.fullText.match(/EMITENTE[^0-9]*?(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/i);
  if (emiMatch) result.emitente = emiMatch[1].replace(/\D/g, '');
  
  // CNPJ Remetente (Origem)
  const remMatch = ctx.fullText.match(/REMETENTE[^0-9]*?(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/i);
  if (remMatch) result.origem = remMatch[1].replace(/\D/g, '');
  
  // CNPJ Destinatário (Cliente)
  const destMatch = ctx.fullText.match(/DESTINAT[ÁA]RIO[^0-9]*?(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/i);
  if (destMatch) result.cliente = destMatch[1].replace(/\D/g, '');
  
  return result;
};

/**
 * Extrai peso bruto
 */
const extractPesoBruto = (ctx: ExtractionContext): number => {
  const match = ctx.fullText.match(/PESO\s*(?:BRUTO|TOTAL)?[:\s]*(\d{1,3}(?:[.,]\d{3})*[.,]\d+|\d+)\s*(?:KG)?/i);
  return match ? parseMoneyPtBrToNumber(match[1]) : 0;
};

/**
 * Extrai volumes
 */
const extractVolumes = (ctx: ExtractionContext): string => {
  const match = ctx.fullText.match(/(?:QUANTIDADE|QTD|QNT)[^0-9]*?(?:VOLUMES?|VOL)[:\s]*(\d+)/i);
  return match ? match[1] : '';
};

/**
 * Extrai produto predominante
 */
const extractProduto = (ctx: ExtractionContext): string => {
  const match = ctx.fullText.match(/PRODUTO\s+PREDOMINANTE[^A-Z]*([A-ZÀ-Ú][A-ZÀ-Ú\s\-\d,\.]+?)(?=\s+(?:PESO|QNT|QUANTIDADE|VALOR|OUTRAS|$))/i);
  return match ? match[1].trim() : '';
};

/**
 * Extrai valor do ICMS
 */
const extractValorICMS = (ctx: ExtractionContext): number => {
  const match = ctx.fullText.match(/VALOR\s+(?:DO\s+)?ICMS[:\s]*R?\$?\s*(\d+[.\d]*,\d{2})/i);
  return match ? parseMoneyPtBrToNumber(match[1]) : 0;
};

// ============================================================================
// TEXT EXTRACTION - NATIVE PDF.JS
// ============================================================================

interface ExtractionResult {
  context: ExtractionContext;
  pdfDocument: pdfjsLib.PDFDocumentProxy;
}

const extractTextNativePdfJs = async (file: File): Promise<ExtractionResult> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const allTokens: TextToken[] = [];
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    if (textContent.items.length === 0) {
      console.warn(`Página ${i} sem texto extraível`);
      continue;
    }

    const items = textContent.items as any[];
    
    // Coletar tokens com coordenadas
    items.forEach((item: any) => {
      if (item.str && item.str.trim()) {
        allTokens.push({
          str: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width || 0,
          height: item.height || 0,
        });
      }
    });

    // Ordenar para texto completo
    items.sort((a, b) => {
      if (Math.abs(a.transform[5] - b.transform[5]) < 5) {
        return a.transform[4] - b.transform[4];
      }
      return b.transform[5] - a.transform[5];
    });

    const pageText = items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  
  fullText = fullText.replace(/\s+/g, ' ').trim();
  const lines = buildLines(allTokens);
  
  console.log(`[Extração Nativa] ${fullText.length} caracteres, ${lines.length} linhas`);
  
  return {
    context: { lines, fullText, tokens: allTokens },
    pdfDocument: pdf,
  };
};

// ============================================================================
// TEXT EXTRACTION - OCR FALLBACK
// ============================================================================

const extractTextOcrFirstPage = async (pdfDocument: pdfjsLib.PDFDocumentProxy): Promise<ExtractionContext> => {
  try {
    console.log('[OCR] Iniciando OCR da página 1...');
    
    const Tesseract = await import('tesseract.js');
    
    const page = await pdfDocument.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({ canvasContext: context, viewport }).promise;
    
    const worker = await Tesseract.createWorker('por', 1, {
      workerPath: `${import.meta.env.BASE_URL}tesseract/4.1.1/worker.min.js`,
      corePath: `${import.meta.env.BASE_URL}tesseract/4.1.1/tesseract-core.wasm.js`,
      langPath: `${import.meta.env.BASE_URL}tesseract/4.1.1/lang`,
    });
    
    const { data } = await worker.recognize(canvas);
    await worker.terminate();
    
    const ocrText = data.text.replace(/\s+/g, ' ').trim();
    console.log(`[OCR] ${ocrText.length} caracteres via OCR`);
    
    // Construir linhas a partir do texto OCR (sem coordenadas precisas)
    const ocrLines: TextLine[] = data.text
      .split('\n')
      .filter((line: string) => line.trim())
      .map((line: string, idx: number) => ({
        y: 1000 - idx * 10, // Y fictício para manter ordem
        tokens: [{ str: line.trim(), x: 0, y: 1000 - idx * 10, width: 0, height: 0 }],
        text: line.trim(),
      }));
    
    return {
      lines: ocrLines,
      fullText: ocrText,
      tokens: [],
    };
  } catch (error) {
    console.error('[OCR] Falha:', error);
    throw new Error('OCR_FAILED');
  }
};

// ============================================================================
// VALIDAÇÃO
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  missingCritical: string[];
}

const validateCriticalFields = (data: Partial<CTeExtractedData>): ValidationResult => {
  const critical = {
    chaveAcesso: data.chaveAcesso,
    Numero_CTe: data.Numero_CTe,
    Cobranca_CTE: data.Cobranca_CTE,
    Cliente: data.Cliente,
  };
  
  const missing = Object.entries(critical)
    .filter(([_, value]) => !value || value === 0)
    .map(([key]) => key);
  
  return {
    isValid: missing.length === 0,
    missingCritical: missing,
  };
};

// ============================================================================
// FUNÇÃO PRINCIPAL DE PARSING
// ============================================================================

const parseCteFromContext = (ctx: ExtractionContext, source: 'PDF' | 'OCR' = 'PDF'): Partial<CTeExtractedData> => {
  const data: Partial<CTeExtractedData> = {};
  
  // Extração por blocos/âncoras
  data.Data = extractData(ctx);
  data.Numero_CTe = extractNumeroCTe(ctx);
  data.chaveAcesso = extractChaveAcesso(ctx);
  data.Serie = extractSerie(ctx);
  data.Transportadora = extractTransportadora(ctx);
  data.Origem = extractOrigem(ctx);
  data.Cliente = extractCliente(ctx);
  
  const { localidade, uf } = extractLocalidadeUF(ctx);
  data.Localidade = localidade;
  data.UF = uf;
  
  data.Valor_NF = extractValorNF(ctx);
  data.Cobranca_CTE = extractCobrancaCTE(ctx);
  data.Valor_Frete = extractValorFrete(ctx);
  data.Frete_Total = extractFreteTotal(ctx);
  data.Frete_c_ICMS = extractFretecICMS(ctx);
  data.Nota_Fiscal = extractNotaFiscal(ctx);
  data.Placas_Veiculo = extractPlacas(ctx);
  data.Condicao = extractCondicao(ctx);
  
  // Campos auxiliares
  const cnpjs = extractCNPJs(ctx);
  data.CNPJ_Emitente = cnpjs.emitente;
  data.CNPJ_Origem = cnpjs.origem;
  data.CNPJ_Cliente = cnpjs.cliente;
  data.Peso_Bruto = extractPesoBruto(ctx);
  data.Volumes = extractVolumes(ctx);
  data.Produto = extractProduto(ctx);
  data.Valor_ICMS = extractValorICMS(ctx);
  
  // Fallback: extrair número do CT-e da chave se não encontrou
  if (!data.Numero_CTe && data.chaveAcesso && data.chaveAcesso.length === 44) {
    const numFromKey = data.chaveAcesso.substring(25, 34);
    console.log('[Extração] Recuperando Número CT-e da chave de acesso:', numFromKey);
    data.Numero_CTe = parseInt(numFromKey, 10).toString();
  }
  
  // Fallbacks de valores
  if (!data.Frete_Total && data.Cobranca_CTE) {
    data.Frete_Total = data.Cobranca_CTE;
  }
  data.Frete = data.Frete_Total || data.Cobranca_CTE || 0;
  data.NF_Referencia = data.Nota_Fiscal;
  data.Placa_Veiculo = data.Placas_Veiculo?.split(' / ')[0] || '';
  
  // Pedágio: sempre começa com 0 (manual)
  data.Pedagio = 0;

  // Log diagnóstico estruturado por campo
  console.group(`[CT-e Diagnóstico] Fonte: ${source}`);
  const diagnosticFields: { label: string; key: keyof typeof data; critical?: boolean }[] = [
    { label: 'Chave Acesso (44 dígitos)', key: 'chaveAcesso', critical: true },
    { label: 'Data', key: 'Data' },
    { label: 'Número CT-e', key: 'Numero_CTe', critical: true },
    { label: 'Série', key: 'Serie' },
    { label: 'Transportadora', key: 'Transportadora' },
    { label: 'Origem', key: 'Origem' },
    { label: 'Cliente', key: 'Cliente', critical: true },
    { label: 'Localidade', key: 'Localidade' },
    { label: 'UF', key: 'UF' },
    { label: 'Nota Fiscal', key: 'Nota_Fiscal' },
    { label: 'Valor NF', key: 'Valor_NF' },
    { label: 'Valor Frete', key: 'Valor_Frete' },
    { label: 'Frete Total', key: 'Frete_Total' },
    { label: 'Frete c/ ICMS', key: 'Frete_c_ICMS' },
    { label: 'Cobrança CTE', key: 'Cobranca_CTE', critical: true },
    { label: 'Placas Veículo', key: 'Placas_Veiculo' },
    { label: 'Condição', key: 'Condicao' },
  ];
  for (const { label, key, critical } of diagnosticFields) {
    const val = data[key];
    const empty = val === '' || val === 0 || val === undefined || val === null;
    const prefix = empty ? (critical ? '❌ CRÍTICO' : '⚠️  VAZIO') : '✅';
    console.log(`  ${prefix}  ${label}: ${empty ? '(não encontrado)' : val}`);
  }
  console.groupEnd();
  
  return data;
};

const fillDefaults = (data: Partial<CTeExtractedData>): CTeExtractedData => {
  return {
    chaveAcesso: data.chaveAcesso || '',
    Data: data.Data || '',
    Numero_CTe: data.Numero_CTe || '',
    Serie: data.Serie || '',
    Transportadora: data.Transportadora || '',
    Origem: data.Origem || '',
    Cliente: data.Cliente || '',
    Localidade: data.Localidade || '',
    UF: data.UF || '',
    Placas_Veiculo: data.Placas_Veiculo || '',
    Condicao: data.Condicao || 'Venda',
    Nota_Fiscal: data.Nota_Fiscal || '',
    Valor_NF: data.Valor_NF || 0,
    Valor_Frete: data.Valor_Frete || 0,
    Frete_Total: data.Frete_Total || 0,
    Frete_c_ICMS: data.Frete_c_ICMS || 0,
    Cobranca_CTE: data.Cobranca_CTE || 0,
    CNPJ_Emitente: data.CNPJ_Emitente || '',
    CNPJ_Origem: data.CNPJ_Origem || '',
    CNPJ_Cliente: data.CNPJ_Cliente || '',
    NF_Referencia: data.NF_Referencia || '',
    Frete: data.Frete || 0,
    Peso_Bruto: data.Peso_Bruto || 0,
    Placa_Veiculo: data.Placa_Veiculo || '',
    Produto: data.Produto || '',
    Volumes: data.Volumes || '',
    Valor_ICMS: data.Valor_ICMS || 0,
    Pedagio: data.Pedagio ?? 0,
  };
};

// ============================================================================
// MAIN EXTRACTION (HYBRID)
// ============================================================================

export const extractCTeData = async (file: File): Promise<CTeExtractedData> => {
  try {
    const { context, pdfDocument } = await extractTextNativePdfJs(file);
    
    let parsedData = parseCteFromContext(context, 'PDF');
    let validation = validateCriticalFields(parsedData);
    
    const needsOcr = context.fullText.length < 50 || !validation.isValid;
    
    if (needsOcr) {
      console.log(`[Hybrid] OCR acionado: ${context.fullText.length < 50 ? 'texto curto' : 'campos faltando'} (${validation.missingCritical.join(', ')})`);
      
      try {
        const ocrContext = await extractTextOcrFirstPage(pdfDocument);
        const ocrParsed = parseCteFromContext(ocrContext, 'OCR');
        
        // Merge: preencher apenas campos vazios
        parsedData = {
          ...parsedData,
          ...Object.fromEntries(
            Object.entries(ocrParsed).filter(([key, value]) => 
              value && (!parsedData[key as keyof typeof parsedData] || parsedData[key as keyof typeof parsedData] === 0 || parsedData[key as keyof typeof parsedData] === '')
            )
          ),
        };
        
        validation = validateCriticalFields(parsedData);
        
        if (!validation.isValid) {
          console.warn(`[Extração] Alguns campos críticos faltaram: ${validation.missingCritical.join(', ')}`);
        }
      } catch (ocrError: any) {
        if (ocrError.message === 'OCR_FAILED') {
          console.warn('OCR falhou, tentando prosseguir com extração nativa apenas.');
        } else {
          console.error('[OCR] Erro não fatal:', ocrError);
        }
      }
    }
    
    const finalData = fillDefaults(parsedData);
    
    console.log('[Extração] Finalizada', {
      Numero_CTe: finalData.Numero_CTe,
      Transportadora: finalData.Transportadora,
      Cliente: finalData.Cliente,
      Valor_NF: finalData.Valor_NF,
      Cobranca_CTE: finalData.Cobranca_CTE,
      camposFaltantes: validation?.missingCritical || [],
    });
    
    return finalData;
    
  } catch (error: any) {
    console.error('[Extração] Erro:', error);
    
    if (error.message === 'OCR_FAILED') {
      throw new Error('OCR falhou. O PDF pode estar corrompido ou ilegível.');
    }
    
    throw new Error('Erro ao processar CT-e. Verifique se o arquivo é válido.');
  }
};

// ============================================================================
// HELPER FUNCTIONS (UI) - COMPATIBILIDADE
// ============================================================================

// Alias para manter compatibilidade com código existente
export type CTeData = CTeExtractedData;

export const countExtractedFields = (data: CTeExtractedData): number => {
  const fieldsToCount: (keyof CTeExtractedData)[] = [
    'Data', 'Numero_CTe', 'Transportadora', 'Origem', 'Cliente',
    'Localidade', 'UF', 'Placas_Veiculo', 'Condicao', 'Nota_Fiscal',
    'Valor_NF', 'Valor_Frete', 'Frete_Total', 'Frete_c_ICMS', 'Cobranca_CTE',
  ];
  
  return fieldsToCount.filter(key => {
    const value = data[key];
    if (typeof value === 'number') return value !== 0;
    return value !== '';
  }).length;
};

export const getMissingFields = (data: CTeExtractedData): string[] => {
  const fieldLabels: Record<string, string> = {
    Data: 'Data',
    Numero_CTe: 'Número CT-e',
    Transportadora: 'Transportadora',
    Origem: 'Origem',
    Cliente: 'Cliente',
    Localidade: 'Localidade',
    UF: 'UF',
    Placas_Veiculo: 'Placas Veículo',
    Condicao: 'Condição',
    Nota_Fiscal: 'Nota Fiscal',
    Valor_NF: 'Valor NF',
    Valor_Frete: 'Valor Frete',
    Frete_Total: 'Frete Total',
    Frete_c_ICMS: 'Frete c/ ICMS',
    Cobranca_CTE: 'Cobrança CTE',
  };

  return Object.entries(fieldLabels)
    .filter(([key]) => {
      const value = data[key as keyof CTeExtractedData];
      if (typeof value === 'number') return value === 0;
      return value === '';
    })
    .map(([key]) => fieldLabels[key]);
};

export const isValidCTeData = (data: Partial<CTeExtractedData>): boolean => {
  return validateCriticalFields(data).isValid;
};
