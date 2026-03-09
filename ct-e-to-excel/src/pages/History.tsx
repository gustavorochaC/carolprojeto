import { useState, useEffect, useCallback } from 'react';
import { Trash2, FileSpreadsheet, AlertCircle, Search, FileText, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
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

  // Load available months list for navigation hints
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
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Histórico de Arquivos</h1>
          <p className="text-muted-foreground mt-1">
            CT-es processados em {getMonthName(month)} de {year}
          </p>
        </div>
        <Button
          onClick={handleDownloadExcel}
          disabled={ctes.length === 0}
          className="gap-2 shadow-sm"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Baixar Excel do Mês
        </Button>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigateMonth(-1)}
          className="h-9 w-9"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-2 min-w-[180px] justify-center">
          <span className="font-semibold text-foreground">
            {getMonthName(month)} {year}
          </span>
          {hasData && (
            <Badge variant="secondary" className="text-xs">
              {ctes.length} CT-e(s)
            </Badge>
          )}
          {!hasData && !loading && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Sem dados
            </Badge>
          )}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => navigateMonth(1)}
          disabled={year === today.year && month === today.month}
          className="h-9 w-9"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid gap-6">
        <Card className="border-none shadow-md bg-gradient-to-br from-card to-card/50 card-hover">
          <CardHeader className="pb-4 border-b border-border/50 bg-muted/20">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                Arquivos Processados
                <Badge variant="secondary" className="ml-2 bg-background/80 backdrop-blur">
                  {ctes.length} total
                </Badge>
              </CardTitle>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, chave, cliente..."
                  className="pl-9 bg-background/50 border-primary/20 focus:ring-primary/20 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="rounded-lg border border-border/50 overflow-hidden bg-background/40">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-muted/30 border-border/50 bg-muted/10">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data Emissão</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Número</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Origem</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cliente</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor NF</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">NF Referência</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                          <p>Carregando registros...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredCtes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="p-3 rounded-full bg-muted">
                            <FileText className="w-8 h-8 opacity-20" />
                          </div>
                          <div>
                            <p className="font-medium">Nenhum arquivo encontrado</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {searchTerm
                                ? 'Tente uma busca diferente'
                                : `Nenhum CT-e em ${getMonthName(month)} de ${year}`}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCtes.map((cte, index) => (
                      <TableRow
                        key={cte.chaveAcesso || index}
                        className="table-row-hover border-border/50"
                      >
                        <TableCell className="font-medium text-foreground/80">{cte.Data}</TableCell>
                        <TableCell>
                          <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">
                            {cte.Numero_CTe}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate" title={cte.Origem}>
                          <span className="truncate block">{cte.Origem}</span>
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate" title={cte.Cliente}>
                          <span className="truncate block">{cte.Cliente}</span>
                        </TableCell>
                        <TableCell>
                          {cte.Valor_NF ? (
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                              R$ {cte.Valor_NF.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {cte.NF_Referencia || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="scale-100 animate-scale-in">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                  <div className="p-2 rounded-full bg-destructive/10">
                                    <AlertCircle className="w-5 h-5 text-destructive" />
                                  </div>
                                  Excluir CT-e?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Isso removerá o CT-e <span className="font-mono font-medium">{cte.Numero_CTe}</span> do banco de dados.
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="transition-all">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(cte.chaveAcesso)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all"
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
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>Mostrando {filteredCtes.length} de {ctes.length} registros</span>
              {filteredCtes.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadExcel}
                  className="gap-1 h-8 text-muted-foreground hover:text-foreground"
                >
                  <Download className="w-3 h-3" />
                  Exportar todos
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default History;
