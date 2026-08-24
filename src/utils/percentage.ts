import { safeParseAmount } from "./formatCurrency";

/**
 * Acota un porcentaje YA numérico al rango 0–100, para usarlo como ancho de
 * una barra de progreso. Es exactamente la expresión que estaba duplicada
 * en línea en `EmbroideryProgressSummary` (tres veces) y en `KpiGrid`, extraída
 * sin cambiarla: `NaN` sigue saliendo `NaN` (`Math.min`/`Math.max` lo propagan),
 * porque los call sites que necesitan protegerse de eso ya traen su propio
 * guardia y cambiar el comportamiento aquí los alteraría en silencio.
 *
 * Para valores que vienen del API como STRING usa `parsePercentageValue`, que
 * sí garantiza un número finito.
 */
export const clampPercentage = (value: number): number =>
  Math.min(100, Math.max(0, value));

/**
 * Lee un porcentaje que el backend serializa como STRING y lo devuelve listo
 * para pintar una barra: número finito en el rango 0–100.
 *
 * El parseo lo hace `safeParseAmount` —el parser tolerante que ya existe para
 * los decimales del API—, así que absorbe sin ramas los dos formatos con que
 * viaja el MISMO campo (`"0"` cuando vale cero, `"90.0000"` cuando no) y
 * también `null`/`undefined`/valores no numéricos, que caen a 0. De ahí que
 * nunca devuelva `NaN`, a diferencia de `clampPercentage` a secas.
 *
 * El acotado no es cosmético: aunque el backend ya tope los `pct_*` en
 * `"100.0000"`, el ancho en CSS no puede pasarse de 100 si esa garantía se
 * rompe. El número que se MUESTRA se formatea aparte con
 * `formatQuantityValue`.
 */
export const parsePercentageValue = (
  value: string | null | undefined,
): number => clampPercentage(safeParseAmount(value));
