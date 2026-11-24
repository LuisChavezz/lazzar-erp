/**
 * Topes de tiempo de las peticiones al backend (EC-939). Sin ellos, una
 * petición que el backend deja sin responder quedaba pendiente para siempre:
 * spinners, botones deshabilitados y candados contra el doble envío hasta
 * recargar la página.
 *
 * `DEFAULT_REQUEST_TIMEOUT_MS` es el de `v1_api` y `api` (`src/api/`), y por lo
 * tanto el de la renovación de sesión: la cola de peticiones que esperan el
 * refresh nunca espera más que esto. Cubre un arranque en frío del backend
 * serverless y coincide con el tope de cada llamada del backend a Facturama
 * (`FACTURAMA_TIMEOUT`, 30 s).
 *
 * `SLOW_REQUEST_TIMEOUT_MS` se pasa POR LLAMADA (`{ timeout }` de Axios) solo en
 * las operaciones que pueden pasar legítimamente de 30 s: las que esperan a
 * Facturama de forma síncrona (timbrar, cancelar, conciliar, descargar el CFDI
 * oficial, enviarlo por correo), los archivos que el backend genera al vuelo
 * (reportes, PDF fusionado), las subidas, las exportaciones sin paginar y las
 * escrituras masivas (conciliación bancaria, nómina del periodo).
 */
export const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

/** Tope por llamada de las operaciones legítimamente lentas (ver arriba). */
export const SLOW_REQUEST_TIMEOUT_MS = 120_000;
