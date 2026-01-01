"use client";

import { useState, createContext, useContext, useCallback, ReactNode } from "react";
import { Snackbar, Alert, AlertTitle, IconButton, Slide, Box } from "@mui/material";
import { TransitionProps } from "@mui/material/transitions";
import CloseIcon from "@mui/icons-material/Close";

/**
 * M3 Toast component
 * 
 * Replaces: Custom toast with framer-motion animations
 * M3 Component: Snackbar with Alert content
 * Why: MUI Snackbar provides proper positioning, auto-dismiss,
 *      and accessibility features. Alert provides styled content.
 * Styles: Success/error/warning/info color variants, M3 border radius
 */

interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
}

interface ToastItem {
  id: number;
  type: "success" | "error" | "warning" | "info";
  message: string;
  title?: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  success: (message: string, options?: ToastOptions) => number;
  error: (message: string, options?: ToastOptions) => number;
  warning: (message: string, options?: ToastOptions) => number;
  info: (message: string, options?: ToastOptions) => number;
}

// Toast context for global access
const ToastContext = createContext<ToastContextType | null>(null);

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

// Slide transition from top
function SlideTransition(props: TransitionProps & { children: React.ReactElement }) {
  return <Slide {...props} direction="down" />;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...toast, id }]);

    // Auto dismiss
    if (toast.duration !== 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration || 3000);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const toast: ToastContextType = {
    success: (message: string, options: ToastOptions = {}) =>
      addToast({ type: "success", message, ...options }),
    error: (message: string, options: ToastOptions = {}) =>
      addToast({ type: "error", message, ...options }),
    warning: (message: string, options: ToastOptions = {}) =>
      addToast({ type: "warning", message, ...options }),
    info: (message: string, options: ToastOptions = {}) =>
      addToast({ type: "info", message, ...options }),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: ToastItem[];
  removeToast: (id: number) => void;
}

function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        pointerEvents: "none",
        p: 2,
        pt: "calc(16px + env(safe-area-inset-top))",
      }}
    >
      <Box
        sx={{
          maxWidth: 400,
          mx: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {toasts.map((toast) => (
          <ToastNotification
            key={toast.id}
            toast={toast}
            onDismiss={() => removeToast(toast.id)}
          />
        ))}
      </Box>
    </Box>
  );
}

interface ToastNotificationProps {
  toast: ToastItem;
  onDismiss: () => void;
}

function ToastNotification({ toast, onDismiss }: ToastNotificationProps) {
  const { type, message, title, description } = toast;

  // Map types to MUI severity
  const severityMap: Record<string, "success" | "error" | "warning" | "info"> = {
    success: "success",
    error: "error",
    warning: "warning",
    info: "info",
  };

  return (
    <Snackbar
      open={true}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      TransitionComponent={SlideTransition}
      sx={{
        position: "relative",
        pointerEvents: "auto",
        top: "auto !important",
        left: "auto !important",
        right: "auto !important",
        bottom: "auto !important",
        transform: "none !important",
      }}
    >
      <Alert
        severity={severityMap[type]}
        variant="filled"
        onClose={onDismiss}
        action={
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={onDismiss}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
        sx={{
          width: "100%",
          borderRadius: 3,
          alignItems: "flex-start",
          "& .MuiAlert-message": {
            flex: 1,
          },
          "& .MuiAlert-action": {
            pt: 0,
          },
        }}
      >
        {title && <AlertTitle sx={{ fontWeight: 500 }}>{title}</AlertTitle>}
        <Box>
          {message}
          {description && (
            <Box
              component="span"
              sx={{
                display: "block",
                fontSize: "0.75rem",
                opacity: 0.8,
                mt: 0.5,
              }}
            >
              {description}
            </Box>
          )}
        </Box>
      </Alert>
    </Snackbar>
  );
}

export default ToastNotification;
