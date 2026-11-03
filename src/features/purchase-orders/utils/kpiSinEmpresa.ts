import type { PurchaseOrderKpis } from "../interfaces/purchase-order-kpis.interface";
import type { PurchaseOrderReceiptKpis } from "@/src/features/purchase-order-receipts/interfaces/purchase-order-receipt-kpis.interface";
import type { SupplierKpis, SupplierKpisUnavailable } from "@/src/features/suppliers/interfaces/supplier-kpis.interface";

/**
 * ¿La respuesta de KPIs de Compras es la de un usuario SIN EMPRESA (superusuario
 * incluido)? Hace falta porque ahí `puede_ver_importes` también llega `false`
 * (backend #860) y `isAmountOnlyKpiHidden` debe dejar ver el motivo del bloque
 * ("Usuario sin empresa asignada.") en vez del de permiso.
 *
 * Ninguna de las tres respuestas trae una bandera explícita de "sin empresa".
 * Cada función lee una señal ESTRUCTURAL de su respuesta, no el texto de
 * `motivo` (la doc del backend pide no decidir por ese texto):
 *
 * - `ordenes/kpis/`: sin empresa, `_kpis_vacio` manda los cuatro bloques no
 *   disponibles (#861). Con empresa, `ocs_abiertas` siempre se calcula
 *   (`disponible: true`), con o sin permiso: el permiso solo le quita `monto`.
 * - `recepciones/kpis/`: `filtros` es `null` solo en `_kpis_vacio`; con empresa
 *   siempre es el dict del alcance.
 * - `proveedores/kpis/`: el único `disponible` es el de la raíz, y es `false`
 *   solo sin empresa.
 */
export const isPurchaseOrderKpisSinEmpresa = (data: PurchaseOrderKpis): boolean => !data.ocs_abiertas.disponible;

export const isPurchaseOrderReceiptKpisSinEmpresa = (data: PurchaseOrderReceiptKpis): boolean =>
  data.filtros === null;

export const isSupplierKpisSinEmpresa = (data: SupplierKpis): data is SupplierKpisUnavailable => !data.disponible;
