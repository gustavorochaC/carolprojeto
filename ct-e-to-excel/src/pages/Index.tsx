import { useState, useEffect, useRef } from 'react';
import { Loader2, FileSpreadsheet, CheckCircle, TrendingUp, AlertTriangle, XCircle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UploadArea, { type UploadFile } from '@/components/UploadArea';
import ResultCard from '@/components/ResultCard';
import ErrorMessage from '@/components/ErrorMessage';
import ExcelPreview from '@/components/ExcelPreview';
import QualityReport from '@/components/QualityReport';
import { extractCTeData, countExtractedFields, getMissingFields, type CTeData } from '@/lib/pdfExtractor';
import { generateExcel } from '@/lib/excelGenerator';
import { addCTeToStorage, getCTesFromCurrentMonth, getCurrentMonthCount } from '@/lib/storage';
import { getCurrentMonthYear, getMonthName } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ExcelColumnKey } from '@/lib/types';

interface BatchSummary {
  success: number;
  incomplete: number;
  error: number;
  duplicate: number;
}

const Index = () => {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processingIndex, setProcessingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [monthCount, setMonthCount] = useState(0);
  const [allMonthCTes, setAllMonthCTes] = useState<CTeData[]>([]);
  const [lastExtracted, setLastExtracted] = useState<CTeData | null>(null);
  const [batchSummary, setBatchSummary] = useState<BatchSummary | null>(null);
  const [batchDone, setBatchDone] = useState(false);
  const excelPreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadMonthCount = async () => {
      const count = await getCurrentMonthCount();
      setMonthCount(count);
    };
    loadMonthCount();
  }, []);

  const handleFilesSelect = (newFiles: File[]) => {
    const MAX_SIZE = 10 * 1024 * 1024;
    const valid: UploadFile[] = [];
    const errors: string[] = [];

    for (const f of newFiles) {
      if (f.size > MAX_SIZE) {
        errors.push(`"${f.name}" excede 10MB`);
      } else {
        valid.push({ file: f, status: 'pending' });
      }
    }

    if (errors.length > 0) {
      setError(errors.join('; '));
    } else {
      setError(null);
    }

    setUploadFiles(prev => [...prev, ...valid]);
    setBatchSummary(null);
    setBatchDone(false);
  };

  const handleFileRemove = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processBatch = async () => {
    const pending = uploadFiles.filter(uf => uf.status === 'pending');
    if (pending.length === 0) {
      setError('Selecione pelo menos um arquivo PDF');
      return;
    }

    setProcessing(true);
    setError(null);
    setBatchSummary(null);
    setBatchDone(false);

    const summary: BatchSummary = { success: 0, incomplete: 0, error: 0, duplicate: 0 };

    const existingCTes = await getCTesFromCurrentMonth();
    const existingKeys = new Set(existingCTes.map(c => c.chaveAcesso).filter(Boolean));

    for (let i = 0; i < uploadFiles.length; i++) {
      const uf = uploadFiles[i];
      if (uf.status !== 'pending') continue;

      setProcessingIndex(i);
      setUploadFiles(prev =>
        prev.map((f, idx) => idx === i ? { ...f, status: 'processing' } : f)
      );

      try {
        const data = await extractCTeData(uf.file);

        if (data.chaveAcesso && existingKeys.has(data.chaveAcesso)) {
          setUploadFiles(prev =>
            prev.map((f, idx) => idx === i ? { ...f, status: 'duplicate' } : f)
          );
          summary.duplicate++;
          continue;
        }

        await addCTeToStorage(data);
        if (data.chaveAcesso) existingKeys.add(data.chaveAcesso);

        const missing = getMissingFields(data);

        setUploadFiles(prev =>
          prev.map((f, idx) => idx === i ? { ...f, status: 'done' } : f)
        );

        if (missing.length > 0) {
          summary.incomplete++;
        } else {
          summary.success++;
        }

        setLastExtracted(data);
      } catch (err: any) {
        const msg = err instanceof Error ? err.message : 'Erro ao processar';
        setUploadFiles(prev =>
          prev.map((f, idx) => idx === i ? { ...f, status: 'error', error: msg } : f)
        );
        summary.error++;
      }
    }

    const updatedCTes = await getCTesFromCurrentMonth();
    setMonthCount(updatedCTes.length);
    setAllMonthCTes(updatedCTes);

    setBatchSummary(summary);
    setBatchDone(true);
    setProcessingIndex(null);
    setProcessing(false);
  };

  const handleEditField = (_chaveAcesso: string, _column: ExcelColumnKey) => {
    excelPreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDownload = async () => {
    try {
      const dataToExport = allMonthCTes.length > 0 ? allMonthCTes : await getCTesFromCurrentMonth();
      if (dataToExport.length === 0) {
        setError('Nenhum CT-e processado este mês ainda.');
        return;
      }
      generateExcel(dataToExport);
    } catch (err) {
      console.error('Download error:', err);
      setError('Erro ao gerar Excel. Tente novamente.');
    }
  };

  const pendingCount = uploadFiles.filter(f => f.status === 'pending').length;
  const processedSoFar = uploadFiles.filter(f => ['done', 'error', 'duplicate'].includes(f.status)).length;
  const totalToProcess = uploadFiles.filter(f => f.status === 'pending' || f.status === 'processing').length;

  const { month, year } = getCurrentMonthYear();

  return (
    <>
      {/* Page header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-border/50">
        <div>
          <h1 className="font-display font-800 text-4xl tracking-wide text-foreground leading-none">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Extraia dados de CT-es em PDF e exporte para Excel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-amber inline-block" />
          <span className="font-mono text-xs text-muted-foreground">SISTEMA ONLINE</span>
        </div>
      </header>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Mensal */}
        <div className="col-span-2 sm:col-span-2 rounded-lg border border-border bg-card px-5 py-4 flex items-center justify-between">
          <div>
            <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest mb-1">
              CT-es — {getMonthName(month)} {year}
            </p>
            <p className="font-display font-700 text-4xl text-foreground leading-none">
              {monthCount}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <Button
              onClick={handleDownload}
              disabled={monthCount === 0}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs border-primary/20 hover:bg-primary/10 hover:text-primary btn-press"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Baixar Excel
            </Button>
          </div>
        </div>

        {/* Status */}
        <div className="rounded-lg border border-border bg-card px-4 py-4">
          <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest mb-2">
            Processamento
          </p>
          <div className="flex items-center gap-2">
            {processing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                <span className="text-sm font-medium text-primary">Em andamento</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-sm font-medium">Pronto</span>
              </>
            )}
          </div>
        </div>

        {/* Versão */}
        <div className="rounded-lg border border-border bg-card px-4 py-4">
          <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest mb-2">
            Versão
          </p>
          <Badge
            variant="outline"
            className="font-mono text-xs border-primary/30 text-primary bg-primary/10"
          >
            v1.3.0
          </Badge>
          <p className="font-mono text-[10px] text-muted-foreground/50 mt-1.5">
            100% local
          </p>
        </div>
      </div>

      {/* Upload section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-display font-600 text-lg tracking-wide text-foreground">
            Importar CT-es
          </span>
          <span className="font-mono text-[11px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
            PDF
          </span>
        </div>

        <UploadArea
          files={uploadFiles}
          onFilesSelect={handleFilesSelect}
          onFileRemove={handleFileRemove}
          disabled={processing}
        />

        {/* Progress bar */}
        {processing && uploadFiles.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground">
                Processando {processedSoFar + 1} / {processedSoFar + totalToProcess}
              </span>
              <span className="text-primary font-medium">
                {Math.round((processedSoFar / uploadFiles.length) * 100)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${(processedSoFar / uploadFiles.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Batch summary */}
        {batchDone && batchSummary && (
          <div className="rounded-lg border border-border bg-card p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest mb-3">
              Resumo do Processamento
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground">SUCESSO</p>
                  <p className="font-display font-700 text-xl text-emerald-600 dark:text-emerald-400 leading-tight">
                    {batchSummary.success}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground">INCOMFL.</p>
                  <p className="font-display font-700 text-xl text-amber-600 dark:text-amber-400 leading-tight">
                    {batchSummary.incomplete}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-red-500/10 flex items-center justify-center">
                  <XCircle className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground">ERRO</p>
                  <p className="font-display font-700 text-xl text-red-600 dark:text-red-400 leading-tight">
                    {batchSummary.error}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-muted flex items-center justify-center">
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground">DUPLIC.</p>
                  <p className="font-display font-700 text-xl text-muted-foreground leading-tight">
                    {batchSummary.duplicate}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Primary action button */}
        <Button
          onClick={processBatch}
          disabled={pendingCount === 0 || processing}
          size="lg"
          className={cn(
            "w-full h-12 gap-2 font-display font-600 text-base tracking-wide btn-press",
            "bg-primary hover:bg-primary/90 text-primary-foreground",
            "shadow-md hover:shadow-primary/20 transition-all",
            processing && "opacity-70 cursor-not-allowed"
          )}
        >
          {processing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processando {processedSoFar + 1} de {processedSoFar + totalToProcess}...
            </>
          ) : (
            <>
              <FileSpreadsheet className="w-5 h-5" />
              {pendingCount > 1
                ? `Extrair ${pendingCount} CT-es`
                : 'Extrair Dados do CT-e'}
            </>
          )}
        </Button>

        {error && <ErrorMessage message={error} />}

        {batchDone && uploadFiles.length > 0 && (
          <button
            onClick={() => {
              setUploadFiles([]);
              setBatchSummary(null);
              setBatchDone(false);
              setLastExtracted(null);
            }}
            className="w-full h-10 text-sm font-medium text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-border/80 rounded-lg transition-colors"
          >
            Limpar e processar novos CT-es
          </button>
        )}
      </div>

      {/* Last extracted result */}
      {lastExtracted && (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-400">
          <ResultCard
            data={lastExtracted}
            fieldsCount={countExtractedFields(lastExtracted)}
            missingFields={getMissingFields(lastExtracted)}
            onDownload={handleDownload}
          />
        </div>
      )}

      {/* Excel Preview */}
      {allMonthCTes.length > 0 && (
        <div ref={excelPreviewRef} className="animate-in fade-in duration-400">
          <ExcelPreview
            data={allMonthCTes}
            onDataUpdate={(updatedData) => setAllMonthCTes(updatedData)}
          />
        </div>
      )}

      {/* Quality Report */}
      {allMonthCTes.length > 0 && (
        <div className="animate-in fade-in duration-400">
          <QualityReport
            data={allMonthCTes}
            onEditField={handleEditField}
          />
        </div>
      )}
    </>
  );
};

export default Index;
