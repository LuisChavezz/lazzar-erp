"use client";

import { servicioSeed, type OrdenServicioRenglon } from "../utils/salidaMaquilaDraft";
import { GenerarSalidaMaquilaDialog } from "./GenerarSalidaMaquilaDialog";
import { SalidasMaquilaSection } from "./SalidasMaquilaSection";

/**
 * Salidas a maquila de una orden de bordado o de reflejante (EC-911), en su
 * detalle. El alta usa los `detalles` que la página ya cargó: sin consulta
 * propia. La OB propone su proveedor como maquilero (solo si es maquilero); la
 * OR no tiene.
 */
export function ServicioSalidasMaquilaSection({
  origen,
  ordenId,
  cancelada,
  detalles,
  proveedor = null,
}: {
  origen: "OB" | "OR";
  ordenId: number;
  cancelada: boolean;
  detalles: OrdenServicioRenglon[];
  proveedor?: number | null;
}) {
  return (
    <SalidasMaquilaSection
      origen={origen}
      ordenId={ordenId}
      cancelada={cancelada}
      renderGenerarDialog={(props) => (
        <GenerarSalidaMaquilaDialog
          origen={origen}
          seed={servicioSeed(origen, ordenId, detalles, proveedor)}
          {...props}
        />
      )}
    />
  );
}
