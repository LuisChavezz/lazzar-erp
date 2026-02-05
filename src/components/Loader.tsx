export const Loader = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-800 border-t-sky-500 dark:border-t-sky-400 rounded-full animate-spin"></div>
    </div>
  );
};
