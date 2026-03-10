import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
}

const ErrorMessage = ({ message }: ErrorMessageProps) => {
  return (
    <div className="rounded border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-start gap-3">
      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
      <div>
        <p className="font-mono text-[11px] text-red-700 dark:text-red-400 uppercase tracking-widest mb-0.5">Erro</p>
        <p className="text-sm text-foreground/80">{message}</p>
      </div>
    </div>
  );
};

export default ErrorMessage;
