import { useState, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FileSpreadsheet, Edit2 } from 'lucide-react';
import type { CTeData } from '@/lib/pdfExtractor';
import {
  EXCEL_COLUMNS,
  EXCEL_COLUMN_LABELS,
  MONEY_COLUMNS,
  ALWAYS_EDITABLE_COLUMNS,
  COMPUTED_COLUMNS,
  EDITABLE_WHEN_MISSING_COLUMNS,
  COLUMN_TO_FIELD_MAP,
  isMissingValue,
  type ExcelColumnKey,
  type EditInputType,
} from '@/lib/types';
import { updateCTe } from '@/lib/storage';

interface ExcelPreviewProps {
  data: CTeData[];
  onDataUpdate?: (updatedData: CTeData[]) => void;
}

/**
 * Formata valor para exibição
 */
const formatValue = (value: string | number | undefined, column: ExcelColumnKey): string => {
  if (value === undefined || value === null || value === '') return '-';
  
  // Colunas de dinheiro
  if (MONEY_COLUMNS.includes(column) && typeof value === 'number') {
    return value > 0 ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';
  }
  
  return String(value);
};

/**
 * Obtém o valor de um campo do CT-e baseado na coluna
 */
const getFieldValue = (cte: CTeData, column: ExcelColumnKey): string | number => {
  const mapping = COLUMN_TO_FIELD_MAP[column];
  const fallback = mapping.fallbackField ? cte[mapping.fallbackField] : undefined;
  const value = cte[mapping.field] ?? fallback;
  
  // Para Valor_Seguro, calculamos
  if (column === 'Valor_Seguro') {
    return (cte.Valor_NF || 0) * 0.0005;
  }
  
  return value as string | number;
};

/**
 * Verifica se uma coluna pode ser editada
 */
const canEdit = (cte: CTeData, column: ExcelColumnKey): boolean => {
  // Colunas calculadas nunca são editáveis
  if (COMPUTED_COLUMNS.includes(column)) return false;
  
  // Colunas sempre editáveis (como Pedágio)
  if (ALWAYS_EDITABLE_COLUMNS.includes(column)) return true;
  
  // Outras colunas: editáveis apenas se o valor estiver ausente
  const value = getFieldValue(cte, column);
  return isMissingValue(value);
};

/**
 * Retorna o tipo de input para uma coluna
 */
const getInputType = (column: ExcelColumnKey): EditInputType => {
  return COLUMN_TO_FIELD_MAP[column].inputType;
};

/**
 * Largura mínima das colunas
 */
const getColumnWidth = (column: ExcelColumnKey): string => {
  const widths: Record<ExcelColumnKey, string> = {
    'Data': 'min-w-[100px]',
    'Numero_CTE': 'min-w-[110px]',
    'Transportadora': 'min-w-[180px]',
    'Origem': 'min-w-[180px]',
    'Cliente': 'min-w-[200px]',
    'Localidade': 'min-w-[140px]',
    'UF': 'min-w-[50px]',
    'Placas_Veiculo': 'min-w-[120px]',
    'Condicao': 'min-w-[110px]',
    'Nota_Fiscal': 'min-w-[130px]',
    'Valor_NF': 'min-w-[110px]',
    'Valor_Frete': 'min-w-[100px]',
    'Valor_Seguro': 'min-w-[100px]',
    'Pedagio': 'min-w-[100px]',
    'Frete_Total': 'min-w-[100px]',
    'Frete_c_ICMS': 'min-w-[110px]',
    'Cobranca_CTE': 'min-w-[120px]',
  };
  
  return widths[column];
};

/**
 * Verifica se a coluna é de valor (alinhamento à direita)
 */
const isValueColumn = (column: ExcelColumnKey): boolean => {
  return MONEY_COLUMNS.includes(column);
};

const ExcelPreview = ({ data, onDataUpdate }: ExcelPreviewProps) => {
  const [editingCell, setEditingCell] = useState<{ chaveAcesso: string; column: ExcelColumnKey } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const handleStartEdit = useCallback((chaveAcesso: string, column: ExcelColumnKey, currentValue: unknown) => {
    setEditingCell({ chaveAcesso, column });
    setEditValue(currentValue === undefined || currentValue === null ? '' : String(currentValue));
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingCell) return;
    
    const { chaveAcesso, column } = editingCell;
    const mapping = COLUMN_TO_FIELD_MAP[column];
    const inputType = mapping.inputType;
    
    let parsedValue: string | number = editValue;
    
    // Parse para número se for coluna money/number
    if (inputType === 'number') {
      parsedValue = parseFloat(editValue) || 0;
    }
    
    // Atualizar no storage usando o campo correto do CTeData
    const updates: Partial<CTeData> = {};
    updates[mapping.field] = parsedValue as never;
    
    // Se houver campo fallback e for uma string vazia, também limpar o fallback
    if (mapping.fallbackField && inputType === 'text' && editValue === '') {
      updates[mapping.fallbackField] = '' as never;
    }
    
    await updateCTe(chaveAcesso, updates);
    
    // Atualizar dados locais
    if (onDataUpdate) {
      const updatedData = data.map(cte => {
        if (cte.chaveAcesso === chaveAcesso) {
          return { ...cte, ...updates };
        }
        return cte;
      });
      onDataUpdate(updatedData);
    }
    
    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue, data, onDataUpdate]);

  const handleCancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }, [handleSaveEdit, handleCancelEdit]);

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4 border-b border-border/50">
        <CardTitle className="flex items-center gap-2 text-lg font-medium">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          Prévia da Planilha Excel
          <span className="text-xs font-normal text-muted-foreground ml-2">
            ({EXCEL_COLUMNS.length} colunas)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="rounded-md border border-border/50 overflow-x-auto bg-background/40">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted/30">
                {EXCEL_COLUMNS.map((column) => (
                  <TableHead 
                    key={column} 
                    className={`${getColumnWidth(column)} ${isValueColumn(column) ? 'text-right' : ''}`}
                  >
                    <div className="flex items-center gap-1">
                      {EXCEL_COLUMN_LABELS[column]}
                      {!COMPUTED_COLUMNS.includes(column) && (
                        <Edit2 className="w-3 h-3 text-primary opacity-50" />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((cte, index) => (
                <TableRow key={cte.chaveAcesso || index} className="hover:bg-muted/30 transition-colors">
                  {EXCEL_COLUMNS.map((column) => {
                    const value = getFieldValue(cte, column);
                    const isEditing = editingCell?.chaveAcesso === cte.chaveAcesso && editingCell?.column === column;
                    const editable = canEdit(cte, column);
                    const inputType = getInputType(column);
                    const missing = isMissingValue(value);
                    
                    return (
                      <TableCell 
                        key={column}
                        className={`${isValueColumn(column) ? 'text-right' : ''} ${editable ? 'cursor-pointer hover:bg-primary/5' : ''}`}
                        onClick={() => editable && handleStartEdit(cte.chaveAcesso, column, value)}
                      >
                        {isEditing ? (
                          inputType === 'select' ? (
                            <select
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleSaveEdit}
                              onKeyDown={handleKeyDown}
                              className="w-full h-7 text-sm border border-input bg-background rounded px-2"
                              autoFocus
                            >
                              <option value="">Selecione...</option>
                              <option value="Venda">Venda</option>
                              <option value="Transferência">Transferência</option>
                            </select>
                          ) : inputType === 'number' ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleSaveEdit}
                              onKeyDown={handleKeyDown}
                              className="w-24 h-7 text-right text-sm"
                              autoFocus
                            />
                          ) : (
                            <Input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleSaveEdit}
                              onKeyDown={handleKeyDown}
                              className="w-32 h-7 text-sm"
                              autoFocus
                            />
                          )
                        ) : (
                          <span className={`
                            ${column === 'Numero_CTE' ? 'font-mono text-xs bg-muted px-1.5 py-0.5 rounded' : ''}
                            ${column === 'UF' ? 'font-semibold' : ''}
                            ${column === 'Cliente' || column === 'Origem' || column === 'Transportadora' ? 'max-w-[180px] truncate block' : ''}
                            ${editable && missing ? 'border-b border-dashed border-primary/30 text-muted-foreground italic' : ''}
                            ${editable && !missing ? 'border-b border-dashed border-primary/30' : ''}
                          `}
                          title={typeof value === 'string' ? value : undefined}
                          >
                            {formatValue(value, column)}
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Mostrando {data.length} CT-e(s) • {EXCEL_COLUMNS.length} colunas
          </span>
          <span className="flex items-center gap-1">
            <Edit2 className="w-3 h-3" />
            Clique em campos vazios ou "Pedágio" para editar
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExcelPreview;
