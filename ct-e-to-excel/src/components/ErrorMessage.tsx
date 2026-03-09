import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
}

const ErrorMessage = ({ message }: ErrorMessageProps) => {
  return (
    <div className="border-2 border-destructive bg-destructive/10 p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-bold text-destructive">Erro</p>
        <p className="text-sm text-foreground">{message}</p>
      </div>
    </div>
  );
};

export default ErrorMessage;
