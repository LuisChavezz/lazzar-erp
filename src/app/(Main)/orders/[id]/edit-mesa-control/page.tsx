import { Metadata } from "next";
import dynamic from "next/dynamic";
import { redirectIfPedidoCannotBeEdited } from "@/src/features/orders/services/pedidoEditAccess.server";

export const metadata: Metadata = {
  title: "Editar Pedido | Mesa de Control | ERP",
  description:
    "Edita un pedido existente desde Mesa de Control y sincroniza los cambios con su cotización de origen.",
};

// Importación dinámica para no arrastrar el bundle completo del formulario al
// servidor — mismo criterio que la edición de cotizaciones.
const PedidoMesaControlEditForm = dynamic(
  () =>
    import("@/src/features/orders/components/PedidoMesaControlEditForm").then(
      (mod) => mod.PedidoMesaControlEditForm,
    ),
  {
    loading: () => (
      <div className="w-full pt-2 min-h-200">
        <div className="animate-pulse rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-zinc-900 h-52" />
      </div>
    ),
  },
);

interface PedidoMesaControlEditPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Edición de un pedido por Mesa de Control.
 *
 * Cuelga de la ruta NEUTRA `/orders/[id]` —de donde se alcanza el detalle 360°—
 * pero, a diferencia de aquella, NO es de solo lectura: la regla "/orders" de
 * `routePermissions` admite cualquiera de nueve permisos de lectura, así que el
 * control de acceso de ESTA pantalla lo pone el guard local, que exige
 * `E-MESACONTROL-PEDIDOS`.
 */
export default async function PedidoMesaControlEditPage({
  params,
}: PedidoMesaControlEditPageProps) {
  const { id } = await params;
  const pedidoId = Number(id);

  await redirectIfPedidoCannotBeEdited(pedidoId);

  return (
    <div className="w-full space-y-6 pt-2">
      <PedidoMesaControlEditForm pedidoId={pedidoId} />
    </div>
  );
}
