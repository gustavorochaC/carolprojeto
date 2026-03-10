import { CheckCircle2, AlertTriangle, XCircle, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CTeData } from '@/lib/pdfExtractor';
import { EXCEL_COLUMN_LABELS, type ExcelColumnKey } from '@/lib/types';

const CRITICAL_EXCEL_FIELDS: ExcelColumnKey[] = [
  'Numero_CTE',
  'Cliente',
  'Cobranca_CTE',
];

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
    if (col === 'Valor_Seguro') return (cte.Valor_NF || 0) * 0.0005;
    if (col === 'Pedagio') return undefined;
    if (col === 'Frete_c_ICMS') return undefined;
    if (col === 'Condicao') return undefined;
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

const statusConfig = {
  complete: {
    icon: CheckCircle2,
    label: 'OK',
    row: 'border-emerald-500/20 bg-emerald-500/5',
    badge: 'text-emerald-700 dark:text-emerald-400 border-emerald-500/25 bg-emerald-500/10',
  },
  partial: {
    icon: AlertTriangle,
    label: 'PARCIAL',
    row: 'border-amber-500/20 bg-amber-500/5',
    badge: 'text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/10',
  },
  critical: {
    icon: XCircle,
    label: 'CRÍTICO',
    row: 'border-red-500/20 bg-red-500/5',
    badge: 'text-red-700 dark:text-red-400 border-red-500/25 bg-red-500/10',
  },
};

interface QualityReportProps {
  data: CTeData[];
  onEditField?: (chaveAcesso: string, column: ExcelColumnKey) => void;
}

const QualityReport = ({ data, onEditField }: QualityReportProps) => {
  if (!data || data.length === 0) return null;

  const rows = data.map(analyzeRow);
  const complete = rows.filter(r => r.status === 'complete').length;
  const partial = rows.filter(r => r.status === 'partial').length;
  const critical = rows.filter(r => r.status === 'critical').length;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display font-600 text-base tracking-wide text-foreground">
            Relatório de Qualidade
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">{data.length} CT-e(s) analisados</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn(
            "inline-flex items-center gap-1 font-mono text-[11px] border rounded px-2 py-1",
            statusConfig.complete.badge
          )}>
            <CheckCircle2 className="w-3 h-3" />
            {complete} OK
          </span>
          {partial > 0 && (
            <span className={cn(
              "inline-flex items-center gap-1 font-mono text-[11px] border rounded px-2 py-1",
              statusConfig.partial.badge
            )}>
              <AlertTriangle className="w-3 h-3" />
              {partial} parcial
            </span>
          )}
          {critical > 0 && (
            <span className={cn(
              "inline-flex items-center gap-1 font-mono text-[11px] border rounded px-2 py-1",
              statusConfig.critical.badge
            )}>
              <XCircle className="w-3 h-3" />
              {critical} crítico
            </span>
          )}
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/40 p-4 space-y-2">
        {rows.map((row, idx) => {
          const cfg = statusConfig[row.status];
          const Icon = cfg.icon;

          return (
            <div
              key={row.cte.chaveAcesso || idx}
              className={cn(
                "rounded border px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-3",
                cfg.row
              )}
            >
              {/* Status + CTE number */}
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn(
                  "inline-flex items-center gap-1 font-mono text-[10px] border rounded px-1.5 py-0.5",
                  cfg.badge
                )}>
                  <Icon className="w-2.5 h-2.5" />
                  {cfg.label}
                </span>
                <span className="font-mono text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                  {row.cte.Numero_CTe || '—'}
                </span>
              </div>

              {/* Issues */}
              {row.issues.length === 0 ? (
                <span className="font-mono text-[11px] text-muted-foreground">
                  Todos os campos preenchidos
                </span>
              ) : (
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {row.issues.map(issue => (
                    <button
                      key={issue.column}
                      onClick={() => onEditField?.(row.cte.chaveAcesso, issue.column)}
                      title={`Editar ${issue.label}`}
                      className={cn(
                        "inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded border",
                        "transition-opacity hover:opacity-70 cursor-pointer",
                        issue.critical
                          ? "text-red-700 dark:text-red-400 border-red-400/30 bg-red-500/10"
                          : "text-amber-700 dark:text-amber-400 border-amber-400/30 bg-amber-500/10"
                      )}
                    >
                      {issue.critical
                        ? <XCircle className="w-2.5 h-2.5" />
                        : <AlertTriangle className="w-2.5 h-2.5" />
                      }
                      {issue.label}
                      {onEditField && <Edit2 className="w-2 h-2 opacity-50 ml-0.5" />}
                    </button>
                  ))}
                </div>
              )}

              {/* Client */}
              {row.cte.Cliente && (
                <span
                  className="font-mono text-[11px] text-muted-foreground sm:ml-auto shrink-0 truncate max-w-[200px]"
                  title={row.cte.Cliente}
                >
                  {row.cte.Cliente}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-5 pb-3">
        <p className="font-mono text-[11px] text-muted-foreground/60">
          Clique em um campo para editar na tabela acima.
        </p>
      </div>
    </div>
  );
};

export default QualityReport;
