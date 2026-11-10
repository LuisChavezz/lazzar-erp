import { CompanyGate } from "@/src/features/workspace/components/CompanyGate";

/**
 * Dashboard de Mesa de Control: todos sus bloques salen de `/ventas/mesa-control/`.
 * Desde EC-798 el backend acota pedidos y cotizaciones por `user.empresa`:
 * sin empresa asignada se muestra el aviso en lugar de tablas vacías, y no se
 * consulta nada hasta confirmarla (EC-842).
 * Ver `operations/orders/layout.tsx`.
 */
export default function OperationsDashboardLayout({ children }: { children: React.ReactNode }) {
  return <CompanyGate>{children}</CompanyGate>;
}
