/**
 * Destinos de la programación de un pedido (`PATCH /ventas/pedidos/{id}/programar/`).
 *
 * Lista blanca CERRADA: réplica exacta de `DESTINOS_PROGRAMACION` del backend,
 * que la fija por decisión de producto y no la expone en ningún endpoint. Se
 * guarda y se envía el CÓDIGO; la etiqueta vive solo aquí. Agregar un destino
 * es un cambio coordinado con el backend, no algo que se derive de otro enum.
 */
export const PEDIDO_PROGRAMACION_DESTINOS = [
  "BORDADO",
  "REFLEJANTE",
  "CORTE_MANGA",
  "EMBARQUE",
  "APARTADO",
] as const;

export type PedidoProgramacionDestino = (typeof PEDIDO_PROGRAMACION_DESTINOS)[number];

export const PEDIDO_PROGRAMACION_DESTINO_LABELS: Record<PedidoProgramacionDestino, string> = {
  BORDADO: "Bordado",
  REFLEJANTE: "Reflejante",
  CORTE_MANGA: "Corte de manga",
  EMBARQUE: "Embarque",
  APARTADO: "Apartado",
};

export const isPedidoProgramacionDestino = (value: unknown): value is PedidoProgramacionDestino =>
  typeof value === "string" && Object.hasOwn(PEDIDO_PROGRAMACION_DESTINO_LABELS, value);

/** Etiqueta del destino; un código fuera de la lista se muestra tal cual, marcado. */
export const getPedidoProgramacionDestinoLabel = (destino: string): string =>
  isPedidoProgramacionDestino(destino)
    ? PEDIDO_PROGRAMACION_DESTINO_LABELS[destino]
    : `Desconocido (${destino})`;
