import { CompanyGate } from "@/src/features/workspace/components/CompanyGate";

/**
 * Clientes (terceros) de Mesa de Control. Desde EC-798 el backend los acota por
 * `user.empresa`: sin empresa asignada se muestra el aviso en lugar de una tabla
 * vacía (EC-842). Solo esta sección de Mesa de Control pasa por el gate.
 */
export default function OperationsCustomersLayout({ children }: { children: React.ReactNode }) {
  return <CompanyGate>{children}</CompanyGate>;
}
