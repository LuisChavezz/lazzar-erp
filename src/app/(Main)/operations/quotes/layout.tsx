import { CompanyGate } from "@/src/features/workspace/components/CompanyGate";

/**
 * Cotizaciones de Mesa de Control (`/ventas/mesa-control/`).
 * Desde EC-798 el backend acota pedidos y cotizaciones por `user.empresa`:
 * sin empresa asignada se muestra el aviso en lugar de tablas vacías, y no se
 * consulta nada hasta confirmarla (EC-842).
 * Ver `operations/orders/layout.tsx`.
 */
export default function OperationsQuotesLayout({ children }: { children: React.ReactNode }) {
  return <CompanyGate>{children}</CompanyGate>;
}
