import type { PolizaEstatus } from "../interfaces/poliza.interface";

/**
 * Texto de la confirmación de cancelar, según el estatus con que se ABRIÓ (ver
 * `cancelarPoliza`): un `Borrador` solo cambia de estatus; una `Contabilizada`
 * genera además una contrapóliza que revierte el asiento.
 */
export const cancelarPolizaDescription = (etiqueta: string, estatus: PolizaEstatus): string =>
  estatus === "Contabilizada"
    ? `¿Deseas cancelar la póliza ${etiqueta}? Ya está contabilizada: se generará una contrapóliza, con su propio folio y fechada hoy, que la revierte con los cargos y abonos invertidos. La original se conserva en el listado con estatus Cancelada.`
    : `¿Deseas cancelar el borrador ${etiqueta}? Todavía no forma parte de la contabilidad, así que solo cambia su estatus: se conserva en el listado como Cancelada y ya no podrá contabilizarse.`;
