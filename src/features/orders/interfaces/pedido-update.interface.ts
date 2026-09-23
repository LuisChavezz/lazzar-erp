import type { PedidoClasificacion } from "../constants/pedidoStatus";

/**
 * Cuerpo de `PATCH /ventas/pedidos/{id}/` desde la cabecera del detalle.
 *
 * UNA sola clave por petición, y el tipo lo impone: si el cuerpo CONTIENE
 * `clasificacion` o `fecha_confirmacion` —aunque sea sin cambio, aunque sea
 * `null`— el backend exige mesa de control (superuser, `is_admin_empresa` o rol
 * activo en el departamento `MESACONTROL`) y rechaza la petición ENTERA con
 * 400 `{"permiso": "…"}`. Mandar solo lo editado evita que un campo arrastre
 * el rechazo del otro.
 */
export type PedidoHeaderUpdate =
  | { clasificacion: PedidoClasificacion | null }
  | {
      /**
       * Datetime ISO con offset explícito (medianoche local del día elegido,
       * ver `toLocalMidnightIso`), o `null` para quitar la confirmación.
       */
      fecha_confirmacion: string | null;
    };
