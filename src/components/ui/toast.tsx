import { useState, useCallback, createContext, useContext, type ReactNode } from "react";
import { CheckCircle2, X } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextType {
  showToast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-sm border shadow-lg animate-in slide-in-from-right-4 fade-in duration-300 ${
              toast.type === "success"
                ? "bg-panel border-pulse-green/50 text-foreground"
                : toast.type === "error"
                  ? "bg-panel border-pulse-red/50 text-foreground"
                  : "bg-panel border-pulse-cyan/50 text-foreground"
            }`}
          >
            <CheckCircle2 className={`size-4 ${
              toast.type === "success"
                ? "text-pulse-green"
                : toast.type === "error"
                  ? "text-pulse-red"
                  : "text-pulse-cyan"
            }`} />
            <span className="text-sm">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}