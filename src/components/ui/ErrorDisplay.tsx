"use client";

import { ErrorIcon } from "../Icons";

interface ErrorDisplayProps {
  /** A human-readable title for the error. Falls back to "Error" if omitted. */
  title?: string;
  /** A descriptive message. If omitted, uses error.message or a generic fallback. */
  message?: string;
  /** An Error object whose .message is used when no explicit message is given. */
  error?: Error;
  /** When provided, a retry button is rendered that calls this callback. */
  onRetry?: () => void;
}

/**
 * Inline error display for content areas.
 *
 * - Extracts message from `error` if no explicit `message` is provided.
 * - Renders a retry button when `onRetry` is supplied.
 * - Uses `role="alert"` for accessibility.
 */
export function ErrorDisplay({
  title = "Error",
  message,
  error,
  onRetry,
}: ErrorDisplayProps) {
  const displayMessage =
    message ?? error?.message ?? "Ocurrió un error inesperado.";

  return (
    <div
      role="alert"
      className="w-full rounded-2xl border border-red-300/70 dark:border-red-500/10 bg-red-50 dark:bg-red-500/10 px-5 py-4"
    >
      <div className="flex items-start gap-3 px-2 py-1">
        <div className="mt-0.5 flex h-9 w-9 p-2 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300">
          <ErrorIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-700 dark:text-red-200">
            {title}
          </p>
          <p className="text-xs text-red-600/90 dark:text-red-200/80 mt-1">
            {displayMessage}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-200 bg-red-100 dark:bg-red-500/20 hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors cursor-pointer"
            >
              Reintentar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
