import { CompanyGate } from "@/src/features/workspace/components/CompanyGate";

/**
 * Proveedores (terceros), lista y detalle. Desde EC-798 el backend los acota por
 * `user.empresa`: sin empresa asignada se muestra el aviso en lugar de una tabla
 * vacía (EC-842). Solo esta sección de Compras pasa por el gate; el resto del
 * módulo conserva su propio aviso de "sin empresa" en los KPIs.
 */
export default function SuppliersLayout({ children }: { children: React.ReactNode }) {
  return <CompanyGate>{children}</CompanyGate>;
}
