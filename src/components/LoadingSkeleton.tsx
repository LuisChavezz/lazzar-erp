

interface LoadingSkeletonProps {
  className?: string;
}

export const LoadingSkeleton = ({ className = "h-96" }: LoadingSkeletonProps) => (
  <div 
    className={`w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl ${className}`} 
  />
);
