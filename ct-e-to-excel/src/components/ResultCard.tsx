import { CheckCircle, Download, AlertTriangle, FileCheck, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CTeData } from '@/lib/pdfExtractor';

interface ResultCardProps {
  data: CTeData;
  fieldsCount: number;
  missingFields: string[];
  onDownload: () => void;
}

const ResultCard = ({ data, fieldsCount, missingFields, onDownload }: ResultCardProps) => {
  const isComplete = missingFields.length === 0;

  return (
    <div className={cn(
      "rounded-lg border bg-card overflow-hidden",
      isComplete
        ? "border-emerald-500/30"
        : "border-amber-500/30"
    )}>
      {/* Header bar */}
      <div className={cn(
        "px-5 py-3 flex items-center gap-3 border-b",
        isComplete
          ? "bg-emerald-500/10 border-emerald-500/20"
          : "bg-amber-500/10 border-amber-500/20"
      )}>
        <div className={cn(
          "w-7 h-7 rounded flex items-center justify-center",
          isComplete ? "bg-emerald-500/15" : "bg-amber-500/15"
        )}>
          <FileCheck className={cn("w-4 h-4", isComplete ? "text-emerald-500" : "text-amber-500")} />
        </div>
        <div className="flex-1">
          <p className="font-display font-600 text-sm tracking-wide text-foreground">
            CT-e Processado
            {isComplete && (
              <span className="ml-2 font-mono text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded">
                COMPLETO
              </span>
            )}
          </p>
          <p className="font-mono text-[10px] text-muted-foreground">
            {fieldsCount} campos extraídos
          </p>
        </div>
        {isComplete && (
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {/* Quick stats */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded bg-muted/50 px-3 py-2">
            <Hash className="w-3.5 h-3.5 text-muted-foreground" />
            <div>
              <p className="font-mono text-[10px] text-muted-foreground uppercase">Número CT-e</p>
              <p className="font-mono text-sm font-medium text-foreground leading-tight">
                {data.Numero_CTe || '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded bg-primary/10 border border-primary/20 px-3 py-2">
            <div>
              <p className="font-mono text-[10px] text-muted-foreground uppercase">Campos extraídos</p>
              <p className="font-display font-700 text-2xl text-primary leading-tight">{fieldsCount}</p>
            </div>
          </div>
        </div>

        {/* Missing fields */}
        {missingFields.length > 0 && (
          <div className="rounded border border-amber-500/25 bg-amber-500/5 px-4 py-3">
            <p className="font-mono text-[11px] text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Campos não encontrados — {missingFields.length}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {missingFields.map((field) => (
                <span
                  key={field}
                  className="font-mono text-[11px] px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                >
                  {field}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Reminder note */}
        <div className="flex items-start gap-2.5 rounded bg-muted/40 px-4 py-3 border border-border/50">
          <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Preencha a coluna{' '}
            <span className="font-mono text-foreground/80 bg-muted px-1 rounded">Placa Veículo</span>
            {' '}na planilha usando sua programação de carregamento antes de utilizar os dados.
          </p>
        </div>

        {/* Download button */}
        <Button
          onClick={onDownload}
          className="w-full h-10 gap-2 font-display font-600 tracking-wide btn-press bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Download className="w-4 h-4" />
          Baixar Planilha Excel
        </Button>
      </div>
    </div>
  );
};

export default ResultCard;
