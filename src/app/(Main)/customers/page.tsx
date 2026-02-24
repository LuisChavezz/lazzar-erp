import { CustomersStats } from "@/src/features/customers/components/CustomersStats";
import { CustomersList } from "@/src/features/customers/components/CustomersList";

export default function CustomersPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Seguimiento de clientes, segmentos y desempeño comercial.
        </p>
      </div>

      <CustomersStats />

      <div className="space-y-6">
        <CustomersList />
      </div>
    </div>
  );
}
