import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import type { CuentaPorCobrar } from "@/src/features/accounts-receivable/interfaces/accounts-receivable.interface";
import { hasPermission } from "@/src/utils/permissions";
import { COBRO_DRAFT_WRITE_PERMISSION } from "../constants/collectionPermissions";
import type { Cobro } from "../interfaces/collection.interface";
import { COBRO_MONEDA_LOCAL, type CobroFormValues } from "../schemas/createCobro.schema";
import type { CobroRow } from "./collection.utils";

/**
 * ¿Se ofrecen las acciones de borrador ("Editar", "Aplicar", "Eliminar") a ESTE
 * usuario para ESTE cobro? Solo un `Borrador` activo, con el permiso que el
 * backend exige en toda escritura de cobros. Editar un cobro aplicado queda
 * fuera de alcance.
 */
export const canManageCobroDraft = (
  cobro: Pick<Cobro, "estatus" | "activo">,
  user: PermissionContext | null | undefined,
): boolean => cobro.estatus === "Borrador" && cobro.activo && hasPermission(COBRO_DRAFT_WRITE_PERMISSION, user);

/**
 * ¿Se ELIMINA (DELETE) en vez de cancelarse? Un `Borrador` sin folio: borrarlo
 * no deja hueco en la serie `COBROS`. Con folio se cancela, para conservar el
 * consecutivo; el backend asigna folio al guardar las primeras líneas.
 */
export const isDeletableCobroDraft = (cobro: Pick<Cobro, "estatus" | "folio">): boolean =>
  cobro.estatus === "Borrador" && !cobro.folio;

export const COBRO_DRAFT_APPLY_WITHOUT_LINES_MESSAGE =
  "Agrega al menos una cuenta por cobrar al borrador antes de aplicarlo.";

export const COBRO_DRAFT_NOT_DRAFT_MESSAGE = "El cobro ya no está en borrador.";

/**
 * Borrador cuya cuenta bancaria se desactivó: el backend solo acepta cuentas
 * activas en `cuenta_bancaria`, así que no se guarda ni se aplica hasta elegir
 * otra.
 */
export const COBRO_DRAFT_INACTIVE_ACCOUNT_MESSAGE =
  "La cuenta bancaria de este borrador está inactiva: elige una cuenta activa para guardarlo o aplicarlo.";

/**
 * Borrador cuyo cliente se desactivó: el backend solo acepta clientes activos en
 * `cliente`, y el cliente no cambia mientras el borrador tenga líneas.
 */
export const COBRO_DRAFT_INACTIVE_CLIENT_MESSAGE =
  "El cliente de este borrador está inactivo: reactívalo o cancela el borrador.";

/**
 * Valores con que el formulario edita un borrador. Folio de factura, moneda y
 * saldo de cada línea se resuelven contra el listado completo de CxC; una CxC
 * que no aparezca queda con saldo 0 (al aplicar, el formulario pide el saldo
 * vigente de todos modos). `moneda` es solo el respaldo mientras el catálogo de
 * cuentas no la resuelve: el formulario usa la de la cuenta elegida.
 */
export const cobroToFormValues = (
  cobro: CobroRow,
  cxcIndex: ReadonlyMap<number, CuentaPorCobrar>,
): CobroFormValues => ({
  cliente: cobro.cliente,
  cuenta_bancaria: cobro.cuenta_bancaria,
  moneda: cobro.moneda_codigo,
  fecha_cobro: cobro.fecha_cobro,
  // Siempre el guardado: el formulario decide con la moneda de la cuenta (ya
  // resuelta) si lo muestra y lo envía; en MXN no viaja.
  tipo_cambio: cobro.moneda_codigo === COBRO_MONEDA_LOCAL ? "" : cobro.tipo_cambio,
  metodo_pago: cobro.metodo_pago,
  referencia: cobro.referencia,
  referencia_operacion: cobro.referencia_operacion ?? "",
  observaciones: cobro.observaciones ?? "",
  cobro_detalles: cobro.cobro_detalles.map((linea) => {
    const cxc = cxcIndex.get(linea.cxc);
    return {
      cxc: linea.cxc,
      saldo: cxc?.saldo ?? "0.00",
      moneda_codigo: cxc?.moneda_codigo ?? "",
      factura_folio: cxc?.factura_folio || `CxC #${linea.cxc}`,
      importe_aplicado: linea.importe_aplicado,
      observaciones: linea.observaciones ?? "",
    };
  }),
});
