import { formatCurrency } from "@/src/utils/formatCurrency";
import { BALANCE_BY_TYPE, MOCK_CENTROS_COSTO } from "../mocks/accounting.mock";
import type { CuentaTipo } from "../interfaces/accounting-entry.interface";

const TIPO_BAR: Record<CuentaTipo, string> = {
  activo: "bg-sky-400",
  pasivo: "bg-amber-400",
  capital: "bg-violet-500",
  ingreso: "bg-emerald-500",
  costo: "bg-orange-400",
  egreso: "bg-red-400",
};

const Card = ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => (
  <div className="rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-5 shadow-sm">
    <div className="mb-4">
      <h3 className="text-sm font-bold text-slate-800 dark:text-white">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
    </div>
    {children}
  </div>
);

export const AccountingBalanceSummary = () => {
  const maxBalance = Math.max(...BALANCE_BY_TYPE.map((g) => Math.abs(g.total)), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Balance por tipo de cuenta */}
      <Card title="Balance por tipo de cuenta" subtitle="Saldo agrupado del plan de cuentas">
        <div className="space-y-3">
          {BALANCE_BY_TYPE.map((group) => {
            const width = (Math.abs(group.total) / maxBalance) * 100;
            return (
              <div key={group.tipo}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${TIPO_BAR[group.tipo]}`} aria-hidden="true" />
                    {group.label}
                    <span className="text-slate-400 dark:text-slate-500">({group.count})</span>
                  </span>
                  <span
                    className={`font-semibold tabular-nums ${
                      group.total < 0 ? "text-red-600 dark:text-red-400" : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {formatCurrency(group.total)}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className={`h-full rounded-full ${TIPO_BAR[group.tipo]}`} style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Centros de costo: presupuesto vs gasto real */}
      <Card title="Centros de costo" subtitle="Presupuesto vs gasto real">
        <div className="space-y-3">
          {MOCK_CENTROS_COSTO.map((centro) => {
            const pct =
              centro.presupuesto > 0
                ? Math.round((centro.gasto_real / centro.presupuesto) * 100)
                : 0;
            const overBudget = pct > 100;
            return (
              <div key={centro.id_centro_costo}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-slate-600 dark:text-slate-300 truncate">
                    {centro.nombre}
                  </span>
                  <span
                    className={`font-semibold tabular-nums shrink-0 ${
                      overBudget ? "text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {pct}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${overBudget ? "bg-red-500" : "bg-emerald-500"}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
