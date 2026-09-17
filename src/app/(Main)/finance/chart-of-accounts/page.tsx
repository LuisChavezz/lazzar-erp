import ChartOfAccountList from "@/src/features/chart-of-accounts/components/ChartOfAccountList";

/**
 * Plan de cuentas (EC-139). Sin regla propia de permisos: la cubre el catch-all
 * `/finance` → `R-CONTABILIDAD`.
 */
export default function ChartOfAccountsPage() {
  return (
    <div className="w-full">
      <ChartOfAccountList />
    </div>
  );
}
