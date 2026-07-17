import { resolveItemSelection } from "../schemas/stock-transfer.schema";
import type { StockTransferFormValues } from "../schemas/stock-transfer.schema";
import type {
  CreateTransferenciaPayload,
  TransferenciaDetallePayload,
} from "../interfaces/stock-transfer.interface";

/**
 * Convierte los valores del formulario al cuerpo exacto de
 * `POST /wms/transferencias/`.
 *
 * Traducción de centinelas del formulario → contrato del API:
 *  - `tipo_item` decide cuál id se envía; el inactivo viaja como `null`.
 *  - `cantidad` string decimal → normalizada a 4 posiciones (`"10.0000"`).
 *  - ubicaciones vacías (`0`) → `null` (son opcionales).
 *  - `lote`/`serie` ya no se capturan en el formulario: siempre viajan como
 *    `null`, fijo, para cumplir el contrato documentado del API.
 *  - `observaciones` vacía → se omite por completo (no se envía cadena vacía).
 *
 * Nunca incluye `empresa`, `sucursal`, `folio`, `usuario`, `status` ni `pedido`:
 * los primeros los resuelve el backend y el último no existe en este endpoint.
 */
export function buildTransferPayload(
  values: StockTransferFormValues,
): CreateTransferenciaPayload {
  const transferencia_detalle: TransferenciaDetallePayload[] =
    values.transferencia_detalle.map((line) => {
      const { producto, producto_variante } = resolveItemSelection(
        line.tipo_item,
        line.producto,
        line.producto_variante,
      );

      return {
        producto,
        producto_variante,
        cantidad: Number(line.cantidad).toFixed(4),
        ubicacion_origen: line.ubicacion_origen > 0 ? line.ubicacion_origen : null,
        ubicacion_destino:
          line.ubicacion_destino > 0 ? line.ubicacion_destino : null,
        lote: null,
        serie: null,
      };
    });

  const payload: CreateTransferenciaPayload = {
    almacen_origen: values.almacen_origen,
    almacen_destino: values.almacen_destino,
    transferencia_detalle,
  };

  const observaciones = values.observaciones.trim();
  if (observaciones.length > 0) {
    payload.observaciones = observaciones;
  }

  return payload;
}
