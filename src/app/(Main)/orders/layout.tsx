import { CompanyGate } from "@/src/features/workspace/components/CompanyGate";

/**
 * Detalle 360° del pedido (`/orders/[id]`) y su edición desde Mesa de Control.
 * Es la ruta neutra a la que se llega desde varios módulos.
 * Desde EC-798 el backend acota pedidos y cotizaciones por `user.empresa`:
 * sin empresa asignada se muestra el aviso en lugar de tablas vacías, y no se
 * consulta nada hasta confirmarla (EC-842).
 * Sin este gate, el backend respondería 404 y la vista diría "no disponible" sin
 * explicar por qué.
 */
export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return <CompanyGate>{children}</CompanyGate>;
}
