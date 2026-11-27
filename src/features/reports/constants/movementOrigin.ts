/** Nombre para el usuario del documento que originó un movimiento (`origen_tipo`). */
const ORIGEN_LABEL: Record<string, string> = {
  PEDIDO: "Pedido",
  RECEPCION: "Recepción",
  TRANSFERENCIA: "Transferencia",
  AJUSTE: "Ajuste",
  OP: "Orden de producción",
  PICKING: "Surtido",
  DEVOLUCION: "Devolución",
};

/** Etiqueta del origen; el código crudo si el front aún no lo conoce. */
export const movementOriginLabel = (origen: string | null | undefined): string | null =>
  origen ? (ORIGEN_LABEL[origen] ?? origen) : null;
