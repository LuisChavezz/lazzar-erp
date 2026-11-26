import type {
  CrearOpResponse,
  PedidoOmitido,
  PreOrderListItem,
  PreOrderPedidoVinculado,
} from "../interfaces/pre-order.interface";

type OmisionFields = Pick<PreOrderListItem, "pedidos_omitidos_fuente">;

/** `P-…`, o `#id` si el pedido no tiene folio. */
const pedidoLabel = (p: { id: number; folio: string | null }) => p.folio?.trim() || `#${p.id}`;

/** Éxito de `crear-op/`: el folio llega en `folio_op` (`folio` de respaldo). */
export const crearOpSuccessMessage = (res: Pick<CrearOpResponse, "folio_op" | "folio">): string => {
  const folio = res.folio_op || res.folio;
  return folio ? `Orden de producción ${folio} creada.` : "Orden de producción creada.";
};

/**
 * Aviso tras `crear-op/` cuando dejó pedidos fuera de la OP (nucleo-erp#1370):
 * cada uno con su folio y su motivo. `null` si no omitió ninguno.
 */
export const pedidosOmitidosWarning = (omitidos: readonly PedidoOmitido[] | undefined): string | null => {
  if (!omitidos?.length) return null;
  const lista = omitidos.map((o) => `${pedidoLabel(o)} (${o.motivo})`).join(", ");
  return omitidos.length === 1
    ? `El pedido ${lista} no se ligó a la OP.`
    : `Estos pedidos no se ligaron a la OP: ${lista}.`;
};

/**
 * Motivo de omisión de un pedido ligado que cuenta para la UI: solo con una
 * fuente que lo respalde (`vista_previa` o `registrada`, EC-980). En
 * `sin_registro` o sin fuente, `null` aunque el campo viniera con valor.
 */
export const effectiveMotivoOmision = (
  pre: OmisionFields,
  pedido: Pick<PreOrderPedidoVinculado, "motivo_omision">,
) =>
  pre.pedidos_omitidos_fuente === "vista_previa" || pre.pedidos_omitidos_fuente === "registrada"
    ? (pedido.motivo_omision ?? null)
    : null;

/**
 * Marca de un pedido ligado en el detalle de la pre-orden: a futuro en la
 * vista previa (resurtido abierto) y en pasado cuando ya se creó la OP.
 */
export const pedidoOmisionLabel = (
  pre: OmisionFields,
  pedido: Pick<PreOrderPedidoVinculado, "motivo_omision">,
): string | null => {
  const motivo = effectiveMotivoOmision(pre, pedido);
  if (!motivo) return null;
  return pre.pedidos_omitidos_fuente === "vista_previa"
    ? `Quedará fuera de la OP: ${motivo}`
    : `Quedó fuera de la OP: ${motivo}`;
};

/**
 * Clientes de los pedidos ligados que sí cubre la pre-orden (sin los
 * omitidos), sin repetir. Vacío si no queda ninguno con cliente.
 */
export const linkedPedidoClientes = (
  pre: OmisionFields & Pick<PreOrderListItem, "pedidos_vinculados">,
): string[] => [
  ...new Set(
    (pre.pedidos_vinculados ?? [])
      .filter((p) => !effectiveMotivoOmision(pre, p))
      .map((p) => p.cliente_nombre)
      .filter((c): c is string => Boolean(c)),
  ),
];
