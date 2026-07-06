import { AccountingCustomerList } from "@/src/features/accounting-customers/components/AccountingCustomerList";

export default function AccountingCustomersPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Consulta de clientes registrados para efectos contables y de facturación.
        </p>
      </div>

      <div className="space-y-6">
        <AccountingCustomerList />
      </div>
    </div>
  );
}
