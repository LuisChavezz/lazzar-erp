import { v1_api } from "@/src/api/v1.api";
import type { StockMovement, StockMovementDetail } from "../interfaces/stock-movements.interface";

export interface CreateStockMovementPayload {
  almacen: number;
  /**
   * Un renglón es de una variante de catálogo (`producto_variante`) o, solo en
   * ENTRADA, de una muestra por su SKU (`sku_muestra`, sin producto).
   */
  items: (
    | { producto_variante: number; cantidad: string; ubicacion: number }
    | { sku_muestra: string; cantidad: string; ubicacion: number }
  )[];
  /** Notas del movimiento. Opcional en los tres endpoints (entrada/salida/ajuste). */
  observaciones?: string;
  /**
   * Pedido al que se vincula el movimiento. Opcional — se omite por completo
   * cuando no hay pedido (nunca se envía `null` ni `0`). Un pedido inválido/
   * inexistente hace que el backend rechace TODO el movimiento con un `400`
   * `{ "pedido": "Pedido no encontrado." }`.
   */
  pedido?: number;
}

/** Un resultado del autocompletado de muestras (`GET /inventarios/skus-muestra/`). */
export interface SampleSkuResult {
  variante_produccion: number;
  sku_muestra: string;
  pedido_folio: string | null;
  nombre: string | null;
  talla: string | null;
}

/** Busca por SKU o folio del pedido; mínimo 1 carácter, máximo 10 resultados. */
export const searchSampleSkus = async (search: string): Promise<SampleSkuResult[]> => {
  const response = await v1_api.get<SampleSkuResult[]>("/inventarios/skus-muestra/", {
    params: { search },
  });
  return response.data;
};

export const getStockMovements = async (): Promise<StockMovement[]> => {
  const response = await v1_api.get<StockMovement[]>("/inventarios/movimientos/");
  return response.data;
};

export const createStockMovement = async ({
  operationType,
  data,
}: {
  operationType: string;
  data: CreateStockMovementPayload;
}): Promise<StockMovement> => {
  const response = await v1_api.post<StockMovement>(
    `/inventarios/operaciones/${operationType.toLowerCase()}`,
    data,
  );
  return response.data;
};

/** Renglón de `GET /inventarios/movimientos/formal/{id}/detalles/`. */
interface FormalMovementItem {
  producto_id: number;
  producto_variante_id: number | null;
  producto_nombre: string;
  ubicacion_origen_nombre: string | null;
  ubicacion_destino_nombre: string | null;
  almacen_origen_id: number | null;
  almacen_destino_id: number | null;
  cantidad: string;
  /** Existencia antes/después (nucleo-erp #1271). `null` en movimientos viejos y transferencias. */
  cantidad_before?: string | null;
  cantidad_after?: string | null;
}

/**
 * Detalle de un movimiento FORMAL (el id que mandan los `documentos` de la OC,
 * del pedido 360°, etc.), traducido a la forma del detalle por evento para
 * reusar el mismo diálogo. Trae existencias antes/después desde #1271 (`null`
 * en movimientos viejos y transferencias); no trae el nombre del almacén.
 */
export const getFormalStockMovementDetail = async (id: number): Promise<StockMovementDetail> => {
  const { data } = await v1_api.get<
    Omit<StockMovementDetail, "detalle" | "almacen_id" | "almacen_nombre" | "antes_json" | "despues_json"> & {
      detalle: FormalMovementItem[];
    }
  >(`/inventarios/movimientos/formal/${id}/detalles/`);
  const salida = /SALIDA/i.test(data.tipo_movimiento);
  return {
    ...data,
    // El diálogo resuelve el nombre con el catálogo de almacenes.
    almacen_id: data.detalle[0]?.almacen_destino_id ?? data.detalle[0]?.almacen_origen_id ?? 0,
    almacen_nombre: "",
    antes_json: { items: [], recepcion_id: 0 } as StockMovementDetail["antes_json"],
    despues_json: {} as StockMovementDetail["despues_json"],
    detalle: data.detalle.map((it) => ({
      delta: String((salida ? -1 : 1) * Math.abs(Number(it.cantidad) || 0)),
      producto_id: it.producto_id,
      producto_variante_id: it.producto_variante_id,
      producto_nombre: it.producto_nombre,
      ubicacion_id: null,
      ubicacion_nombre: it.ubicacion_destino_nombre ?? it.ubicacion_origen_nombre,
      // "" = sin dato: el diálogo pinta "—".
      cantidad_before: it.cantidad_before ?? "",
      cantidad_after: it.cantidad_after ?? "",
    })),
  };
};

export const getStockMovementDetail = async (
  id: number
): Promise<StockMovementDetail> => {
  const response = await v1_api.get<StockMovementDetail>(
    `/inventarios/movimientos/${id}/detalles/`
  );
  return response.data;
};