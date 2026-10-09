import { CustomerKpisSection } from "@/src/features/customers/components/CustomerKpisSection";
import { CustomerList } from "@/src/features/customers/components/CustomerList";

export default function CustomersPage() {
  return (
    <div className="w-full space-y-6">
      {/* Indicadores con consulta PROPIA: cargan y fallan dentro de su
          sección, así que la lista y su toolbar no dependen de ellos. */}
      <CustomerKpisSection />

      <CustomerList />
    </div>
  );
}
