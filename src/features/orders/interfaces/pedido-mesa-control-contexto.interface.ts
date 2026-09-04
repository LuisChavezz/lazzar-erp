/**
 * Contrato de `GET /ventas/pedidos/{id}/editar-mesa-control-contexto/` — el
 * precheck de la edición estricta introducido en `ab63ce2`.
 *
 * MISMA FORMA en los tres sitios donde aparece: el 200 del precheck, el 200 con
 * `editable: false`, y el **409** que devuelve el propio POST de edición cuando
 * el bloqueo aparece entre que se abrió la pantalla y se pulsó Guardar. Por eso
 * hay un solo tipo y no dos.
 */

/**
 * Entrada de `bloqueos`. Son DOS formas distintas, no una con campos opcionales:
 *
 * - Las de nivel DOCUMENTO se construyen desde un `.values(...)` y traen
 *   `id`/`folio`/`estatus`.
 * - Las de nivel RENGLÓN se construyen desde un `.exists()` — una sola entrada
 *   por tipo aunque haya N filas ligadas— y traen ÚNICAMENTE `tipo` y
 *   `accion_requerida`.
 *
 * OJO con `estatus`: es un STRING en factura (`"Emitida"`) y picking
 * (`"En proceso"`, `"Pendiente"`…), pero un ENTERO en las cuatro órdenes de
 * producción, cuyos `estatus_*` son `IntegerField` con `IntegerChoices`. Nunca
 * se debe asumir que se puede pintar tal cual sin comprobar el tipo.
 */
export type PedidoMesaControlBloqueo =
  | {
      tipo:
        | "factura_emitida"
        | "orden_bordado_activa"
        | "orden_reflejante_activa"
        | "orden_corte_manga_activa"
        | "orden_produccion_activa"
        | "picking_activo";
      id: number;
      /** `null` posible: `Factura.folio` es nullable. */
      folio: string | null;
      /** String en factura y picking; ENTERO en las órdenes de producción. */
      estatus: string | number;
      accion_requerida: string;
    }
  | {
      tipo:
        | "factura_detalle_ligado"
        | "nota_credito_ligada"
        | "orden_bordado_detalle_ligado"
        | "orden_reflejante_detalle_ligado"
        | "orden_corte_manga_detalle_ligado"
        | "orden_produccion_detalle_ligado"
        | "picking_detalle_ligado"
        | "reserva_inventario_activa"
        | "reserva_talla_activa";
      accion_requerida: string;
    };

export interface PedidoMesaControlContexto {
  pedido_id: number;
  folio: string | null;
  editable: boolean;
  /** Constante `"estricto_contable_operativo"`; no hay otra rama que ramificar. */
  modo: string;
  /**
   * Los cuatro siguientes están HARDCODEADOS en el backend (`True` el primero,
   * `False` los tres de eliminar) y nunca varían. Se tipan porque llegan en la
   * respuesta, pero NO se debe ramificar sobre ellos: el frontend implementa la
   * regla directamente.
   */
  requiere_ids_detalle: boolean;
  permite_eliminar_renglones: boolean;
  permite_eliminar_tallas: boolean;
  permite_eliminar_servicios_extras: boolean;
  /** Siempre `=== !editable`. */
  requiere_cancelacion_previa: boolean;
  /** `null` cuando es editable; `"pedido_con_bloqueos"` es el único valor. */
  codigo: string | null;
  mensaje: string;
  bloqueos: PedidoMesaControlBloqueo[];
  /**
   * Los `tipo` de `bloqueos`, en paralelo 1:1 y **con duplicados** (no es un
   * conjunto). No aporta nada sobre recorrer `bloqueos`; se tipa por completitud.
   */
  tipos_bloqueo: string[];
}

/** Discrimina las dos formas de entrada sin repetir la lista de `tipo`. */
export const bloqueoTieneDocumento = (
  bloqueo: PedidoMesaControlBloqueo,
): bloqueo is Extract<PedidoMesaControlBloqueo, { id: number }> => "id" in bloqueo;
