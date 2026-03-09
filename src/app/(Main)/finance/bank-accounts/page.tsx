import { BankAccountsStats } from "@/src/features/bank-accounts/components/BankAccountsStats";
import { BankAccountsList } from "@/src/features/bank-accounts/components/BankAccountsList";

export default function BankAccountsPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Administración y control de cuentas bancarias.
        </p>
      </div>

      <BankAccountsStats />

      <div className="space-y-6">
        <BankAccountsList />
      </div>
    </div>
  );
}

