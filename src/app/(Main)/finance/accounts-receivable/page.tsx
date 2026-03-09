import { AccountsReceivableStats } from "@/src/features/accounts-receivable/components/AccountsReceivableStats";
import { AccountsReceivableList } from "@/src/features/accounts-receivable/components/AccountsReceivableList";

export default function AccountsReceivablePage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Control y seguimiento de cuentas por cobrar a clientes.
        </p>
      </div>

      <AccountsReceivableStats />

      <div className="space-y-6">
        <AccountsReceivableList />
      </div>
    </div>
  );
}

