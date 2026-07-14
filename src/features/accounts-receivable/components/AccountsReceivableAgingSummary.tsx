import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { formatCurrency } from "@/src/utils/formatCurrency";
import type { AgingBucket } from "../interfaces/accounts-receivable.interface";

const BUCKET_STYLES: Record<string, { bar: string; chip: string; dot: string }> = {
  "0-30": { bar: "bg-amber-400", chip: "text-amber-600 dark:text-amber-400", dot: "bg-amber-400" },
  "31-60": { bar: "bg-orange-400", chip: "text-orange-600 dark:text-orange-400", dot: "bg-orange-400" },
  "61-90": { bar: "bg-red-400", chip: "text-red-600 dark:text-red-400", dot: "bg-red-400" },
  "90+": { bar: "bg-red-600", chip: "text-red-700 dark:text-red-500", dot: "bg-red-600" },
};

export const AccountsReceivableAgingSummary = ({
  buckets,
  isLoading = false,
}: {
  buckets: AgingBucket[];
  isLoading?: boolean;
}) => {
  const total = buckets.reduce((acc, b) => acc + b.amount, 0);

  return (
    <div className="rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">
            Antigüedad de saldos vencidos
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Distribución del monto vencido por días de atraso
          </p>
        </div>
        {isLoading ? (
          <LoadingSkeleton className="h-4 w-20 rounded" />
        ) : (
          <span className="text-sm font-bold text-red-600 dark:text-red-400 tabular-nums">
            {formatCurrency(total)}
          </span>
        )}
      </div>

      {/* Barra segmentada */}
      {isLoading ? (
        <LoadingSkeleton className="h-2.5 w-full rounded-full" />
      ) : (
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          {total > 0 ? (
            buckets.map((bucket) => {
              const width = (bucket.amount / total) * 100;
              if (width <= 0) return null;
              return (
                <div
                  key={bucket.key}
                  className={`h-full ${BUCKET_STYLES[bucket.key].bar}`}
                  style={{ width: `${width}%` }}
                  title={`${bucket.label}: ${formatCurrency(bucket.amount)}`}
                />
              );
            })
          ) : (
            <div className="h-full w-full bg-slate-200 dark:bg-slate-700" />
          )}
        </div>
      )}

      {/* Detalle por rango */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        {buckets.map((bucket) => {
          const style = BUCKET_STYLES[bucket.key];
          const pct = total > 0 ? Math.round((bucket.amount / total) * 100) : 0;
          return (
            <div
              key={bucket.key}
              className="rounded-lg border border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.02] p-3"
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} aria-hidden="true" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {bucket.label}
                </span>
              </div>
              {isLoading ? (
                <>
                  <LoadingSkeleton className="h-5 w-20 rounded mt-1.5" />
                  <LoadingSkeleton className="h-3 w-16 rounded mt-1" />
                </>
              ) : (
                <>
                  <p className="text-base font-bold text-slate-800 dark:text-white tabular-nums mt-1.5">
                    {formatCurrency(bucket.amount)}
                  </p>
                  <p className={`text-[11px] font-medium mt-0.5 ${style.chip}`}>
                    {bucket.count} {bucket.count === 1 ? "cuenta" : "cuentas"} · {pct}%
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
