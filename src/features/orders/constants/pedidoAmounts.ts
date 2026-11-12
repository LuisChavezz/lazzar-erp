import type { Order } from "../interfaces/order.interface";

/**
 * Cargos de cabecera del pedido, en el orden del formulario (Flete, Seguros,
 * Anticipo) y luego los demás importes de cabecera. Todos contables: se pintan
 * solo si son > 0. Los comparten "Cargos Adicionales" (`OrderChargesSection`)
 * y el PDF del pedido.
 */
export const PEDIDO_HEADER_CHARGES: readonly { key: keyof Order; label: string }[] = [
  { key: "flete", label: "Flete" },
  { key: "seguros", label: "Seguros" },
  { key: "anticipo", label: "A cuenta (Anticipo)" },
  { key: "envio", label: "Envío" },
  { key: "programa_bordados", label: "Programa bordados" },
  { key: "serigrafia", label: "Serigrafía" },
  { key: "reflejante", label: "Reflejante" },
  { key: "bordado_pantalones_extras", label: "Bordado pantalones (extras)" },
];

/**
 * Condiciones de pago (booleanas). Todas menos `vendedor_autoriza` son campos
 * contables que el backend elimina sin permiso, así que el bloque entero solo
 * se pinta con datos contables: con una sola bandera sobreviviente, las demás
 * ausentes se leerían como "no aplica" cuando en realidad "no se sabe". Las
 * comparten `OrderCommercialInfoSection` y el PDF del pedido.
 */
export const PEDIDO_PAYMENT_CONDITIONS: readonly { key: keyof Order; label: string }[] = [
  { key: "anticipo_total", label: "Anticipo total" },
  { key: "anticipo_parcial", label: "Anticipo parcial" },
  { key: "vendedor_autoriza", label: "Vendedor autoriza" },
  { key: "pago_antes_embarque", label: "Pago antes de embarque" },
  { key: "por_confirmar", label: "Por confirmar" },
  { key: "otra_cantidad", label: "Otra cantidad" },
];
