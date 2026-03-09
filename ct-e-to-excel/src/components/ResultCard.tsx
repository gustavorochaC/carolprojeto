import { CheckCircle, Download, AlertTriangle, FileCheck, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CTeData } from '@/lib/pdfExtractor';

interface ResultCardProps {
  data: CTeData;
  fieldsCount: number;
  missingFields: string[];
  onDownload: () => void;
}

const ResultCard = ({ data, fieldsCount, missingFields, onDownload }: ResultCardProps) => {
  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-card to-card/50 card-hover">
      <CardHeader className="pb-4 border-b border-border/50 bg-muted/20">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="p-2 rounded-lg bg-emerald/10">
            <FileCheck className="w-5 h-5 text-emerald" />
          </div>
          <span className="flex items-center gap-2">
            CT-e Processado com Sucesso!
            <CheckCircle className="w-5 h-5 text-emerald" />
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Stats Row */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-primary/10">
            <ClipboardList className="w-5 h-5 text-primary" />
            <div>
              <p className="text-2xl font-bold text-primary">{fieldsCount}</p>
              <p className="text-xs text-muted-foreground">Campos extraídos</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-muted">
            <div className="p-1.5 rounded bg-primary/10">
              <FileCheck className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold font-mono">{data.Numero_CTe || 'N/A'}</p>
              <p className="text-xs text-muted-foreground">Número CT-e</p>
            </div>
          </div>
        </div>

        {/* Missing Fields Alert */}
        {missingFields.length > 0 && (
          <div className="p-4 rounded-lg bg-amber/10 border border-amber/20">
            <p className="text-sm font-semibold text-amber uppercase mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Campos não encontrados ({missingFields.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {missingFields.map((field) => (
                <Badge 
                  key={field} 
                  variant="outline" 
                  className="bg-amber/20 text-amber border-amber/30 font-mono text-xs"
                >
                  {field}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              <strong>Lembre-se:</strong> Preencha a coluna <span className="font-mono text-primary">"Placa Veículo"</span> na planilha usando sua programação de carregamento antes de utilizar os dados.
            </p>
          </div>
        </div>

        {/* Download Button */}
        <Button
          onClick={onDownload}
          className="w-full gap-2 font-semibold h-12 text-base shadow-lg hover:shadow-primary/25 transition-all btn-press"
        >
          <Download className="w-5 h-5" />
          Baixar Planilha Excel
        </Button>
      </CardContent>
    </Card>
  );
};

export default ResultCard;
