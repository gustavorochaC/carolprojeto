import { Upload, FileText, X, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useCallback, useState } from 'react';
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

const statusConfig = {
  done:       { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'OK'         },
  error:      { icon: AlertCircle,  color: 'text-red-500',     bg: 'bg-red-500/10',     label: 'ERRO'       },
  duplicate:  { icon: AlertCircle,  color: 'text-amber-500',   bg: 'bg-amber-500/10',   label: 'DUPLICADO'  },
  processing: { icon: Clock,        color: 'text-primary',     bg: 'bg-primary/10',     label: 'PROC.'      },
  pending:    { icon: FileText,     color: 'text-muted-foreground', bg: 'bg-transparent', label: 'AGUARD.'  },
};

const StatusBadge = ({ status }: { status: UploadFile['status'] }) => {
  const cfg = statusConfig[status];
  const Icon = cfg.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 font-mono text-[10px] font-medium px-1.5 py-0.5 rounded",
      "border",
      status === 'done'      && "text-emerald-700 dark:text-emerald-400 border-emerald-500/25 bg-emerald-500/10",
      status === 'error'     && "text-red-700 dark:text-red-400 border-red-500/25 bg-red-500/10",
      status === 'duplicate' && "text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/10",
      status === 'processing'&& "text-primary border-primary/25 bg-primary/10",
      status === 'pending'   && "text-muted-foreground border-border bg-muted/40",
    )}>
      {status === 'processing' ? (
        <span className="w-2 h-2 rounded-full bg-primary inline-block pulse-amber" />
      ) : (
        <Icon className="w-2.5 h-2.5" />
      )}
      {cfg.label}
    </span>
  );
};

const UploadArea = ({ files, onFilesSelect, onFileRemove, disabled }: UploadAreaProps) => {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
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
    if (!disabled) setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).filter(
      f => f.type === 'application/pdf'
    );
    if (selected.length > 0) onFilesSelect(selected);
    e.target.value = '';
  };

  const hasPending = files.some(f => f.status === 'pending');

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onClick={() => !disabled && document.getElementById('file-input')?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-10 text-center',
          'transition-all duration-200 cursor-pointer select-none',
          dragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : disabled
              ? 'border-border/40 bg-muted/20 opacity-50 cursor-not-allowed'
              : 'border-border hover:border-primary/50 hover:bg-muted/30 bg-muted/10'
        )}
      >
        <div className={cn(
          "w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center transition-colors",
          dragging ? "bg-primary/15 text-primary" : "bg-muted/60 text-muted-foreground"
        )}>
          <Upload className="w-6 h-6" />
        </div>

        <p className="font-display font-600 text-base text-foreground mb-1 tracking-wide">
          {dragging ? 'Solte os arquivos aqui' : 'Arraste CT-es aqui ou clique para selecionar'}
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          PDF · vários arquivos · máx. 10 MB cada
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

      {/* File list */}
      {files.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="bg-muted/30 border-b border-border px-4 py-2 flex items-center justify-between">
            <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">
              Arquivos — {files.length}
            </span>
            {hasPending && (
              <span className="font-mono text-[11px] text-muted-foreground">
                {files.filter(f => f.status === 'pending').length} aguardando
              </span>
            )}
          </div>

          <div className="divide-y divide-border/50">
            {files.map((uf, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 text-sm',
                  'transition-colors duration-100',
                  uf.status === 'processing' && 'bg-primary/5',
                  uf.status === 'done'       && 'bg-emerald-500/5',
                  uf.status === 'error'      && 'bg-red-500/5',
                  uf.status === 'duplicate'  && 'bg-amber-500/5',
                  uf.status === 'pending'    && 'bg-transparent',
                )}
              >
                <FileText className="w-4 h-4 text-muted-foreground/60 shrink-0" />

                <span className="flex-1 truncate font-medium text-foreground/80 text-[13px]" title={uf.file.name}>
                  {uf.file.name}
                </span>

                <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                  {formatFileSize(uf.file.size)}
                </span>

                <StatusBadge status={uf.status} />

                {uf.status === 'error' && uf.error && (
                  <span
                    className="font-mono text-[11px] text-red-600 dark:text-red-400 shrink-0 max-w-[130px] truncate"
                    title={uf.error}
                  >
                    {uf.error}
                  </span>
                )}

                {uf.status === 'pending' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onFileRemove(idx); }}
                    disabled={disabled}
                    className="ml-1 w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadArea;
