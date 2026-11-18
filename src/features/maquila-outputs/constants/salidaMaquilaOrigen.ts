import {
  embroideryOrderDetailPath,
  productionOrderDetailPath,
  reflectiveOrderDetailPath,
} from "@/src/constants/workOrderRoutes";
import type {
  SalidaMaquilaListItem,
  SalidaMaquilaOrigen,
} from "../interfaces/salida-maquila.interface";

/**
 * Lo que cambia entre los tres documentos de los que sale una SM (EC-911): el
 * campo del alta y del filtro (`op` / `ob` / `orden_r`), el del renglón
 * (`op_detalle` / `ob_detalle` / `or_detalle`), su folio en la SM y su página.
 * Los nombres de campo son los del backend, tal cual.
 */
export const SALIDA_MAQUILA_ORIGENES = {
  OP: {
    campo: "op",
    campoRenglon: "op_detalle",
    campoFolio: "op_folio",
    nombre: "orden de producción",
    detailPath: productionOrderDetailPath,
  },
  OB: {
    campo: "ob",
    campoRenglon: "ob_detalle",
    campoFolio: "ob_folio",
    nombre: "orden de bordado",
    detailPath: embroideryOrderDetailPath,
  },
  OR: {
    campo: "orden_r",
    campoRenglon: "or_detalle",
    campoFolio: "orden_r_folio",
    nombre: "orden de reflejante",
    detailPath: reflectiveOrderDetailPath,
  },
} as const satisfies Record<
  SalidaMaquilaOrigen,
  {
    campo: "op" | "ob" | "orden_r";
    campoRenglon: "op_detalle" | "ob_detalle" | "or_detalle";
    campoFolio: "op_folio" | "ob_folio" | "orden_r_folio";
    nombre: string;
    detailPath: (id: number) => string;
  }
>;

export const SALIDA_MAQUILA_ORIGEN_VALUES = ["OP", "OB", "OR"] as const satisfies readonly SalidaMaquilaOrigen[];

/**
 * Origen de una SM: `origen` cuando viene; si no, el FK que esté puesto. Nunca
 * cae en OP por descarte: una SM de OR trae `op` y `ob` en `null`, y tomarla
 * por OP enlazaba a la OP con el id de la OR.
 */
export const salidaMaquilaOrigen = (salida: SalidaMaquilaListItem): SalidaMaquilaOrigen | null => {
  if (salida.origen) return salida.origen;
  if (salida.orden_r != null) return "OR";
  if (salida.ob != null) return "OB";
  if (salida.op != null) return "OP";
  return null;
};

/** Id y folio del documento de origen, o `null` si la SM no trae ninguno. */
export const salidaMaquilaOrigenRef = (
  salida: SalidaMaquilaListItem,
): { origen: SalidaMaquilaOrigen; id: number; folio: string | null } | null => {
  const origen = salidaMaquilaOrigen(salida);
  if (!origen) return null;
  const cfg = SALIDA_MAQUILA_ORIGENES[origen];
  const id = salida.origen_id ?? salida[cfg.campo];
  if (id == null) return null;
  return { origen, id, folio: salida.origen_folio ?? salida[cfg.campoFolio] ?? null };
};

/** Folio para pantalla: `folio_display` ("SM-00012 · OR-00006"); `folio` si no viene. */
export const salidaMaquilaFolio = (salida: Pick<SalidaMaquilaListItem, "folio" | "folio_display">): string =>
  salida.folio_display || salida.folio;
