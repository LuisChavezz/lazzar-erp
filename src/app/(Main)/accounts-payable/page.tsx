import { AccountsPayableStats } from "@/src/features/accounts-payable/components/AccountsPayableStats";
import { AccountsPayableList } from "@/src/features/accounts-payable/components/AccountsPayableList";

export default function AccountsPayablePage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Control y seguimiento de cuentas por pagar a proveedores.
        </p>
      </div>

      <AccountsPayableStats />

      <div className="space-y-6">
        <AccountsPayableList />
      </div>
    </div>
  );
}
