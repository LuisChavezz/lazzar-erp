/**
 * Contrato de los dos endpoints de MONITOREO del lector RFID (Zebra FX9600):
 *
 *   GET /wms/etiquetas-rfid/scans/          → últimas 50 lecturas + match
 *   GET /wms/etiquetas-rfid/scanner-stats/  → estado del lector (¿sigue vivo?)
 *
 * Ambos son `@action` sueltos del `EtiquetaRFIDViewSet` que arman un `dict` a
 * mano (no hay serializer), así que la forma se tomó del código del backend
 * (`wms/api/views.py`, `EtiquetaRFIDViewSet.scans` / `.scanner_stats`), no de
 * un esquema generado.
 *
 * ARQUITECTURA: el frontend NO habla con el lector. El FX9600 hace POST a
 * `/QA/scanner_rfid/receive/` (sin token, ruta exclusiva del hardware) y eso
 * inserta renglones en `RfidScan`; esta pantalla solo hace polling del listado
 * ya guardado. No hay forma de "conectar" o "desconectar" el lector desde aquí:
 * lo único observable es hace cuánto llegó la última lectura.
 *
 * NO SE MODELAN a propósito: `debug_get` (raíz de `scans/`), `match_debug` (por
 * renglón) ni `query_epc_*` / `receive_endpoint_info` (de `scanner-stats`). Son
 * ayudas de diagnóstico del backend —variantes de EPC probadas, ejemplos de
 * curl—, no datos de negocio; tiparlos invitaría a renderizarlos.
 */

/**
 * Una lectura del lector, ya cruzada contra las etiquetas impresas
 * (`EtiquetaRFIDDetalle`) por el backend.
 *
 * Los campos del MATCH son OPCIONALES ADEMÁS DE NULLABLE, y la diferencia
 * importa: cuando `match_impresion` es `false` el backend NO los incluye en el
 * JSON (llegan `undefined`, no `null`) — ver el `item.update({...})` que solo
 * corre en la rama con detalle. Por eso se leen con `textOrDash`/`?? ""`, que
 * tratan igual ambos casos, y nunca con un `!` o un acceso directo.
 */
export interface RfidScan {
  /** `RfidScan.pk`. Único y estable: es la identidad de fila de la tabla. */
  id: number;
  /** EPC tal como lo reportó el lector, en hex y mayúsculas (EC-786). */
  epc: string;
  /**
   * ISO-8601 con offset. Se llama `timestamp` en la respuesta aunque la
   * columna del modelo sea `created_at`: el endpoint la renombra al serializar.
   */
  timestamp: string;
  /** Puerto de antena (1..8). Nullable: el FX no siempre lo reporta. */
  antenna: number | null;
  /** Potencia de la lectura en dBm (negativo: -30 buena, -70 muy débil). */
  rssi: number | null;
  reader_ip: string | null;
  /** Lector del catálogo que mandó la lectura (por su token). */
  lector_id?: number | null;
  lector_nombre?: string | null;
  /** ¿El EPC leído corresponde a una etiqueta impresa por el ERP? */
  match_impresion: boolean;
  /** Folio de la impresión que originó la etiqueta ("LAB-000022"). */
  impresion_folio?: string | null;
  impresion_id?: number | null;
  producto_nombre?: string | null;
  sku?: string | null;
  color?: string | null;
  talla?: string | null;
  /** Código impreso en el código de barras de la etiqueta. Es el SKU cuando
   *  la variante lo tiene, o el código del producto ("018Q") cuando no. */
  barcode_value?: string | null;
  /** `EtiquetaRFIDDetalle.serial` — es CharField, no entero ("0001"). */
  serial?: string | null;
  /** Estado de la etiqueta leída (`"LEIDO"`). Solo en lecturas con match (EC-786). */
  estado?: string | null;
}

/** Respuesta de `GET /wms/etiquetas-rfid/scans/` (sin `debug_get`). */
export interface RfidScansResponse {
  /** Máximo 50, ordenadas de la MÁS RECIENTE a la más antigua. */
  scans: RfidScan[];
}

/** Un renglón de `last_5_scans`: la misma lectura, sin el cruce contra
 *  etiquetas y con la fecha bajo otra llave (`ts`). */
export interface RfidScannerLastScan {
  id: number;
  epc: string;
  epc_len: number;
  antenna: number | null;
  rssi: number | null;
  reader_ip: string | null;
  /** ISO-8601. `null` solo si la lectura no tuviera fecha (no debería pasar). */
  ts: string | null;
}

/** Estado de un lector según su heartbeat (nucleo-erp #1289). */
export type RfidLectorEstado = "SIN_CONEXION" | "CONECTADO_SIN_TAGS" | "LEYENDO";

/** Un lector de la empresa activa con su último heartbeat y su última lectura. */
export interface RfidLector {
  id: number;
  nombre: string;
  sucursal_id: number | null;
  activo: boolean;
  ultima_conexion: string | null;
  ultima_lectura: string | null;
  segundos_desde_conexion: number | null;
  segundos_desde_lectura: number | null;
  /** SIN_CONEXION: >300 s sin heartbeat o nunca; lo calcula el backend. */
  estado: RfidLectorEstado;
}

/** Respuesta de `GET /wms/etiquetas-rfid/scanner-stats/` (sin los campos de
 *  diagnóstico; ver la nota de arriba). */
export interface RfidScannerStatsResponse {
  /** Total de lecturas de la empresa activa del usuario, todas sus sucursales
   *  (EC-884): el mismo conjunto que borra `scans/clear/`. Sin empresa activa, 0. */
  total_rfidscan_rows: number;
  last_scan_ts: string | null;
  /**
   * Antigüedad de la última lectura EN SEGUNDOS, calculada por el backend
   * contra su propio reloj (por eso no se deriva aquí de `last_scan_ts`: el
   * reloj del navegador puede ir desfasado). `null` cuando no hay ni una
   * lectura registrada, no cuando el lector está caído.
   */
  last_scan_seconds_ago: number | null;
  last_5_scans: RfidScannerLastScan[];
  /** Lectores de la empresa activa (#1289). Opcional hasta que todo backend lo traiga. */
  lectores?: RfidLector[];
}

/** Lo que necesita la barra de estado del lector: un subconjunto de la
 *  respuesta, para que el componente no reciba campos que no usa. */
export type RfidScannerStats = Pick<
  RfidScannerStatsResponse,
  "total_rfidscan_rows" | "last_scan_seconds_ago" | "last_5_scans" | "lectores"
>;

/** Respuesta de `POST /wms/etiquetas-rfid/scans/clear/`. `deleted` es el total
 *  de renglones borrados que devuelve el `.delete()` del ORM, acotado a la
 *  empresa activa; 0 si no había lecturas o el usuario no tiene empresa. */
export interface ClearRfidScansResponse {
  status: string;
  deleted: number;
}

/**
 * Lector RFID administrable (`/wms/etiquetas-rfid/lectores/`).
 * `url_fx` es la URL completa, con su token, que se pega en el IoT Connector
 * del FX; el backend la arma con la base correcta (local o producción).
 */
export interface RfidLectorConfig {
  id: number;
  nombre: string;
  ubicacion?: string | null;
  sucursal?: number | null;
  sucursal_nombre?: string | null;
  url_fx?: string | null;
  estado?: RfidLectorEstado | null;
  ultima_conexion?: string | null;
  ultima_lectura?: string | null;
  /** Quién está escaneando con este lector ahora (latido `en-uso/`); `null` = libre. */
  en_uso_por?: {
    usuario: string;
    pantalla?: string | null;
    documento?: string | null;
    desde?: string | null;
  } | null;
}

export interface CreateRfidLectorPayload {
  nombre: string;
  ubicacion?: string;
}
