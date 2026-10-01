import type {
  PedidoProgramacion,
  PedidoProgramacionConf,
} from "../interfaces/pedido-programacion.interface";

/**
 * Un renglón VÁLIDO de la programación: un objeto, con `comentarios` ya
 * normalizado a string. `destino` y `cantidad` quedan crudos (vienen de un
 * `JSONField`); cada consumidor los estrecha/formatea a su manera.
 */
export type PedidoProgramacionValida = PedidoProgramacion & { comentarios: string };

/**
 * Renglones de `programacion_conf` que cuentan como parcialidad. Fuente ÚNICA
 * de la regla para el diálogo "Programar pedido" y la tabla "Pedidos
 * programados", para que ambos cuenten los mismos renglones:
 *
 * - `null`, `{}`, un `programaciones` ausente o no-arreglo → `[]`.
 * - Se descarta todo elemento que no sea un objeto (`null`, primitivo o
 *   arreglo): no es un renglón y leer sus campos rompería al consumidor.
 * - `comentarios` ausente (entradas previas a la clave) o no-string → `""`.
 *
 * Conserva el orden del arreglo: la posición en el resultado es el `indice`
 * de la parcialidad.
 */
export const getProgramacionesValidas = (
  conf: PedidoProgramacionConf | null | undefined,
): PedidoProgramacionValida[] => {
  const programaciones: unknown = conf?.programaciones;
  if (!Array.isArray(programaciones)) return [];
  return programaciones
    .filter(
      (p): p is PedidoProgramacion => typeof p === "object" && p !== null && !Array.isArray(p),
    )
    .map((programacion) => ({
      ...programacion,
      comentarios: typeof programacion.comentarios === "string" ? programacion.comentarios : "",
    }));
};
