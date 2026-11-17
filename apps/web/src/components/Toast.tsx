import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

type Tone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  message: string;
  tone: Tone;
}

const ToastContext = createContext<(message: string, tone?: Tone) => void>(
  () => undefined,
);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, tone: Tone = 'info') => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current, { id, message, tone }]);
    setTimeout(
      () => setItems((current) => current.filter((item) => item.id !== id)),
      4200,
    );
  }, []);

  const icons = {
    success: <CheckCircle2 size={16} className="text-success" />,
    error: <AlertTriangle size={16} className="text-danger" />,
    info: <Info size={16} className="text-accent" />,
  };

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-panel2 px-4 py-3 text-sm text-ink shadow-panel"
          >
            <span className="mt-0.5">{icons[item.tone]}</span>
            <span className="flex-1 leading-relaxed">{item.message}</span>
            <button
              type="button"
              onClick={() =>
                setItems((current) => current.filter((entry) => entry.id !== item.id))
              }
              className="text-muted transition hover:text-ink"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
