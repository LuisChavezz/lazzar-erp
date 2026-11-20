import { getProgramacionDestinoLabel } from "@/src/features/picking/utils/pickingDestino";
import type { PickingOnboardingPedido } from "@/src/features/picking/interfaces/picking-onboarding.interface";
import type { ListExportColumn } from "@/src/utils/listExport";

/** Columnas de la exportación (Excel y PDF) de los pedidos por surtir. */
export const WMS_ORDER_EXPORT_COLUMNS: ListExportColumn<PickingOnboardingPedido>[] = [
  { header: "Folio", weight: 1, text: (r) => r.folio ?? "" },
  { header: "Cliente", weight: 2.2, text: (r) => r.cliente_nombre ?? "" },
  { header: "Sucursal", weight: 1.2, text: (r) => r.sucursal_nombre ?? "" },
  {
    header: "Programación",
    weight: 4,
    text: (r) =>
      r.programaciones.length === 0
        ? "Sin programación"
        : r.programaciones
            .map(
              (p) =>
                `${getProgramacionDestinoLabel(p.destino)} · ${p.cantidad} pzas → ${
                  p.almacen_sugerido?.nombre ?? "(sin almacén)"
                }${p.comentarios.trim() ? ` (${p.comentarios.trim()})` : ""}`,
            )
            .join("; "),
  },
  {
    header: "Piezas programadas",
    weight: 0.9,
    text: (r) => String(r.programaciones.reduce((acc, p) => acc + (Number(p.cantidad) || 0), 0)),
  },
];
