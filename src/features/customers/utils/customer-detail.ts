import { PEDIDO_ESTATUS_CONFIG } from "@/src/features/orders/constants/pedidoStatus";

// Compara etiquetas de estatus sin importar mayúsculas, acentos, guiones bajos
// ni espacios repetidos: el backend manda el display de su enum ("POR
// AUTORIZAR") y `PEDIDO_ESTATUS_CONFIG` trae la etiqueta es-MX ("Por autorizar").
const normalizeEstatusLabel = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const NEUTRAL_CHIP =
  "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300";

export interface PedidoEstatusChip {
  key: string;
  label: string;
  count: number;
  className: string;
}

/**
 * Convierte `resumen_comercial.pedidos_por_estatus` (`{ label: conteo }`,
 * disperso) en los chips del resumen: SIEMPRE los 5 estatus del enum en su
 * orden canónico, con 0 para los ausentes. Una etiqueta que no corresponda a
 * ningún estatus conocido NO se descarta: se agrega al final como chip neutro
 * con su etiqueta cruda, para que el total nunca "pierda" pedidos en silencio.
 */
export const buildPedidoEstatusChips = (
  pedidosPorEstatus: Record<string, number>,
): PedidoEstatusChip[] => {
  const canonical = Object.entries(PEDIDO_ESTATUS_CONFIG)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([estatus, config]) => ({
      key: `estatus-${estatus}`,
      label: config.label,
      count: 0,
      className: config.className,
      normalized: normalizeEstatusLabel(config.label),
    }));

  const unmapped: PedidoEstatusChip[] = [];

  for (const [rawLabel, count] of Object.entries(pedidosPorEstatus)) {
    const match = canonical.find(
      (chip) => chip.normalized === normalizeEstatusLabel(rawLabel),
    );
    if (match) {
      match.count += count;
    } else {
      unmapped.push({
        key: `raw-${rawLabel}`,
        label: rawLabel,
        count,
        className: NEUTRAL_CHIP,
      });
    }
  }

  return [
    ...canonical.map(({ key, label, count, className }) => ({
      key,
      label,
      count,
      className,
    })),
    ...unmapped,
  ];
};
