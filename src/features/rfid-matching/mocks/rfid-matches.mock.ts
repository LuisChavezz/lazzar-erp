/**
 * "Backend" en memoria de los encuadres RFID.
 *
 * A diferencia del resto de módulos maqueta —cuyos fixtures son CONSTANTES
 * (`MOCK_LABELS`, `MOCK_LABEL_PRINTERS`)— este módulo tiene que ser MUTABLE:
 * el diálogo de detalle es una simulación de escaneo real, cada encuadre lleva
 * su propio avance y ese avance debe sobrevivir a cerrar y reabrir el diálogo,
 * a navegar fuera de la ruta y al botón de refrescar de `DataTable`.
 *
 * Por eso el estado vive aquí, en el ámbito del módulo, y NO en un
 * `useState` de la vista (se perdería al desmontar) ni en un fixture congelado
 * (el `refetch` de `useRfidMatches` lo restauraría, borrando el avance del
 * operador). Los hooks de `hooks/` llaman a estas operaciones y publican el
 * resultado en la caché de TanStack Query con `setQueryData`, exactamente como
 * los `useDelete*` del proyecto publican su actualización optimista: la caché
 * sigue siendo la única fuente que leen los componentes, y `queryFn` relee
 * este arreglo, así que refrescar devuelve el estado vigente y no la semilla.
 *
 * Nada se persiste: el estado dura lo que la pestaña, que es justo el alcance
 * de una maqueta. Todo esto desaparece el día que existan los endpoints
 * (`RecepcionRFIDEncuadre` ya está en `compras/models.py` de `nucleo-erp`,
 * pero sin serializer ni viewset todavía).
 */

import {
  findAlmacen,
  findOrdenCompra,
  type RfidMatchPurchaseOrderLine,
} from "../constants/rfidMatchCatalogs";
import { recomputeRfidMatch, resolveLineaForTag } from "../utils/rfid-matching.utils";
import type {
  CreateRfidMatchPayload,
  RegistrarLecturaResultado,
  RfidMatch,
  RfidMatchProductLine,
  RfidMatchReading,
} from "../interfaces/rfid-matching.interface";

/**
 * "Hoy" fijado en un literal, misma convención que el resto de las maquetas:
 * los encuadres semilla se construyen en el ámbito del módulo, que se evalúa
 * tanto en el render del servidor como en la hidratación del cliente. Una
 * fecha relativa daría dos valores distintos y un desajuste de hidratación.
 * Las lecturas creadas EN VIVO sí usan la hora real: nacen de un clic, después
 * de hidratar, así que solo existen en el cliente.
 */
const HOY = "2026-07-30T09:00:00.000Z";
const AYER = "2026-07-29T16:20:00.000Z";

// ── Constructores ────────────────────────────────────────────────────────────

/** Fotografía de una línea de la OC dentro del encuadre. */
const toLinea = (linea: RfidMatchPurchaseOrderLine): RfidMatchProductLine => ({
  id: linea.id,
  producto: linea.producto,
  codigo: linea.codigo,
  cod_proscai: linea.cod_proscai,
  skus: [...linea.skus],
  esperado: linea.esperado,
  // Derivados: los fija `recomputeRfidMatch` antes de que el registro se use.
  leido: 0,
  diferencia: linea.esperado,
});

const nonEmpty = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

interface BuildRfidMatchArgs {
  id: number;
  ordenCompra: string;
  almacenId: string;
  serie: string;
  remision: string;
  facturaReferencia: string;
  observaciones: string;
  estado: RfidMatch["estado"];
  fechaRecepcion: string;
  /** Tags ya leídos, del más ANTIGUO al más reciente. */
  tags?: string[];
}

/**
 * Arma un encuadre completo y consistente. Es el ÚNICO camino de creación
 * —semilla y alta desde el formulario— para que un registro nuevo no pueda
 * nacer con una forma distinta al resto.
 */
function buildRfidMatch({
  id,
  ordenCompra,
  almacenId,
  serie,
  remision,
  facturaReferencia,
  observaciones,
  estado,
  fechaRecepcion,
  tags = [],
}: BuildRfidMatchArgs): RfidMatch {
  const orden = findOrdenCompra(ordenCompra);
  const almacen = findAlmacen(almacenId);

  const base: RfidMatch = {
    id,
    nombre: `Encuadre ${id}`,
    orden_compra: ordenCompra,
    orden_compra_proveedor: orden?.proveedor ?? "Sin proveedor",
    almacen: almacen?.nombre ?? almacenId,
    serie,
    remision: nonEmpty(remision),
    factura_referencia: nonEmpty(facturaReferencia),
    observaciones: nonEmpty(observaciones),
    estado,
    esperado_total: 0,
    leido_total: 0,
    sin_asignar_total: 0,
    lineas: (orden?.lineas ?? []).map(toLinea),
    lecturas: [],
    fecha_recepcion: fechaRecepcion,
  };

  // Las lecturas semilla se resuelven con el MISMO resolvedor que usa el
  // escaneo en vivo, no con asignaciones escritas a mano: así la semilla no
  // puede afirmar un emparejamiento que el resolvedor no reproduciría.
  const lecturas: RfidMatchReading[] = tags.map((tag, index) => {
    const linea = resolveLineaForTag(base.lineas, tag);
    return {
      id: `${id}-${tag}`,
      codigo: tag,
      producto_matched: linea?.producto ?? null,
      linea_id: linea?.id ?? null,
      cantidad: 1,
      // Un minuto entre lecturas, hacia atrás desde `fechaRecepcion`, para que
      // el orden por fecha coincida con el orden del arreglo.
      timestamp: new Date(
        Date.parse(fechaRecepcion) + (index + 1) * 60_000,
      ).toISOString(),
    };
  });

  // `lecturas` se guarda de la MÁS RECIENTE a la más antigua (igual que el
  // `order_by("-created_at")` del backend), que es como la pinta el diálogo.
  return recomputeRfidMatch({ ...base, lecturas: lecturas.reverse() });
}

// ── Semilla ──────────────────────────────────────────────────────────────────

/**
 * Tres encuadres que cubren los tres estados que el operador puede encontrarse:
 *
 *  1. ACEPTADO con diferencia — reproduce el caso de la pantalla de referencia
 *     (aceptado con una sola lectura contra 10 piezas esperadas). No es un
 *     dato inconsistente: aceptar NO exige que el conteo cuadre (ver
 *     `RfidMatchDetailDialog`).
 *  2. PENDIENTE con avance parcial, incluida una lectura que no resuelve
 *     —para que el panel "sin asignar" tenga contenido desde el primer render.
 *  3. PENDIENTE sin ninguna lectura, listo para escanear desde cero.
 */
const SEED: RfidMatch[] = [
  buildRfidMatch({
    id: 1,
    ordenCompra: "OC-1042",
    almacenId: "ALM-01",
    serie: "RC",
    remision: "REM-8841",
    facturaReferencia: "A-10237",
    observaciones: "Recepción parcial autorizada por compras.",
    estado: "ACEPTADO",
    fechaRecepcion: AYER,
    tags: ["AMB-93E0-CH"],
  }),
  buildRfidMatch({
    id: 2,
    ordenCompra: "OC-1043",
    almacenId: "ALM-03",
    serie: "RC",
    remision: "REM-8852",
    facturaReferencia: "",
    observaciones: "Tarima 2 de 3 pendiente de bajar.",
    estado: "PENDIENTE",
    fechaRecepcion: HOY,
    tags: ["CAM-71B3-CH", "CAM-71B3-M", "EPC:30340C9A55|SKU=CHA-60D9-G", "TAG-DESCONOCIDO-01"],
  }),
  buildRfidMatch({
    id: 3,
    ordenCompra: "OC-1051",
    almacenId: "ALM-02",
    serie: "RG",
    remision: "",
    facturaReferencia: "",
    observaciones: "",
    estado: "PENDIENTE",
    fechaRecepcion: HOY,
  }),
];

// ── Estado mutable ───────────────────────────────────────────────────────────

/** Más recientes primero, igual que el `order_by("-created_at")` del backend. */
let matches: RfidMatch[] = [...SEED].reverse();
let nextId = SEED.length + 1;

/**
 * Instantánea del listado. Devuelve una copia superficial del arreglo para que
 * la caché de Query nunca reciba la misma referencia dos veces (con la misma
 * referencia no habría re-render tras una mutación).
 */
export const listRfidMatches = (): RfidMatch[] => [...matches];

/** Reemplaza un registro por su versión recalculada, conservando el orden. */
const replace = (updated: RfidMatch): RfidMatch => {
  const recomputed = recomputeRfidMatch(updated);
  matches = matches.map((item) => (item.id === recomputed.id ? recomputed : item));
  return recomputed;
};

/** Alta: fotografía las líneas de la OC y arranca sin ninguna lectura. */
export const createRfidMatch = (payload: CreateRfidMatchPayload): RfidMatch => {
  const match = buildRfidMatch({
    id: nextId++,
    ordenCompra: payload.orden_compra,
    almacenId: payload.almacen_id,
    serie: payload.serie,
    remision: payload.remision,
    facturaReferencia: payload.factura_referencia,
    observaciones: payload.observaciones,
    estado: "PENDIENTE",
    fechaRecepcion: new Date().toISOString(),
  });

  matches = [match, ...matches];
  return match;
};

/**
 * Registra una lectura contra UN encuadre. Réplica de `action=registrar_lectura`:
 *
 *  - solo se escanea sobre encuadres pendientes;
 *  - el mismo tag no puede leerse dos veces en el mismo encuadre (restricción
 *    única `(encuadre, codigo_tag)`);
 *  - el tag se resuelve contra las líneas esperadas y, si no coincide con
 *    ninguna, se guarda IGUAL pero sin asignar — nunca se descarta.
 */
export const registrarLectura = (
  matchId: number,
  rawTag: string,
): RegistrarLecturaResultado => {
  const match = matches.find((item) => item.id === matchId);
  if (!match) return { tipo: "NO_PENDIENTE" };
  if (match.estado !== "PENDIENTE") return { tipo: "NO_PENDIENTE" };

  const codigo = rawTag.trim();
  if (codigo === "") return { tipo: "SIN_ASIGNAR", codigo };

  const yaLeido = match.lecturas.some(
    (lectura) => lectura.codigo.toUpperCase() === codigo.toUpperCase(),
  );
  if (yaLeido) return { tipo: "DUPLICADA", codigo };

  const linea = resolveLineaForTag(match.lineas, codigo);
  const lectura: RfidMatchReading = {
    id: `${match.id}-${codigo}`,
    codigo,
    producto_matched: linea?.producto ?? null,
    linea_id: linea?.id ?? null,
    cantidad: 1,
    timestamp: new Date().toISOString(),
  };

  replace({ ...match, lecturas: [lectura, ...match.lecturas] });

  return linea
    ? { tipo: "ASIGNADA", producto: linea.producto, codigo }
    : { tipo: "SIN_ASIGNAR", codigo };
};

/**
 * Marca el encuadre como aceptado en QA. Igual que `action=aceptar_encuadre`,
 * NO valida que el conteo cuadre ni mueve inventario: solo deja el conteo
 * validado, con la diferencia que tenga registrada.
 */
export const acceptRfidMatch = (matchId: number): RfidMatch | null => {
  const match = matches.find((item) => item.id === matchId);
  if (!match || match.estado === "ACEPTADO") return null;
  return replace({ ...match, estado: "ACEPTADO" });
};
