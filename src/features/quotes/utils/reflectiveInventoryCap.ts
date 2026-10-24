/**
 * Reflejante «Del inventario»: máximo 50 piezas por partida (EC-563 CO-06;
 * backend EC-576).
 *
 * Misma regla que el backend: una partida con reflejante en la que ALGUNA
 * especificación tiene `opcion: "catalogo"` no puede sumar más de 50 piezas
 * entre sus tallas. La comparten el schema de la partida (bloquea el Guardar en
 * los tres flujos) y los diálogos de agregar productos, tallas y reflejante.
 */
import type { QuoteItem } from "../types";

/** `MAX_PIEZAS_REFLEJANTE_INVENTARIO` del backend. */
export const REFLEJANTE_INVENTARIO_MAX_PIEZAS = 50;

/** `opcion` de la especificación «Del inventario» (ver `OPCION_OPTIONS`). */
const OPCION_INVENTARIO = "catalogo";

export const REFLEJANTE_INVENTARIO_MESSAGE = `Con reflejante «Del inventario» la partida no puede pasar de ${REFLEJANTE_INVENTARIO_MAX_PIEZAS} piezas.`;

type ReflectiveConfig = QuoteItem["reflejantes"];

/** ¿La partida lleva reflejante «Del inventario»? */
const usesInventoryReflective = (reflejantes: ReflectiveConfig): boolean =>
  Boolean(reflejantes?.activo) &&
  (reflejantes?.especificaciones ?? []).some(
    (spec) => spec.opcion.trim().toLowerCase() === OPCION_INVENTARIO,
  );

/** ¿`piezas` excede el tope con este reflejante? */
export const exceedsReflectiveInventoryCap = (
  reflejantes: ReflectiveConfig,
  piezas: number,
): boolean => usesInventoryReflective(reflejantes) && piezas > REFLEJANTE_INVENTARIO_MAX_PIEZAS;

/** Piezas de la partida: la suma de sus tallas (o `cantidad` si no las trae). */
export const linePieces = (item: Pick<QuoteItem, "tallas" | "cantidad">): number =>
  item.tallas && item.tallas.length > 0
    ? item.tallas.reduce((sum, talla) => sum + (Number(talla.cantidad) || 0), 0)
    : Number(item.cantidad) || 0;
