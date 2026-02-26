import { ErrorIcon } from "./Icons";

interface ErrorStateProps {
  title: string;
  message?: string;
}

export function ErrorState({ title, message }: ErrorStateProps) {
  return (
    <div className="w-full rounded-2xl border border-red-300/70 dark:border-red-500/10 bg-red-50 dark:bg-red-500/10 px-5 py-4">
      <div className="flex items-start gap-3 px-2 py-1">
        <div className="mt-0.5 flex h-9 w-9 p-2 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300">
          <ErrorIcon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-red-700 dark:text-red-200">{title}</p>
          <p className="text-xs text-red-600/90 dark:text-red-200/80 mt-1">
            {message || "Ocurrió un error inesperado."}
          </p>
        </div>
      </div>
    </div>
  );
}

