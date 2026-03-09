import { AccountingStats } from "@/src/features/accounting/components/AccountingStats";
import { AccountingList } from "@/src/features/accounting/components/AccountingList";

export default function AccountingPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Visión general de movimientos y pólizas contables.
        </p>
      </div>

      <AccountingStats />

      <div className="space-y-6">
        <AccountingList />
      </div>
    </div>
  );
}

