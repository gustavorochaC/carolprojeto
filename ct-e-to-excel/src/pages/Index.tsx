import { useState, useEffect, useRef } from 'react';
import { Loader2, Rocket, FileSpreadsheet, Clock, CheckCircle, TrendingUp, AlertTriangle, XCircle } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

    // Carregar chaves já armazenadas para deduplicação
    const existingCTes = await getCTesFromCurrentMonth();
    const existingKeys = new Set(existingCTes.map(c => c.chaveAcesso).filter(Boolean));

    for (let i = 0; i < uploadFiles.length; i++) {
      const uf = uploadFiles[i];
      if (uf.status !== 'pending') continue;

      // Marcar como processando
      setProcessingIndex(i);
      setUploadFiles(prev =>
        prev.map((f, idx) => idx === i ? { ...f, status: 'processing' } : f)
      );

      try {
        const data = await extractCTeData(uf.file);

        // Checar duplicata por chave de acesso
        if (data.chaveAcesso && existingKeys.has(data.chaveAcesso)) {
          setUploadFiles(prev =>
            prev.map((f, idx) => idx === i ? { ...f, status: 'duplicate' } : f)
          );
          summary.duplicate++;
          continue;
        }

        // Salvar no storage
        await addCTeToStorage(data);
        if (data.chaveAcesso) existingKeys.add(data.chaveAcesso);

        // Verificar qualidade
        const missing = getMissingFields(data);
        const status: UploadFile['status'] = missing.length > 0 ? 'done' : 'done';

        setUploadFiles(prev =>
          prev.map((f, idx) => idx === i ? { ...f, status } : f)
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

    // Recarregar lista atualizada do storage
    const updatedCTes = await getCTesFromCurrentMonth();
    setMonthCount(updatedCTes.length);
    setAllMonthCTes(updatedCTes);

    setBatchSummary(summary);
    setBatchDone(true);
    setProcessingIndex(null);
    setProcessing(false);
  };

  const handleEditField = (_chaveAcesso: string, _column: ExcelColumnKey) => {
    // Scroll to ExcelPreview so user can see and edit the field
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
  const processingCount = uploadFiles.filter(f => f.status === 'processing').length;
  const totalToProcess = uploadFiles.filter(f => f.status === 'pending' || f.status === 'processing').length;
  const processedSoFar = uploadFiles.filter(f => ['done', 'error', 'duplicate'].includes(f.status)).length;

  return (
    <>
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 text-md">
            Gerencie suas extrações e exporte para Excel
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Sistema online
        </div>
      </header>

      {/* Stats Cards Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2 border-none shadow-md bg-gradient-to-br from-card to-card/50 card-hover">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base font-medium">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <span>Progresso Mensal</span>
              </div>
              <Badge variant="secondary" className="font-normal px-2.5 py-0.5 text-xs">
                {getMonthName(getCurrentMonthYear().month)} {getCurrentMonthYear().year}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-3xl font-bold text-primary">{monthCount}</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-primary-foreground">
                    <Rocket className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight">{monthCount}</p>
                  <p className="text-sm text-muted-foreground font-medium">
                    CT-e(s) processados este mês
                  </p>
                </div>
              </div>

              <div className="w-full md:w-auto flex flex-col items-end gap-2">
                <Button
                  onClick={handleDownload}
                  disabled={monthCount === 0}
                  variant="outline"
                  className="w-full md:w-auto gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all btn-press"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Baixar Relatório
                </Button>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  Salvamento automático ativo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-card to-card/50 card-hover">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <div className="p-2 rounded-lg bg-amber/10">
                <Clock className="w-5 h-5 text-amber" />
              </div>
              <span>Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Sistema</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Online</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Processamento</span>
              <span className="text-sm font-medium">{processing ? 'Em andamento' : 'Pronto'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                Versão 1.3.0
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Area */}
      <div className="flex flex-col items-center justify-center py-4">
        <div className="w-full max-w-2xl mx-auto space-y-6">
          <div className="rounded-xl border border-border bg-card shadow-lg p-2">
            <UploadArea
              files={uploadFiles}
              onFilesSelect={handleFilesSelect}
              onFileRemove={handleFileRemove}
              disabled={processing}
            />
          </div>

          {/* Progress bar */}
          {processing && uploadFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  Processando {processedSoFar + 1} de {processedSoFar + totalToProcess}...
                </span>
                <span className="font-medium text-primary">
                  {Math.round((processedSoFar / uploadFiles.length) * 100)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${(processedSoFar / uploadFiles.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Batch summary */}
          {batchDone && batchSummary && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <p className="text-sm font-semibold text-foreground">Resumo do processamento</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Sucesso</p>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">{batchSummary.success}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Incompleto</p>
                    <p className="font-bold text-amber-600 dark:text-amber-400">{batchSummary.incomplete}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-destructive" />
                  <div>
                    <p className="text-xs text-muted-foreground">Erro</p>
                    <p className="font-bold text-destructive">{batchSummary.error}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Duplicado</p>
                    <p className="font-bold text-muted-foreground">{batchSummary.duplicate}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={processBatch}
            disabled={pendingCount === 0 || processing}
            size="lg"
            className={cn(
              "w-full h-14 gap-2 font-bold text-lg shadow-lg transition-all hover:shadow-primary/25 hover:-translate-y-0.5",
              processing && "opacity-80 cursor-not-allowed"
            )}
          >
            {processing ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Processando {processedSoFar + 1} de {processedSoFar + totalToProcess}...
              </>
            ) : (
              <>
                <Rocket className="w-6 h-6" />
                {pendingCount > 1
                  ? `Extrair ${pendingCount} CT-es`
                  : 'Extrair Dados do CT-e'}
              </>
            )}
          </Button>

          {error && <ErrorMessage message={error} />}

          {/* Clear button after batch */}
          {batchDone && uploadFiles.length > 0 && (
            <Button
              onClick={() => {
                setUploadFiles([]);
                setBatchSummary(null);
                setBatchDone(false);
                setLastExtracted(null);
              }}
              variant="outline"
              className="w-full gap-2 h-12"
              size="lg"
            >
              <Rocket className="w-5 h-5" />
              Processar Novos CT-es
            </Button>
          )}
        </div>
      </div>

      {/* Last extracted result card */}
      {lastExtracted && (
        <div className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
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
        <div ref={excelPreviewRef} className="w-full max-w-6xl mx-auto animate-in fade-in duration-500">
          <ExcelPreview
            data={allMonthCTes}
            onDataUpdate={(updatedData) => setAllMonthCTes(updatedData)}
          />
        </div>
      )}

      {/* Quality Report */}
      {allMonthCTes.length > 0 && (
        <div className="w-full max-w-6xl mx-auto animate-in fade-in duration-500">
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
