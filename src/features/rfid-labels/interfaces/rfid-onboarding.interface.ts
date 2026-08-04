/**
 * Contrato del endpoint combinado `GET/POST /wms/etiquetas-rfid/onboarding/`
 * (mismo patrón de "1 modal, 1 URL" que picking/packing/despacho).
 *
 * - GET sin selección  → buscador (`resultados[]`), `tiene_seleccion: false`,
 *   `preview: null`.
 * - GET con `variante`/`producto` → lo anterior más `tiene_seleccion: true` y un
 *   `preview` COMPLETO que ya trae `zpl_individual[]`: un ZPL listo por etiqueta
 *   física, con su EPC ya codificado. El frontend NO reconstruye ni modifica
 *   ningún ZPL —itera el arreglo y manda cada elemento verbatim a Browser Print—.
 * - GET con error de validación → 400 con `{...forma vacía, error}`.
 * - POST → registra la impresión (mismo `store_impresion` que
 *   `registrar-impresion`, así que hereda los arreglos de EPC-duplicado (409) y
 *   sucursal-requerida (400)); responde `EtiquetaRFIDSerializer` (`EtiquetaRFID`).
 */

/** Un resultado del buscador. `tipo` distingue si se imprime por variante (SKU
 *  concreto) o por producto base (sin variante). */
export interface RfidOnboardingResult {
  tipo: "variante" | "producto";
  /** PK de la entidad de `tipo` (variante o producto). */
  id: number;
  /** Presente siempre para variantes; `null` para productos base. */
  producto_variante_id: number | null;
  producto_id: number;
  /** Etiqueta legible ya armada por el backend ("SKU - Nombre · Color · Talla"). */
  label: string;
  sku: string | null;
  nombre: string;
  color_nombre: string | null;
  talla_nombre: string | null;
  codigo: string | null;
  cod_proscai: string | null;
}

/** Bloque de presentación de la etiqueta (mismo shape que el `GET /preview/`
 *  original). Solo se usa para pintar la vista previa, no para imprimir. */
export interface RfidPreviewData {
  header: string;
  title: string;
  primary_line: string;
  secondary_line: string;
  meta_line: string;
  barcode_value: string;
}

/** Metadata de UN tag físico del lote. El `epc` es el mismo que va codificado en
 *  el `zpl_individual[n-1]` correspondiente; se reenvía tal cual en el POST para
 *  que el registro persista los EPCs realmente escritos en los tags. */
export interface RfidLabelMetadata {
  n: number;
  epc: string;
  serial: string;
  barcode_value: string;
}

/** Preview completo devuelto cuando hay selección. */
export interface RfidOnboardingPreview {
  empresa: number;
  sucursal: number | null;
  cantidad: number;
  rfid_mode: boolean;
  producto: {
    id: number;
    nombre: string;
    codigo: string | null;
    cod_proscai: string | null;
  } | null;
  producto_variante: {
    id: number;
    sku: string | null;
    nombre: string | null;
    color: string | null;
    talla: string | null;
  } | null;
  preview_data: RfidPreviewData;
  zpl_normal: string;
  zpl_rfid_first: string;
  /** UN ZPL listo por etiqueta física (longitud = `cantidad`). Se envía cada
   *  elemento verbatim a Browser Print, en orden. */
  zpl_individual: string[];
  etiquetas: RfidLabelMetadata[];
}

/** Respuesta del `GET /onboarding/`. `error` aparece solo en el 400. */
export interface RfidOnboardingResponse {
  q: string;
  resultados: RfidOnboardingResult[];
  sucursal_ids: number[] | null;
  tiene_seleccion: boolean;
  preview: RfidOnboardingPreview | null;
  mensaje?: string;
  error?: unknown;
}

/** Params del `GET /onboarding/`. Sin `variante`/`producto` es solo búsqueda. */
export interface RfidOnboardingParams {
  q?: string;
  variante?: number | null;
  producto?: number | null;
  cantidad?: number;
  rfid_mode?: boolean;
}

/** Un tag en el cuerpo del POST. `store_impresion` exige que, si se envía el
 *  arreglo, tenga exactamente `cantidad` filas. */
export interface RfidRegisterEtiqueta {
  epc: string;
  barcode_value: string;
  serial: string | null;
}

/** Cuerpo del `POST /onboarding/`. `producto_variante` XOR `producto`. */
export interface RfidRegisterPayload {
  producto_variante?: number;
  producto?: number;
  cantidad: number;
  rfid_mode: boolean;
  printer_name?: string | null;
  printer_address?: string | null;
  status: "EXITO" | "FALLIDO";
  zpl_enviado?: string | null;
  observaciones?: string | null;
  etiquetas?: RfidRegisterEtiqueta[];
}
