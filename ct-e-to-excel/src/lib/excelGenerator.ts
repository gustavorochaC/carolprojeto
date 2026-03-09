import * as XLSX from 'xlsx';
import type { CTeExtractedData } from './pdfExtractor';
import { EXCEL_COLUMNS, EXCEL_COLUMN_LABELS, MONEY_COLUMNS, type ExcelColumnKey } from './types';
import { getMonthName, getMonthYearFromDate, getCurrentMonthYear } from './utils';

/**
 * Converte um CT-e extraído para formato de linha do Excel
 * ORDEM DAS COLUNAS: definida em EXCEL_COLUMNS (types.ts)
 */
const cteToExcelRow = (data: CTeExtractedData): Record<string, string | number> => {
  // Calcular Valor_Seguro
  const valorSeguro = data.Valor_NF ? data.Valor_NF * 0.0005 : 0;

  // Criar objeto na ordem EXATA das colunas
  return {
    'Data': data.Data || '',
    'Numero_CTE': data.Numero_CTe || '',
    'Transportadora': data.Transportadora || '',
    'Origem': data.Origem || '',
    'Cliente': data.Cliente || '',
    'Localidade': data.Localidade || '',
    'UF': data.UF || '',
    'Placas_Veiculo': data.Placas_Veiculo || data.Placa_Veiculo || '',
    'Condicao': data.Condicao || 'Venda',
    'Nota_Fiscal': data.Nota_Fiscal || data.NF_Referencia || '',
    'Valor_NF': data.Valor_NF || 0,
    'Valor_Frete': data.Valor_Frete || 0,
    'Valor_Seguro': valorSeguro,
    'Pedagio': data.Pedagio ?? 0,
    'Frete_Total': data.Frete_Total || data.Frete || data.Cobranca_CTE || 0,
    'Frete_c_ICMS': data.Frete_c_ICMS || 0,
    'Cobranca_CTE': data.Cobranca_CTE || 0,
  };
};

/**
 * Aplica formatação de moeda nas colunas apropriadas
 */
const applyMoneyFormat = (worksheet: XLSX.WorkSheet, rowCount: number): void => {
  // Identificar índices das colunas de dinheiro
  const moneyColIndexes: number[] = [];
  
  EXCEL_COLUMNS.forEach((col, idx) => {
    if (MONEY_COLUMNS.includes(col)) {
      moneyColIndexes.push(idx);
    }
  });
  
  // Aplicar formato para cada célula de dinheiro
  // Linha 0 é header, dados começam na linha 1
  for (let row = 1; row <= rowCount; row++) {
    moneyColIndexes.forEach(colIdx => {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: colIdx });
      if (worksheet[cellRef]) {
        worksheet[cellRef].z = '#,##0.00';
      }
    });
  }
};

/**
 * Define larguras das colunas
 */
const getColumnWidths = (): XLSX.ColInfo[] => {
  const widths: Record<ExcelColumnKey, number> = {
    'Data': 12,
    'Numero_CTE': 12,
    'Transportadora': 30,
    'Origem': 30,
    'Cliente': 35,
    'Localidade': 20,
    'UF': 5,
    'Placas_Veiculo': 18,
    'Condicao': 15,
    'Nota_Fiscal': 18,
    'Valor_NF': 15,
    'Valor_Frete': 13,
    'Valor_Seguro': 13,
    'Pedagio': 10,
    'Frete_Total': 13,
    'Frete_c_ICMS': 13,
    'Cobranca_CTE': 14,
  };
  
  return EXCEL_COLUMNS.map(col => ({ wch: widths[col] }));
};

/**
 * Gera Excel a partir de um array de CT-es
 * GARANTE: ordem fixa das colunas conforme EXCEL_COLUMNS
 */
export const generateExcel = (dataArray: CTeExtractedData[]): void => {
  if (!dataArray || dataArray.length === 0) {
    console.error('Nenhum dado para gerar Excel');
    return;
  }

  // Converter todos os CT-es para linhas do Excel
  const excelData = dataArray.map(cteToExcelRow);

  // Criar worksheet com header explícito (garante ordem)
  const worksheet = XLSX.utils.json_to_sheet(excelData, {
    header: EXCEL_COLUMNS as unknown as string[],
  });

  // Aplicar larguras das colunas
  worksheet['!cols'] = getColumnWidths();
  
  // Aplicar formatação de moeda
  applyMoneyFormat(worksheet, excelData.length);

  // Criar workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'CT-e');

  // Determinar mês e ano para o nome do arquivo
  const firstCTe = dataArray[0];
  const monthYear = getMonthYearFromDate(firstCTe.Data) || getCurrentMonthYear();
  const monthName = getMonthName(monthYear.month);
  const fileName = `CTe_${monthName}_${monthYear.year}.xlsx`;
  
  console.log(`[Excel] Gerando arquivo: ${fileName} com ${dataArray.length} CT-e(s)`);
  console.log(`[Excel] Colunas: ${EXCEL_COLUMNS.join(', ')}`);
  
  XLSX.writeFile(workbook, fileName);
};

/**
 * Função de compatibilidade: aceita um único CT-e (converte para array)
 */
export const generateExcelFromSingle = (data: CTeExtractedData): void => {
  generateExcel([data]);
};

/**
 * Gera dados para preview (sem baixar arquivo)
 * Retorna array de objetos com os dados formatados
 */
export const generateExcelPreviewData = (dataArray: CTeExtractedData[]): Record<string, string | number>[] => {
  return dataArray.map(cteToExcelRow);
};

/**
 * Retorna os labels amigáveis das colunas para exibição
 */
export const getColumnLabels = (): string[] => {
  return EXCEL_COLUMNS.map(col => EXCEL_COLUMN_LABELS[col]);
};

/**
 * Retorna as chaves das colunas na ordem correta
 */
export const getColumnKeys = (): readonly string[] => {
  return EXCEL_COLUMNS;
};
