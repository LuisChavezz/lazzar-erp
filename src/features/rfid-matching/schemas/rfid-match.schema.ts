import { z } from "zod";
import { MOCK_ALMACENES, MOCK_ORDENES_COMPRA, MOCK_SERIES } from "../constants/rfidMatchCatalogs";

/**
 * Alta de un encuadre. Los tres selectores se validan contra el CATÁLOGO, no
 * con un `min(1)` genérico: como el módulo es una maqueta sin backend que
 * rechace nada, este schema es la única defensa contra un folio de OC que no
 * existe —y una OC inexistente produciría un encuadre sin líneas esperadas,
 * imposible de cuadrar—.
 *
 * `remision`, `factura_referencia` y `observaciones` son libres y opcionales
 * (`null`/`blank` en `RecepcionRFIDEncuadre`); el alta normaliza la cadena
 * vacía a `null`.
 */

const ORDEN_COMPRA_IDS = MOCK_ORDENES_COMPRA.map((orden) => orden.id);
const ALMACEN_IDS = MOCK_ALMACENES.map((almacen) => almacen.id);
const SERIE_VALUES = MOCK_SERIES.map((serie) => serie.value);

export const RfidMatchFormSchema = z.object({
  orden_compra: z
    .string()
    .refine((value) => ORDEN_COMPRA_IDS.includes(value), "Selecciona una orden de compra"),
  almacen_id: z
    .string()
    .refine((value) => ALMACEN_IDS.includes(value), "Selecciona un almacén"),
  serie: z.string().refine((value) => SERIE_VALUES.includes(value), "Selecciona una serie"),
  // `max_length=50` de `remision` / `factura_referencia` en el modelo.
  remision: z.string().max(50, "La remisión no puede exceder 50 caracteres"),
  factura_referencia: z
    .string()
    .max(50, "La factura referencia no puede exceder 50 caracteres"),
  observaciones: z.string(),
});

export type RfidMatchFormValues = z.infer<typeof RfidMatchFormSchema>;

/** Valores iniciales: los selectores arrancan vacíos para forzar una elección. */
export const createEmptyRfidMatchForm = (): RfidMatchFormValues => ({
  orden_compra: "",
  almacen_id: "",
  serie: SERIE_VALUES[0],
  remision: "",
  factura_referencia: "",
  observaciones: "",
});
