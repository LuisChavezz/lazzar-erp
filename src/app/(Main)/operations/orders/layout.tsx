import { CompanyGate } from "@/src/features/workspace/components/CompanyGate";

/**
 * Pedidos de Mesa de Control (`/ventas/pedidos/`).
 * Desde EC-798 el backend acota pedidos y cotizaciones por `user.empresa`:
 * sin empresa asignada se muestra el aviso en lugar de tablas vacías, y no se
 * consulta nada hasta confirmarla (EC-842).
 *
 * Mesa de Control no lleva el gate en su layout porque no todo es de ventas:
 * calendario y correos son de Google, muestras no tiene datos y el pipeline de
 * inventario es de inventarios (fuera de EC-798). Cada sección de ventas
 * (pedidos, programados, cotizaciones, dashboard, clientes) trae el suyo.
 */
export default function OperationsOrdersLayout({ children }: { children: React.ReactNode }) {
  return <CompanyGate>{children}</CompanyGate>;
}
