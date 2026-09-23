import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext(null);

const ICONS = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
const COLORS = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error:   'bg-red-50 border-red-200 text-red-800',
  info:    'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
};

function ToastItem({ toast, onRemove }) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), toast.duration ?? 3500);
    return () => clearTimeout(t);
  }, [toast, onRemove]);

  return (
    <div
      className={`flex items-start gap-2 px-4 py-3 rounded-xl border shadow-lg text-sm
        animate-slide-in max-w-sm w-full ${COLORS[toast.type ?? 'info']}`}
    >
      <span className="flex-shrink-0 mt-0.5">{ICONS[toast.type ?? 'info']}</span>
      <p className="flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 opacity-50 hover:opacity-100 transition ml-1"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Portal-style fixed overlay */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx.addToast;
}
