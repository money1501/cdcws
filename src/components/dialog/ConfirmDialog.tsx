import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, Info, Loader2, Trash2, X } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'primary' | 'warning';
export type ConfirmIconType = 'trash' | 'warning' | 'info' | 'none';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title?: ReactNode;
  message?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: ConfirmIconType;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'danger',
  icon,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Determine icon to display
  const resolvedIcon: ConfirmIconType =
    icon ?? (variant === 'danger' ? 'trash' : variant === 'warning' ? 'warning' : 'info');

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy && !isLoading) {
        onCancel();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, busy, isLoading]);

  // Auto-focus cancel button for safe keyboard navigation
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isWorking = busy || isLoading;

  async function handleConfirmClick() {
    if (isWorking) return;
    try {
      setBusy(true);
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby={message ? 'confirm-dialog-description' : undefined}
      className="fixed inset-0 z-[200000] flex items-center justify-center p-4"
    >
      {/* Dimmed & Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={() => {
          if (!isWorking) onCancel();
        }}
      />

      {/* Centered Modal Container */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl transition-all duration-200 animate-in fade-in zoom-in-95 dark:border-neutral-800 dark:bg-neutral-900">
        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isWorking}
          aria-label="Close dialog"
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 disabled:opacity-40"
        >
          <X size={16} />
        </button>

        {/* Icon & Details */}
        <div className="flex flex-col items-start sm:flex-row sm:items-start sm:gap-4">
          {resolvedIcon !== 'none' && (
            <div className="mb-3 shrink-0 sm:mb-0">
              {resolvedIcon === 'trash' ? (
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-200/80 bg-red-50 text-red-600 shadow-xs dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-400">
                  <Trash2 size={20} />
                </div>
              ) : resolvedIcon === 'warning' ? (
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200/80 bg-amber-50 text-amber-600 shadow-xs dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-400">
                  <AlertTriangle size={20} />
                </div>
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand/20 bg-brand/10 text-brand shadow-xs dark:bg-brand/20 dark:text-brand">
                  <Info size={20} />
                </div>
              )}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h3
              id="confirm-dialog-title"
              className="text-lg font-bold text-neutral-900 dark:text-neutral-50"
            >
              {title}
            </h3>
            {message && (
              <p
                id="confirm-dialog-description"
                className="mt-1.5 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400"
              >
                {message}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            disabled={isWorking}
            className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700/80 dark:focus:ring-neutral-600 dark:focus:ring-offset-neutral-900 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={isWorking}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 focus:ring-red-500 dark:bg-red-600 dark:hover:bg-red-500 dark:focus:ring-red-400 dark:focus:ring-offset-neutral-900'
                : variant === 'warning'
                ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 focus:ring-amber-500 dark:bg-amber-600 dark:hover:bg-amber-500 dark:focus:ring-offset-neutral-900'
                : 'bg-brand hover:bg-brand-hover active:bg-brand focus:ring-brand dark:focus:ring-offset-neutral-900'
            }`}
          >
            {isWorking ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Processing…</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
