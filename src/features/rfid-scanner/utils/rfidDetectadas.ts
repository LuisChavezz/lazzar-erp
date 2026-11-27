/** Cuántas etiquetas pinta la tira de la antena: las más recientes. */
export const RFID_DETECTADAS_VISIBLES = 50;

/**
 * Lo que muestra la tira de la antena: las últimas etiquetas (la más reciente
 * primero, a lo más `RFID_DETECTADAS_VISIBLES`) y los totales EXACTOS de todo
 * lo detectado, que no se recortan con la lista.
 */
export interface RegistroDetectadas<T> {
  recientes: T[];
  total: number;
  sumadas: number;
}

export const registroVacio = <T,>(): RegistroDetectadas<T> => ({ recientes: [], total: 0, sumadas: 0 });

/**
 * Agrega una tanda (en el orden en que se leyó) de una sola vez (EC-997): un
 * sondeo con cursor puede traer miles de lecturas, y anteponerlas una por una
 * copiaba la lista entera en cada lectura. `sumada` dice cuáles sumaron pieza.
 */
export const agregarDetectadas = <T,>(
  prev: RegistroDetectadas<T>,
  tanda: readonly T[],
  sumada: (entrada: T) => boolean,
  visibles = RFID_DETECTADAS_VISIBLES,
): RegistroDetectadas<T> => {
  if (tanda.length === 0) return prev;
  const nuevas = tanda.slice(-visibles).reverse();
  return {
    recientes: [...nuevas, ...prev.recientes].slice(0, visibles),
    total: prev.total + tanda.length,
    sumadas: prev.sumadas + tanda.filter(sumada).length,
  };
};
