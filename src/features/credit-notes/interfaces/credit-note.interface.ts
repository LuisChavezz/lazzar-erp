/**
 * Contrato de `/finanzas/notas-credito/` (`NotaCreditoSerializer`,
 * `fields = "__all__"` más `cliente_nombre` y `factura_folio` de solo lectura, y
 * las líneas anidadas `nota_credito_detalles`). Nombres de llaves EN ESPAÑOL tal
 * cual los devuelve el backend — no traducir.
 *
 * Como en el resto de finanzas: respuesta en ARREGLO PLANO (sin envoltorio de
 * paginación), decimales como STRING ("1160.00") y fechas como "YYYY-MM-DD".
 *
 * `nota_credito_detalles` es de escritura SOLO EN EL ALTA
 * (`nested_write_on_create_only = ("nota_credito_detalles",)` en el serializer):
 * un PATCH posterior ignora las líneas por completo.
 *
 * DIFERENCIA CON EL RESTO DE FINANZAS: `NotaCredito` **no tiene campo
 * `empresa`**. No es que el servidor lo resuelva —como en `Pago` o `Banco`, que
 * usan `EmpresaResueltaEnServidorMixin`—: la columna no existe. El aislamiento
 * por empresa se hace por `factura__empresa` en el `get_queryset` y en las
 * validaciones del ViewSet. Por eso este archivo no declara `empresa` ni en
 * lectura ni en escritura.
 */

/**
 * Estatus de la nota, tal cual el enum del backend.
 *
 * A diferencia de `Pago` —cuya UI nunca produce `Borrador`—, aquí los tres son
 * alcanzables desde esta pantalla: el alta ofrece `Borrador` y `Emitida`, y
 * `Cancelada` la produce la acción `/cancelar/`. `Borrador` es además el ÚNICO
 * estatus desde el que la nota se puede editar o eliminar.
 */
export type NotaCreditoEstatus = "Borrador" | "Emitida" | "Cancelada";

/**
 * Renglón de `nota_credito_detalles`: el concepto de la factura que se acredita.
 *
 * Las líneas son DOCUMENTALES. El backend no valida que sumen `total` ni las usa
 * para calcular nada: el efecto sobre la cuenta por cobrar sale exclusivamente
 * de `nota.total` (ver `NotaCreditoService.aplicar_nota_credito`). Lo único que
 * el backend sí exige es que cada `factura_detalle` pertenezca a la factura de
 * la nota.
 */
export interface NotaCreditoDetalle {
  id: number;
  /** FK a la `NotaCredito` padre. Solo lectura en el serializer — nunca se envía. */
  nota_credito: number;
  /** FK a `finanzas.FacturaDetalle`. Debe pertenecer a la factura de la nota. */
  factura_detalle: number;
  /** Decimal en string. */
  cantidad: string;
  /** Decimal en string. */
  precio_unitario: string;
  /** Decimal en string. */
  impuesto: string;
  /** Decimal en string. */
  subtotal: string;
  /** Decimal en string. */
  total: string;
}

export interface NotaCredito {
  id: number;
  /** FK a `finanzas.Factura`. Requerido, no nullable. */
  factura: number;
  /** FK a `terceros.Cliente`. Requerido; el backend valida que sea el de la factura. */
  cliente: number;
  /** Calculado (`source="cliente.nombre"`), solo lectura. */
  cliente_nombre: string | null;
  /** Calculado (`source="factura.folio"`), solo lectura. */
  factura_folio: string | null;
  /**
   * Fecha "YYYY-MM-DD". `DateField(auto_now_add=True, null=True, blank=True)`:
   * la fija el backend al crear y es de SOLO LECTURA — nunca se envía. Es
   * nullable en el modelo, así que las filas anteriores a la corrección pueden
   * traerla nula.
   */
  fecha_emision: string | null;
  /**
   * Folio del documento. NO se autogenera: no hay `SerieFolio` detrás ni nada
   * que lo rellene en `perform_create`, así que lo captura el cliente y queda
   * `null` si no se envía.
   */
  folio: string | null;
  motivo: string | null;
  /** Decimal en string. Informativo: el backend no lo usa para nada. */
  subtotal: string;
  /** Decimal en string. Informativo: el backend no lo usa para nada. */
  impuestos: string;
  /**
   * Decimal en string. **Es el único importe con efecto contable**: al emitir,
   * el backend resta exactamente este valor al saldo de la cuenta por cobrar de
   * la factura, sin mirar las líneas.
   */
  total: string;
  estatus: NotaCreditoEstatus;
  observaciones: string | null;
  created_at: string | null;
  updated_at: string | null;
  /** Líneas anidadas. Puede venir vacío — el backend no exige ninguna. */
  nota_credito_detalles: NotaCreditoDetalle[];
}

/**
 * Renglón del cuerpo de alta. NO lleva `nota_credito` (solo lectura en el
 * serializer: el padre se resuelve al anidar) ni `id`.
 */
export interface CreateNotaCreditoDetallePayload {
  factura_detalle: number;
  /** Decimal en string, con 2 posiciones. */
  cantidad: string;
  /** Decimal en string, con 2 posiciones. */
  precio_unitario: string;
  /** Decimal en string, con 2 posiciones. */
  impuesto: string;
  /** Decimal en string, con 2 posiciones. */
  subtotal: string;
  /** Decimal en string, con 2 posiciones. */
  total: string;
}

/**
 * Cuerpo de `POST /finanzas/notas-credito/`.
 *
 * Tipo SEPARADO del de lectura a propósito: es la costura entre los valores del
 * formulario y lo que viaja al API (`buildNotaCreditoPayload`), igual que
 * `CreatePagoPayload`/`buildPagoPayload` en pagos.
 *
 * Omite `empresa` (no existe en el modelo), `fecha_emision` (`auto_now_add`, de
 * solo lectura), `created_at`/`updated_at` y los campos calculados.
 *
 * `estatus` es EXPLÍCITO y de dos valores: esta UI ofrece guardar como
 * `Borrador` (sin efecto contable) o emitir directo con `Emitida` (aplica el
 * crédito a la CxC en el mismo POST). `Cancelada` no se crea nunca desde el
 * alta: es el resultado de la acción `/cancelar/`.
 */
export interface CreateNotaCreditoPayload {
  factura: number;
  cliente: number;
  folio: string | null;
  motivo: string | null;
  subtotal: string;
  impuestos: string;
  total: string;
  estatus: Exclude<NotaCreditoEstatus, "Cancelada">;
  observaciones: string | null;
  nota_credito_detalles: CreateNotaCreditoDetallePayload[];
}

/**
 * Cuerpo del PATCH de emisión: `PATCH /finanzas/notas-credito/{id}/` con solo
 * `estatus`.
 *
 * Es la segunda mitad del flujo de dos pasos. `perform_update` aplica el crédito
 * a la CxC cuando el estatus PASA a `Emitida` desde otro valor, exactamente como
 * lo hace `perform_create` al crear ya emitida.
 *
 * Se manda PATCH y no PUT (`update` parcial) porque el resto de los campos no
 * cambian, y las líneas no se pueden tocar por esta vía en ningún caso
 * (`nested_write_on_create_only`).
 */
export interface EmitirNotaCreditoPayload {
  estatus: Extract<NotaCreditoEstatus, "Emitida">;
}
