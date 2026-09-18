import { Metadata } from "next";
import { OperationsCustomerList } from "@/src/features/operations-customers/components/OperationsCustomerList";

export const metadata: Metadata = {
  title: "Clientes | Mesa de Control | ERP",
  description:
    "Consulta el catálogo completo de clientes, incluidos inactivos, desde la Mesa de Control.",
};

export default function OperationsCustomersPage() {
  return (
    <main className="w-full">
      <h1 className="sr-only">Clientes - Mesa de Control</h1>
      <section aria-label="Vista de Clientes">
        <OperationsCustomerList />
      </section>
    </main>
  );
}
