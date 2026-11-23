import type { SalidaMaquila } from "../interfaces/salida-maquila.interface";
import { RECEPCION_CANCELADA } from "./salidaMaquilaDocumentos";

export interface RenglonRecepcion {
  salida_maquila_detalle?: number | null;
  producto_variante_sku?: string | null;
  producto_nombre?: string | null;
  cantidad_recibida?: string | number;
}

/** Lo que se usa de cada recepción de la SM (su retrieve). */
export interface RecepcionDeRegreso {
  estatus?: number;
  detalles?: RenglonRecepcion[];
}

export interface RegresoRenglon {
  /** Piezas que ya regresaron de este renglón de la SM. */
  recibidas: number;
  /** Nombre de la prenda, si la recepción lo trae. */
  nombre: string | null;
}

/**
 * Ids de TODAS las recepciones de la SM, canceladas incluidas: de ellas sale el
 * nombre de la prenda aunque la única recepción esté cancelada (EC-925); las
 * canceladas se excluyen solo de la suma (`regresoPorRenglon`). Ordenados, para
 * la llave.
 */
export const recepcionesIds = (salida: Pick<SalidaMaquila, "recepciones"> | undefined): number[] =>
  (salida?.recepciones ?? []).map((r) => r.id).sort((a, b) => a - b);

/**
 * Cuánto regresó de CADA renglón de la SM. Lo manda el backend por renglón
 * (`cantidad_recibida`, nucleo-erp #1270); si no, se suma de los renglones de
 * sus recepciones: por `salida_maquila_detalle` cuando viene, y si no, por SKU
 * (= `descripcion` del renglón de la SM). Las recepciones canceladas no suman
 * piezas (devolvieron lo recibido a pendiente, EC-925), pero sí dan el nombre.
 */
export const regresoPorRenglon = (
  detallesSm: Pick<SalidaMaquila["detalles"][number], "id" | "descripcion" | "cantidad_recibida">[],
  recepciones: RecepcionDeRegreso[],
): Record<number, RegresoRenglon> => {
  const renglones = recepciones.flatMap((r) =>
    (r.detalles ?? []).map((renglon) => ({ renglon, viva: r.estatus !== RECEPCION_CANCELADA })),
  );
  const porRenglon: Record<number, RegresoRenglon> = {};
  for (const d of detallesSm) {
    const mios = renglones.filter(({ renglon: r }) =>
      r.salida_maquila_detalle != null
        ? r.salida_maquila_detalle === d.id
        : !!r.producto_variante_sku && r.producto_variante_sku === d.descripcion,
    );
    porRenglon[d.id] = {
      recibidas:
        d.cantidad_recibida !== undefined
          ? Number(d.cantidad_recibida) || 0
          : mios
              .filter(({ viva }) => viva)
              .reduce((acc, { renglon }) => acc + (Number(renglon.cantidad_recibida) || 0), 0),
      nombre: mios.find(({ renglon }) => renglon.producto_nombre)?.renglon.producto_nombre ?? null,
    };
  }
  return porRenglon;
};
