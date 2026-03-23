/**
 * Autonomous — Toast Notification System
 *
 * Provides a global toast notification context and component for
 * displaying real-time alerts, success messages, and error notifications.
 *
 * Usage:
 *   const { addToast } = useToast();
 *   addToast({ type: "success", title: "Agent Created", message: "Recon-Alpha is online" });
 */

import React, { createContext, useContext, useState, useCallback, useRef } from "react";

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const addToast = useCallback(
    ({ type = "info", title, message, duration = 5000 }) => {
      const id = ++toastId;
      const toast = { id, type, title, message, createdAt: Date.now() };
      setToasts((prev) => [...prev.slice(-9), toast]); // Keep max 10

      if (duration > 0) {
        timersRef.current[id] = setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast, toasts }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Toast Container & Individual Toast                                  */
/* ------------------------------------------------------------------ */

function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const iconMap = {
    success: "\u2713",
    error: "\u2717",
    warning: "\u26A0",
    info: "\u2139",
  };

  return (
    <div className={`toast-item toast-${toast.type}`}>
      <div className="toast-icon">{iconMap[toast.type] || iconMap.info}</div>
      <div className="toast-body">
        {toast.title && <div className="toast-title">{toast.title}</div>}
        {toast.message && <div className="toast-message">{toast.message}</div>}
      </div>
      <button className="toast-close" onClick={() => onDismiss(toast.id)}>
        &times;
      </button>
    </div>
  );
}
