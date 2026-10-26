/**
 * Reflejante «Del inventario»: máximo 50 piezas por partida (EC-563 CO-06;
 * backend EC-576).
 *
 * Misma regla que el backend: una partida con reflejante en la que ALGUNA
 * especificación tiene `opcion: "catalogo"` no puede sumar más de 50 piezas
 * entre sus tallas. La comparten el schema de las partidas (bloquea el Guardar
 * en los tres flujos y el envío a revisión) y los diálogos de agregar
 * productos, tallas y reflejante.
 *
 * La partida se nombra por su posición en la cotización (`Partida N`, índice
 * + 1), igual que el backend. Si el backend fusiona dos partidas idénticas al
 * guardar (`_merge_detalle`), su N y su conteo pueden diferir del de aquí; ese
 * caso lo cubre su 400 `detalle`, que ya se muestra en el toast.
 */
import type { QuoteItem } from "../types";

/** `MAX_PIEZAS_REFLEJANTE_INVENTARIO` del backend. */
const REFLEJANTE_INVENTARIO_MAX_PIEZAS = 50;

/** `opcion` de la especificación «Del inventario» (ver `OPCION_OPTIONS`). */
const OPCION_INVENTARIO = "catalogo";

/** ¿La partida lleva reflejante «Del inventario»? */
const usesInventoryReflective = (reflejantes: QuoteItem["reflejantes"]): boolean =>
  Boolean(reflejantes?.activo) &&
  (reflejantes?.especificaciones ?? []).some(
    (spec) => spec.opcion.trim().toLowerCase() === OPCION_INVENTARIO,
  );

/**
 * Piezas de la partida: SOLO la suma de sus tallas, como el backend. Los tres
 * mappers del payload arman las filas de talla únicamente desde `tallas`, así
 * que una partida sin tallas no manda piezas aunque tenga `cantidad`.
 */
const linePieces = (tallas: readonly { cantidad: number }[] | undefined): number =>
  (tallas ?? []).reduce((sum, talla) => sum + (Number(talla.cantidad) || 0), 0);

/**
 * Error del tope para UNA partida: el mismo texto que el 400 `detalle` del
 * backend (EC-576), o `null` si no lo excede. `partida` es su posición 1-based
 * en la cotización. Lo usan el schema de las partidas y los tres diálogos.
 */
export const reflectiveInventoryCapError = (
  reflejantes: QuoteItem["reflejantes"],
  tallas: readonly { cantidad: number }[] | undefined,
  partida: number,
): string | null => {
  const piezas = linePieces(tallas);
  return usesInventoryReflective(reflejantes) && piezas > REFLEJANTE_INVENTARIO_MAX_PIEZAS
    ? `Partida ${partida}: el reflejante «Del inventario» admite máximo ${REFLEJANTE_INVENTARIO_MAX_PIEZAS} piezas y lleva ${piezas}. Cámbialo a «Fabricación especial» o reduce las piezas.`
    : null;
};
