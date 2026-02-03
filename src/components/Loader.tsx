export const Loader = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-700 border-t-sky-500 rounded-full animate-spin"></div>
    </div>
  );
};
