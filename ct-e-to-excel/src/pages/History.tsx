import { useState, useEffect, useCallback } from 'react';
import { Trash2, FileSpreadsheet, AlertCircle, Search, FileText, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getCTesByMonth, deleteCTe, getAllMonths } from '@/lib/storage';
import { generateExcel } from '@/lib/excelGenerator';
import { getCurrentMonthYear, getMonthName } from '@/lib/utils';
import type { CTeData } from '@/lib/pdfExtractor';

const History = () => {
  const today = getCurrentMonthYear();
  const [year, setYear] = useState(today.year);
  const [month, setMonth] = useState(today.month);
  const [ctes, setCtes] = useState<CTeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCTesByMonth(year, month);
      setCtes(data);
    } catch (error) {
      console.error('Failed to load CTEs', error);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    getAllMonths().then(setAvailableMonths);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const navigateMonth = (delta: number) => {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
    setMonth(newMonth);
    setYear(newYear);
    setSearchTerm('');
  };

  const currentKey = `${year}-${String(month).padStart(2, '0')}`;
  const hasData = availableMonths.includes(currentKey);
  const isCurrentMonth = year === today.year && month === today.month;

  const handleDelete = async (chaveAcesso: string) => {
    try {
      await deleteCTe(chaveAcesso, year, month);
      await loadData();
    } catch (error) {
      console.error('Failed to delete CTE', error);
    }
  };

  const handleDownloadExcel = () => {
    if (ctes.length > 0) {
      generateExcel(ctes);
    }
  };

  const filteredCtes = ctes.filter(cte =>
    cte.Origem?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cte.Numero_CTe?.includes(searchTerm) ||
    cte.chaveAcesso?.includes(searchTerm) ||
    cte.Cliente?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Page header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-border/50">
        <div>
          <h1 className="font-display font-800 text-4xl tracking-wide text-foreground leading-none">
            Histórico
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            CT-es processados em{' '}
            <span className="text-foreground font-medium">
              {getMonthName(month)} {year}
            </span>
          </p>
        </div>
        <Button
          onClick={handleDownloadExcel}
          disabled={ctes.length === 0}
          className="gap-2 font-display font-600 tracking-wide btn-press bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Baixar Excel do Mês
        </Button>
      </header>

      {/* Month navigator */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
        <button
          onClick={() => navigateMonth(-1)}
          className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center gap-1">
          <span className="font-display font-600 text-lg tracking-wide text-foreground">
            {getMonthName(month)} {year}
          </span>
          <div className="flex items-center gap-2">
            {loading ? (
              <span className="font-mono text-[10px] text-muted-foreground">carregando...</span>
            ) : hasData ? (
              <span className="font-mono text-[11px] text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                {ctes.length} CT-e(s)
              </span>
            ) : (
              <span className="font-mono text-[10px] text-muted-foreground border border-dashed border-border rounded px-2 py-0.5">
                sem dados
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => navigateMonth(1)}
          disabled={isCurrentMonth}
          className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Table card */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Card header */}
        <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-muted/60">
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-display font-600 text-sm tracking-wide text-foreground">
                Arquivos Processados
              </p>
              <p className="font-mono text-[10px] text-muted-foreground">
                {ctes.length} total
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar número, cliente..."
              className="pl-9 h-8 text-sm font-mono bg-background border-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 border-border/50 hover:bg-muted/20">
                {['Data Emissão', 'Número', 'Origem', 'Cliente', 'Valor NF', 'NF Ref.', ''].map((h) => (
                  <TableHead key={h} className={`font-mono text-[10px] uppercase tracking-widest text-muted-foreground ${h === '' ? 'text-right w-12' : ''}`}>
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-28 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
                      <p className="font-mono text-[11px] text-muted-foreground">Carregando...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredCtes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <FileText className="w-5 h-5 text-muted-foreground/40" />
                      </div>
                      <p className="font-display font-600 text-sm text-muted-foreground">
                        Nenhum arquivo encontrado
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground/60">
                        {searchTerm
                          ? 'Tente uma busca diferente'
                          : `Nenhum CT-e em ${getMonthName(month)} ${year}`}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCtes.map((cte, index) => (
                  <TableRow
                    key={cte.chaveAcesso || index}
                    className="table-row-hover border-border/40"
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {cte.Data || '—'}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded">
                        {cte.Numero_CTe || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate text-sm" title={cte.Origem}>
                      {cte.Origem || '—'}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-sm font-medium" title={cte.Cliente}>
                      {cte.Cliente || '—'}
                    </TableCell>
                    <TableCell>
                      {cte.Valor_NF ? (
                        <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                          R$ {cte.Valor_NF.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {cte.NF_Referencia || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors ml-auto">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 font-display font-600 text-lg tracking-wide">
                              <div className="p-1.5 rounded bg-red-500/10">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                              </div>
                              Excluir CT-e?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-sm">
                              Isso removerá o CT-e{' '}
                              <span className="font-mono font-medium text-foreground">
                                {cte.Numero_CTe}
                              </span>{' '}
                              permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(cte.chaveAcesso)}
                              className="bg-red-500 hover:bg-red-600 text-white"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        {!loading && (
          <div className="px-5 py-3 border-t border-border/40 bg-muted/10 flex items-center justify-between">
            <span className="font-mono text-[11px] text-muted-foreground">
              {filteredCtes.length} de {ctes.length} registros
            </span>
            {filteredCtes.length > 0 && (
              <button
                onClick={handleDownloadExcel}
                className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <Download className="w-3 h-3" />
                Exportar todos
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default History;
