/**
 * Códigos de permiso que gobernaban las ACCIONES de Mesa de Control antes de
 * EC-943. Hoy esas acciones se muestran con `es_mesa_control` de la sesión
 * (`canActAsMesaControl`, `src/utils/permissions.ts`); estos códigos solo se
 * evalúan como respaldo para una sesión emitida antes de que la trajera.
 *
 * Los códigos de LECTURA (`R-MESACONTROL-*`) no están aquí: siguen gobernando
 * rutas y sidebar.
 */

/** Acciones sobre pedidos: edición en línea, SKU de muestra, Editar, Programar y Cancelar. */
export const MESA_CONTROL_PEDIDOS_PERMISSION = "E-MESACONTROL-PEDIDOS";

/** Autorizar una cotización y aceptar sus cambios. */
export const MESA_CONTROL_AUTHORIZE_QUOTE_PERMISSION = "A-MESACONTROL-COTI";

/** Rechazar una cotización y rechazar sus cambios. */
export const MESA_CONTROL_REJECT_QUOTE_PERMISSION = "D-MESACONTROL-COTI";
