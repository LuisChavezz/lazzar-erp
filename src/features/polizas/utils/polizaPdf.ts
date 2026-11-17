import type { DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";
import type { Poliza, PolizaDetalle } from "../interfaces/poliza.interface";

/**
 * Identidad de una póliza para su PDF (EC-859): código `POL`. Las automáticas y
 * las contrapólizas llevan folio de la serie `POL` (`POL-000001.pdf`); una
 * póliza MANUAL puede no tener folio (el servidor no lo asigna): `POL-ID<id>.pdf`.
 * La marca sale solo con `Cancelada` y dice "CANCELADA".
 */
export const polizaPdfDescriptor = (poliza: Pick<Poliza, "id" | "folio" | "estatus">): DocumentPdfDescriptor => {
  const cancelled = poliza.estatus === "Cancelada";
  return {
    type: "POL",
    id: poliza.id,
    folio: poliza.folio,
    cancelled,
    ...(cancelled ? { cancelledLabel: "CANCELADA" } : {}),
  };
};

/**
 * Movimientos en el orden del asiento (`orden`; los nulos al final), la misma
 * regla que `PolizaDetailDialog`: en contabilidad el cargo antecede a su abono.
 * Ordena una copia, no la respuesta.
 */
export const polizaMovimientosEnOrden = (detalles: readonly PolizaDetalle[]): PolizaDetalle[] =>
  [...detalles].sort((a, b) => (a.orden ?? Number.MAX_SAFE_INTEGER) - (b.orden ?? Number.MAX_SAFE_INTEGER));
