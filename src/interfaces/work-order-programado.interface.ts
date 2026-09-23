/**
 * `programado` de cada pedido en los onboardings de órdenes de trabajo
 * (`GET /produccion/orden-bordado|orden-reflejante|orden-corte-manga/onboarding/`).
 *
 * Lo emite UN helper compartido del backend para los tres endpoints, de ahí que
 * el tipo viva aquí y no en cada módulo. Es el AGREGADO POR PEDIDO de lo que
 * Mesa de Control programó hacia ese destino (`Pedido.programacion_conf`, vía
 * `PATCH /ventas/pedidos/{id}/programar/`): sin desglose por línea ni por talla.
 * `null` cuando no hay programación para ese destino.
 *
 * Es solo informativo: no es `cantidad_asignada` (lo ya consumido por órdenes)
 * ni debe usarse como tope, precarga o validación de cantidades.
 *
 * No es `PedidoProgramacion` (`features/orders`): aquí no viajan `destino` ni
 * `usuario_id`. `cantidad` llega como float. `fecha` es un datetime ISO con
 * zona. `usuario_nombre` se modela nullable por defensa: el contrato no
 * garantiza que siempre venga resuelto.
 *
 * Los `*OnboardingPedido` lo declaran OPCIONAL (`programado?:`): la clave
 * ausente (backend sin a3f232f) oculta el indicador, a diferencia de `null`.
 */
export type WorkOrderProgramado = {
  cantidad: number;
  fecha: string;
  usuario_nombre: string | null;
} | null;
