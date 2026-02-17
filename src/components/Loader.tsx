export const Loader = ({
  className = "",
  title,
  message,
}: {
  className?: string;
  title?: string;
  message?: string;
}) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-800 border-t-sky-500 dark:border-t-sky-400 rounded-full animate-spin"></div>
        {title && (
          <>
            <p className="mt-3 mb-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">{title}</p>
            {message && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{message}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
