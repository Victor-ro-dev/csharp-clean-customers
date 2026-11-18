import { CheckCircle2, AlertCircle } from 'lucide-react';

export interface ToastMessage {
  type: 'success' | 'error';
  text: string;
}

export function Toast({ toast }: { toast: ToastMessage | null }) {
  if (!toast) return null;

  return (
    <div className={`toast ${toast.type}`} role="status" aria-live="polite">
      {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      <span>{toast.text}</span>
    </div>
  );
}
