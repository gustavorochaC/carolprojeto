import { Upload, FileText, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface UploadFile {
  file: File;
  status: 'pending' | 'processing' | 'done' | 'error' | 'duplicate';
  error?: string;
}

interface UploadAreaProps {
  files: UploadFile[];
  onFilesSelect: (files: File[]) => void;
  onFileRemove: (index: number) => void;
  disabled?: boolean;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

const StatusIcon = ({ status }: { status: UploadFile['status'] }) => {
  if (status === 'done') return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
  if (status === 'error') return <AlertCircle className="w-4 h-4 text-destructive shrink-0" />;
  if (status === 'duplicate') return <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />;
  if (status === 'processing') return (
    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
  );
  return <FileText className="w-4 h-4 text-muted-foreground shrink-0" />;
};

const UploadArea = ({ files, onFilesSelect, onFileRemove, disabled }: UploadAreaProps) => {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (disabled) return;

      const dropped = Array.from(e.dataTransfer.files).filter(
        f => f.type === 'application/pdf'
      );
      if (dropped.length > 0) onFilesSelect(dropped);
    },
    [onFilesSelect, disabled]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).filter(
      f => f.type === 'application/pdf'
    );
    if (selected.length > 0) onFilesSelect(selected);
    e.target.value = '';
  };

  const hasPending = files.some(f => f.status === 'pending');

  return (
    <div className="space-y-4">
      <div
        onClick={() => !disabled && document.getElementById('file-input')?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={cn(
          'border-2 border-dashed p-12 text-center cursor-pointer',
          'transition-all duration-200 bg-secondary/30',
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-secondary/50 hover:border-primary active:shadow-xs'
        )}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-semibold mb-2">
          Arraste CT-es aqui ou clique para selecionar
        </p>
        <p className="text-sm text-muted-foreground font-mono">
          Vários PDFs de uma vez — máx. 10MB cada
        </p>
        <input
          id="file-input"
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {files.length > 0 && (
        <div className="rounded-lg border border-border/60 overflow-hidden divide-y divide-border/40">
          {files.map((uf, idx) => (
            <div
              key={idx}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                uf.status === 'processing' && 'bg-primary/5',
                uf.status === 'done' && 'bg-emerald-500/5',
                uf.status === 'error' && 'bg-destructive/5',
                uf.status === 'duplicate' && 'bg-amber-500/5',
                uf.status === 'pending' && 'bg-background'
              )}
            >
              <StatusIcon status={uf.status} />

              <span className="flex-1 truncate font-medium text-foreground/80" title={uf.file.name}>
                {uf.file.name}
              </span>

              <span className="text-xs text-muted-foreground shrink-0 font-mono">
                {formatFileSize(uf.file.size)}
              </span>

              {uf.status === 'duplicate' && (
                <span className="text-xs text-amber-600 dark:text-amber-400 shrink-0">
                  Duplicado
                </span>
              )}
              {uf.status === 'error' && uf.error && (
                <span className="text-xs text-destructive shrink-0 max-w-[140px] truncate" title={uf.error}>
                  {uf.error}
                </span>
              )}

              {(uf.status === 'pending') && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={(e) => { e.stopPropagation(); onFileRemove(idx); }}
                  disabled={disabled}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ))}

          {hasPending && (
            <div className="px-4 py-2 bg-muted/20 text-xs text-muted-foreground">
              {files.filter(f => f.status === 'pending').length} arquivo(s) aguardando processamento
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadArea;
