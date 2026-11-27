/**
 * Cantidades escritas por lecturas cuyo render todavía no llega (EC-997).
 *
 * La antena entrega todas las lecturas de un sondeo seguidas, en el mismo
 * efecto (`useRfidEpcFeed`): cada una corre el mismo `procesarLectura` del
 * render anterior y vería la misma cantidad, así que 120 lecturas escribían
 * 120 veces "anterior + 1" y sumaban una sola pieza. Aquí se guarda lo que la
 * tanda ya escribió para que la siguiente lectura parta de ahí.
 *
 * Vale mientras `source` sea el MISMO objeto de cantidades con el que se
 * escribió: en cuanto el render trae uno nuevo (ya con lo escrito, o con una
 * edición a mano, "Todo" o "Limpiar"), se olvida y manda `source`.
 */
export class PendingQuantities {
  private source: Readonly<Record<string, string>> | null = null;
  private values: Record<string, string> = {};

  /** El valor vigente de `key`: lo último que escribió esta tanda o, si no, el de `source`. */
  read(source: Readonly<Record<string, string>>, key: string): string | undefined {
    this.sync(source);
    return key in this.values ? this.values[key] : source[key];
  }

  /** Anota lo que se acaba de escribir (el llamador escribe también en el formulario). */
  write(source: Readonly<Record<string, string>>, key: string, value: string): void {
    this.sync(source);
    this.values[key] = value;
  }

  private sync(source: Readonly<Record<string, string>>) {
    if (this.source === source) return;
    this.source = source;
    this.values = {};
  }
}
