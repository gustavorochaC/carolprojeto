// ============================================================================
// TIPOS CENTRALIZADOS - FONTE DA VERDADE PARA EXCEL
// ============================================================================

/**
 * Ordem EXATA das colunas no Excel exportado.
 * Esta é a fonte da verdade usada por:
 * - ExcelPreview (UI)
 * - excelGenerator (export)
 * - validação de campos faltantes
 */
export const EXCEL_COLUMNS = [
  'Data',
  'Numero_CTE',
  'Transportadora',
  'Origem',
  'Cliente',
  'Localidade',
  'UF',
  'Placas_Veiculo',
  'Condicao',
  'Nota_Fiscal',
  'Valor_NF',
  'Valor_Frete',
  'Valor_Seguro',
  'Pedagio',
  'Frete_Total',
  'Frete_c_ICMS',
  'Cobranca_CTE',
] as const;

export type ExcelColumnKey = typeof EXCEL_COLUMNS[number];

/**
 * Labels amigáveis para exibição no UI
 */
export const EXCEL_COLUMN_LABELS: Record<ExcelColumnKey, string> = {
  Data: 'Data',
  Numero_CTE: 'Número CTE',
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
  Valor_Seguro: 'Valor Seguro',
  Pedagio: 'Pedágio',
  Frete_Total: 'Frete Total',
  Frete_c_ICMS: 'Frete c/ ICMS',
  Cobranca_CTE: 'Cobrança CTE',
};

/**
 * Colunas que são valores monetários (para formatação)
 */
export const MONEY_COLUMNS: ExcelColumnKey[] = [
  'Valor_NF',
  'Valor_Frete',
  'Valor_Seguro',
  'Pedagio',
  'Frete_Total',
  'Frete_c_ICMS',
  'Cobranca_CTE',
];

/**
 * Colunas que sempre podem ser editadas (independentemente de estar vazio)
 */
export const ALWAYS_EDITABLE_COLUMNS: ExcelColumnKey[] = [
  'Pedagio',
];

/**
 * Colunas que são calculadas e nunca devem ser editadas manualmente
 */
export const COMPUTED_COLUMNS: ExcelColumnKey[] = [
  'Valor_Seguro', // Calculado: Valor_NF * 0.0005
  'Frete_c_ICMS', // Calculado a partir da base de cálculo
];

/**
 * Colunas que podem ser editadas quando estão vazias
 */
export const EDITABLE_WHEN_MISSING_COLUMNS: ExcelColumnKey[] = [
  'Data',
  'Numero_CTE',
  'Transportadora',
  'Origem',
  'Cliente',
  'Localidade',
  'UF',
  'Placas_Veiculo',
  'Condicao',
  'Nota_Fiscal',
  'Valor_NF',
  'Valor_Frete',
  'Frete_Total',
  'Cobranca_CTE',
];

/**
 * Interface para uma linha do Excel (dados extraídos + calculados)
 */
export interface CTeExcelRow {
  // Identificador interno (não vai pro Excel, usado para controle)
  chaveAcesso: string;
  
  // Campos do Excel (na ordem de EXCEL_COLUMNS)
  Data: string;                          // DD/MM/YYYY - de "DATA E HORA DE EMISSÃO"
  Numero_CTE: string;                    // Número do CT-e
  Transportadora: string;                // TRANSPORTADOR (bloco top-left)
  Origem: string;                        // REMETENTE
  Cliente: string;                       // DESTINATÁRIO
  Localidade: string;                    // MUNICÍPIO (do bloco DESTINATÁRIO)
  UF: string;                            // UF (do bloco DESTINATÁRIO)
  Placas_Veiculo: string;                // Placas em OBSERVAÇÕES GERAIS
  Condicao: 'Venda' | 'Transferência';   // De PRODUTO PREDOMINANTE
  Nota_Fiscal: string;                   // SÉRIE/Nº DOCUMENTO
  Valor_NF: number;                      // VALOR TOTAL DA CARGA
  Valor_Frete: number;                   // VALOR FRETE (componente)
  Valor_Seguro: number;                  // CALCULADO: Valor_NF * 0.0005
  Pedagio: number;                       // MANUAL: default 0, editável
  Frete_Total: number;                   // Soma componentes ou TOTAL PRESTAÇÃO
  Frete_c_ICMS: number;                  // CALCULADO: base * (1 + aliq/100)
  Cobranca_CTE: number;                  // VALOR A RECEBER
}

/**
 * Interface para dados extraídos do PDF (antes de normalização)
 * Mantém compatibilidade com o código existente
 */
export interface CTeExtractedData {
  // Identificadores
  chaveAcesso: string;
  
  // Dados extraídos
  Data: string;
  Numero_CTe: string;
  Serie: string;
  Transportadora: string;
  Origem: string;
  Cliente: string;
  Localidade: string;
  UF: string;
  Placas_Veiculo: string;
  Condicao: 'Venda' | 'Transferência' | '';
  Nota_Fiscal: string;
  Valor_NF: number;
  Valor_Frete: number;
  Frete_Total: number;
  Frete_c_ICMS: number;
  Cobranca_CTE: number;
  
  // Campos auxiliares (para compatibilidade)
  CNPJ_Emitente: string;
  CNPJ_Origem: string;
  CNPJ_Cliente: string;
  NF_Referencia: string;
  Frete: number;
  Peso_Bruto: number;
  Placa_Veiculo: string;
  Produto: string;
  Volumes: string;
  Valor_ICMS: number;
  
  // Campo manual (editável)
  Pedagio: number;
}

/**
 * Campos críticos para validação (se faltarem, pode acionar OCR)
 */
export const CRITICAL_FIELDS: (keyof CTeExtractedData)[] = [
  'chaveAcesso',
  'Numero_CTe',
  'Cliente',
  'Cobranca_CTE',
];

/**
 * Converte dados extraídos para linha do Excel
 */
export function toExcelRow(data: CTeExtractedData): CTeExcelRow {
  return {
    chaveAcesso: data.chaveAcesso,
    Data: data.Data,
    Numero_CTE: data.Numero_CTe,
    Transportadora: data.Transportadora,
    Origem: data.Origem,
    Cliente: data.Cliente,
    Localidade: data.Localidade,
    UF: data.UF,
    Placas_Veiculo: data.Placas_Veiculo || data.Placa_Veiculo,
    Condicao: data.Condicao || 'Venda', // Default para Venda se vazio
    Nota_Fiscal: data.Nota_Fiscal || data.NF_Referencia,
    Valor_NF: data.Valor_NF,
    Valor_Frete: data.Valor_Frete,
    Valor_Seguro: data.Valor_NF * 0.0005, // CALCULADO
    Pedagio: data.Pedagio ?? 0,            // MANUAL
    Frete_Total: data.Frete_Total || data.Frete || data.Cobranca_CTE,
    Frete_c_ICMS: data.Frete_c_ICMS,
    Cobranca_CTE: data.Cobranca_CTE,
  };
}

/**
 * Verifica se um valor é uma coluna de dinheiro
 */
export function isMoneyColumn(column: ExcelColumnKey): boolean {
  return MONEY_COLUMNS.includes(column);
}

/**
 * Verifica se uma coluna é editável (sempre editável ou editável quando vazia)
 */
export function isEditableColumn(column: ExcelColumnKey): boolean {
  return ALWAYS_EDITABLE_COLUMNS.includes(column) || EDITABLE_WHEN_MISSING_COLUMNS.includes(column);
}

/**
 * Verifica se um valor é considerado "ausente" (editable)
 */
export function isMissingValue(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/**
 * Tipo de input para edição
 */
export type EditInputType = 'text' | 'number' | 'select';

/**
 * Mapeia coluna Excel → campo CTeData + tipo de input
 */
export const COLUMN_TO_FIELD_MAP: Record<ExcelColumnKey, { field: keyof CTeExtractedData; inputType: EditInputType; fallbackField?: keyof CTeExtractedData }> = {
  'Data': { field: 'Data', inputType: 'text' },
  'Numero_CTE': { field: 'Numero_CTe', inputType: 'text' },
  'Transportadora': { field: 'Transportadora', inputType: 'text' },
  'Origem': { field: 'Origem', inputType: 'text' },
  'Cliente': { field: 'Cliente', inputType: 'text' },
  'Localidade': { field: 'Localidade', inputType: 'text' },
  'UF': { field: 'UF', inputType: 'text' },
  'Placas_Veiculo': { field: 'Placas_Veiculo', inputType: 'text', fallbackField: 'Placa_Veiculo' },
  'Condicao': { field: 'Condicao', inputType: 'select' },
  'Nota_Fiscal': { field: 'Nota_Fiscal', inputType: 'text', fallbackField: 'NF_Referencia' },
  'Valor_NF': { field: 'Valor_NF', inputType: 'number' },
  'Valor_Frete': { field: 'Valor_Frete', inputType: 'number' },
  'Valor_Seguro': { field: 'Valor_NF', inputType: 'number' }, // Computado, mas mantém campo base
  'Pedagio': { field: 'Pedagio', inputType: 'number' },
  'Frete_Total': { field: 'Frete_Total', inputType: 'number', fallbackField: 'Frete' },
  'Frete_c_ICMS': { field: 'Frete_c_ICMS', inputType: 'number' },
  'Cobranca_CTE': { field: 'Cobranca_CTE', inputType: 'number' },
};
