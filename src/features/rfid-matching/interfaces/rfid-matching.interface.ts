/**
 * Encuadre RFID de recepción — módulo MAQUETA.
 *
 * "Encuadre" NO es *framing*: es el sentido contable de **conciliación /
 * conteo a ciegas**. Un encuadre es una sesión de conteo de recepción contra
 * una orden de compra: el operador escanea tags uno a uno y la pantalla
 * compara ESPERADO vs LEÍDO vs DIFERENCIA por producto. Es un borrador previo
 * a la `Recepcion` formal: aceptarlo NO mueve inventario, solo deja el conteo
 * validado en QA.
 *
 * Los identificadores de código usan `RfidMatch` (inglés), la convención del
 * proyecto para nombres inventados —misma corrección que `Despacho` →
 * `Dispatch`—, mientras que la copia de la interfaz y el vocabulario del
 * dominio siguen en español ("encuadre"). Los NOMBRES DE CAMPO también se
 * conservan en español, igual que en `dispatch.interface.ts`: imitan lo que
 * devolvería el backend.
 *
 * No hay endpoint detrás. La forma de estas interfaces está modelada sobre
 * `RecepcionRFIDEncuadre` / `RecepcionRFIDLectura` de `compras/models.py` en
 * `nucleo-erp`, hoy sin serializer ni viewset, para que sustituir el `queryFn`
 * de `useRfidMatches` por una respuesta real no obligue a tocar columnas ni
 * diálogo. Los registros y sus mutaciones viven en `mocks/rfid-matches.mock.ts`.
 */

/**
 * Estatus del encuadre. El modelo del backend declara un tercero
 * (`CANCELADO`) que ningún flujo asigna todavía —el workspace de QA solo
 * expone crear / escanear / aceptar—, así que no se cubre aquí: una opción de
 * filtro que nunca puede devolver renglones se lee como un dato faltante.
 */
export type RfidMatchStatus = "PENDIENTE" | "ACEPTADO";

/**
 * Renglón esperado del encuadre — uno por línea de detalle de la orden de
 * compra, fotografiado al crear el encuadre (como haría un documento de
 * recepción real, que no re-consulta la OC en cada lectura).
 *
 * `leido` y `diferencia` son DERIVADOS de las lecturas: los recalcula
 * `recomputeRfidMatch` en cada escritura, no se editan a mano.
 */
export interface RfidMatchProductLine {
  id: number;
  /** Nombre del producto, tal como se muestra en el desglose. */
  producto: string;
  /** `Producto.codigo`. Es escaneable: el resolvedor lo acepta como tag. */
  codigo: string;
  /** Alias heredado de Proscai (`Producto.cod_proscai`), también escaneable. */
  cod_proscai: string;
  /**
   * SKUs de variante (uno por talla) de este producto. Es el caso NORMAL de
   * escaneo: cada tag físico lleva el SKU de UNA variante, así que estos son
   * los códigos que de verdad llegarían del lector.
   */
  skus: string[];
  esperado: number;
  /** Derivado: suma de las lecturas asignadas a esta línea. */
  leido: number;
  /** Derivado: `esperado - leido`. Negativo = se leyó de más. */
  diferencia: number;
}

/**
 * Una lectura registrada. Equivale a `RecepcionRFIDLectura`: `cantidad`
 * siempre vale 1 (un tag = una pieza) y el par (encuadre, codigo) es único —
 * el mismo tag no puede contarse dos veces en el mismo encuadre.
 */
export interface RfidMatchReading {
  /** `${matchId}-${codigo}`: único por construcción gracias a esa unicidad. */
  id: string;
  /** El tag capturado, tal cual lo tecleó/escaneó el operador. */
  codigo: string;
  /** Nombre del producto resuelto, o `null` si el tag no se pudo asignar. */
  producto_matched: string | null;
  /** Línea de la OC a la que se asignó, o `null` (lectura sin asignar). */
  linea_id: number | null;
  cantidad: number;
  /** ISO-8601. */
  timestamp: string;
}

export interface RfidMatch {
  id: number;
  /** "Encuadre 1" — mismo folio que arma el backend a partir del pk. */
  nombre: string;
  /** Folio de la orden de compra ("OC-1042"). */
  orden_compra: string;
  orden_compra_proveedor: string;
  almacen: string;
  /** `serie_codigo` del backend: 2 caracteres ("RC" | "RG"). */
  serie: string;
  remision: string | null;
  factura_referencia: string | null;
  observaciones: string | null;
  estado: RfidMatchStatus;
  /**
   * Totales DENORMALIZADOS en el renglón, como los anotaría un endpoint de
   * listado (mismo criterio que `total_lineas` en `Picking`). No son una
   * segunda fuente de verdad: los produce `recomputeRfidMatch` a partir de
   * `lineas`/`lecturas` en cada escritura, con la misma derivación que
   * consume el diálogo de detalle.
   */
  esperado_total: number;
  /**
   * Suma de TODAS las lecturas, asignadas y sin asignar — igual que
   * `total_leido` en `_build_recepcion_summary`. Es decir: un tag que no
   * resolvió suma aquí Y en `sin_asignar_total`; lo que no toca es el `leido`
   * de ninguna línea del desglose.
   */
  leido_total: number;
  sin_asignar_total: number;
  lineas: RfidMatchProductLine[];
  /** Ordenadas de la MÁS RECIENTE a la más antigua. */
  lecturas: RfidMatchReading[];
  /** ISO-8601. */
  fecha_recepcion: string;
}

/** Payload de alta, con los campos que captura `RfidMatchForm`. */
export interface CreateRfidMatchPayload {
  /** Folio de la OC elegida en el catálogo (`MOCK_ORDENES_COMPRA`). */
  orden_compra: string;
  /** Id del almacén elegido en el catálogo (`MOCK_ALMACENES`). */
  almacen_id: string;
  serie: string;
  remision: string;
  factura_referencia: string;
  observaciones: string;
}

/** Resultado de registrar una lectura, para que el llamador avise al operador. */
export type RegistrarLecturaResultado =
  | { tipo: "ASIGNADA"; producto: string; codigo: string }
  | { tipo: "SIN_ASIGNAR"; codigo: string }
  | { tipo: "DUPLICADA"; codigo: string }
  | { tipo: "NO_PENDIENTE" };
