import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import "./NotificationProvider.css";

const NotificationContext = createContext(null);

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertCircle,
  info: Info
};

function inferType(message = "") {
  const text = String(message).toLowerCase();
  if (text.includes("success") || text.includes("created") || text.includes("updated")) return "success";
  if (text.includes("error") || text.includes("failed") || text.includes("invalid") || text.includes("cannot")) return "error";
  if (text.includes("please") || text.includes("required") || text.includes("not enough")) return "warning";
  return "info";
}

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message, type) => {
    const id = `${Date.now()}-${Math.random()}`;
    const resolvedType = type || inferType(message);
    setToasts((current) => [
      ...current,
      { id, message: String(message), type: resolvedType }
    ]);
    window.setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);

  const confirm = useCallback((options) => {
    const config = typeof options === "string" ? { message: options } : options;

    return new Promise((resolve) => {
      setDialog({
        title: config.title || "Please confirm",
        message: config.message || "Are you sure?",
        confirmText: config.confirmText || "Confirm",
        cancelText: config.cancelText || "Cancel",
        tone: config.tone || "default",
        resolve
      });
    });
  }, []);

  const closeDialog = useCallback((result) => {
    setDialog((current) => {
      current?.resolve(result);
      return null;
    });
  }, []);

  useEffect(() => {
    const nativeAlert = window.alert;
    window.alert = (message) => notify(message);

    return () => {
      window.alert = nativeAlert;
    };
  }, [notify]);

  const value = useMemo(() => ({ notify, confirm }), [notify, confirm]);
  const DialogIcon = dialog?.tone === "danger" ? AlertCircle : Info;

  return (
    <NotificationContext.Provider value={value}>
      {children}

      <div className="toast-viewport" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => {
          const Icon = icons[toast.type] || Info;
          return (
            <div className={`app-toast ${toast.type}`} key={toast.id}>
              <Icon size={18} />
              <p>{toast.message}</p>
              <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {dialog && (
        <div className="confirm-backdrop" role="presentation">
          <div className={`confirm-dialog ${dialog.tone}`} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <div className="confirm-icon">
              <DialogIcon size={20} />
            </div>
            <h2 id="confirm-title">{dialog.title}</h2>
            <p>{dialog.message}</p>
            <div className="confirm-actions">
              <button type="button" className="confirm-cancel" onClick={() => closeDialog(false)}>
                {dialog.cancelText}
              </button>
              <button type="button" className="confirm-primary" onClick={() => closeDialog(true)}>
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used inside NotificationProvider");
  }
  return context;
}
