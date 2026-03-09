import { CheckCircle2, AlertTriangle, XCircle, Edit2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CTeData } from '@/lib/pdfExtractor';
import { EXCEL_COLUMN_LABELS, type ExcelColumnKey } from '@/lib/types';

// Fields considered critical — if any are missing the CT-e is flagged as ❌
const CRITICAL_EXCEL_FIELDS: ExcelColumnKey[] = [
  'Numero_CTE',
  'Cliente',
  'Cobranca_CTE',
];

// Fields considered important but not critical — flag as ⚠️
const IMPORTANT_FIELDS: ExcelColumnKey[] = [
  'Data',
  'Transportadora',
  'Origem',
  'Localidade',
  'UF',
  'Nota_Fiscal',
  'Valor_NF',
  'Valor_Frete',
  'Frete_Total',
  'Placas_Veiculo',
];

type RowStatus = 'complete' | 'partial' | 'critical';

interface FieldIssue {
  column: ExcelColumnKey;
  label: string;
  critical: boolean;
}

interface ReportRow {
  cte: CTeData;
  status: RowStatus;
  issues: FieldIssue[];
}

const isMissing = (value: unknown): boolean =>
  value === undefined || value === null || value === '' || value === 0;

const analyzeRow = (cte: CTeData): ReportRow => {
  const issues: FieldIssue[] = [];

  const getValue = (col: ExcelColumnKey): unknown => {
    if (col === 'Numero_CTE') return cte.Numero_CTe;
    if (col === 'Placas_Veiculo') return cte.Placas_Veiculo || cte.Placa_Veiculo;
    if (col === 'Nota_Fiscal') return cte.Nota_Fiscal || cte.NF_Referencia;
    if (col === 'Frete_Total') return cte.Frete_Total || cte.Frete;
    if (col === 'Valor_Seguro') return (cte.Valor_NF || 0) * 0.0005; // always computed, never missing
    if (col === 'Pedagio') return undefined; // always manual, skip
    if (col === 'Frete_c_ICMS') return undefined; // computed, skip
    if (col === 'Condicao') return undefined; // always 'Venda', skip
    return (cte as Record<string, unknown>)[col];
  };

  for (const col of CRITICAL_EXCEL_FIELDS) {
    if (isMissing(getValue(col))) {
      issues.push({ column: col, label: EXCEL_COLUMN_LABELS[col], critical: true });
    }
  }

  for (const col of IMPORTANT_FIELDS) {
    if (isMissing(getValue(col))) {
      issues.push({ column: col, label: EXCEL_COLUMN_LABELS[col], critical: false });
    }
  }

  let status: RowStatus = 'complete';
  if (issues.some(i => i.critical)) status = 'critical';
  else if (issues.length > 0) status = 'partial';

  return { cte, status, issues };
};

const StatusBadge = ({ status }: { status: RowStatus }) => {
  if (status === 'complete') {
    return (
      <Badge className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-0">
        <CheckCircle2 className="w-3 h-3" />
        Completo
      </Badge>
    );
  }
  if (status === 'partial') {
    return (
      <Badge className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-0">
        <AlertTriangle className="w-3 h-3" />
        Parcial
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-0">
      <XCircle className="w-3 h-3" />
      Crítico
    </Badge>
  );
};

interface QualityReportProps {
  data: CTeData[];
  /** Called when user clicks "Editar" on a field — scroll/focus that column in ExcelPreview */
  onEditField?: (chaveAcesso: string, column: ExcelColumnKey) => void;
}

const QualityReport = ({ data, onEditField }: QualityReportProps) => {
  if (!data || data.length === 0) return null;

  const rows = data.map(analyzeRow);
  const complete = rows.filter(r => r.status === 'complete').length;
  const partial = rows.filter(r => r.status === 'partial').length;
  const critical = rows.filter(r => r.status === 'critical').length;

  return (
    <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2 text-lg font-medium">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Relatório de Qualidade
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              {complete} completo(s)
            </span>
            {partial > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                {partial} parcial(is)
              </span>
            )}
            {critical > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-full">
                <XCircle className="w-3 h-3" />
                {critical} crítico(s)
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div
              key={row.cte.chaveAcesso || idx}
              className={`rounded-lg border px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-3 transition-colors ${
                row.status === 'complete'
                  ? 'border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20'
                  : row.status === 'critical'
                  ? 'border-red-200/60 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/20'
                  : 'border-amber-200/60 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20'
              }`}
            >
              {/* CT-e identifier */}
              <div className="flex items-center gap-3 min-w-[180px]">
                <StatusBadge status={row.status} />
                <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-foreground/70">
                  {row.cte.Numero_CTe || '—'}
                </span>
              </div>

              {/* Issues list */}
              {row.issues.length === 0 ? (
                <span className="text-xs text-muted-foreground italic">Todos os campos preenchidos</span>
              ) : (
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {row.issues.map(issue => (
                    <button
                      key={issue.column}
                      onClick={() => onEditField?.(row.cte.chaveAcesso, issue.column)}
                      className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors cursor-pointer hover:opacity-80 ${
                        issue.critical
                          ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-800 text-red-700 dark:text-red-400'
                          : 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                      }`}
                      title={`Clique para editar ${issue.label}`}
                    >
                      {issue.critical ? <XCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {issue.label}
                      {onEditField && <Edit2 className="w-2.5 h-2.5 ml-0.5 opacity-60" />}
                    </button>
                  ))}
                </div>
              )}

              {/* Client name */}
              {row.cte.Cliente && (
                <span className="text-xs text-muted-foreground sm:ml-auto shrink-0 truncate max-w-[200px]" title={row.cte.Cliente}>
                  {row.cte.Cliente}
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Clique em um campo com problema para editar diretamente na tabela acima.
        </p>
      </CardContent>
    </Card>
  );
};

export default QualityReport;
