import { CustomerStats } from "@/src/features/customers/components/CustomerStats";
import { CustomerList } from "@/src/features/customers/components/CustomerList";

export default function CustomersPage() {
  return (
    <div className="w-full space-y-8">
      <CustomerStats />

      <div className="space-y-6">
        <CustomerList />
      </div>
    </div>
  );
}
