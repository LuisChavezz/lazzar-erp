import { CustomerStats } from "@/src/features/customers/components/CustomerStats";
import { CustomerList } from "@/src/features/customers/components/CustomerList";

export default function CustomersPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Seguimiento de clientes, segmentos y desempeño comercial.
        </p>
      </div>

      <CustomerStats />

      <div className="space-y-6">
        <CustomerList />
      </div>
    </div>
  );
}
