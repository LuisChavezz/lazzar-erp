/** Género del sustantivo al que se refiere el plazo: "pedido vencido", "cuenta vencida". */
export type DeadlineGender = "m" | "f";

export interface DeadlineTextOptions {
  gender: DeadlineGender;
  /**
   * `true` (por defecto): inicial en mayúscula, para una etiqueta suelta
   * ("Faltan 3 días"). `false`: todo en minúscula, para ir a media frase
   * ("17 mar 2027 · faltan 113 días", "Cuenta vencida hace 2 días").
   */
  capitalize?: boolean;
}

const daysLabel = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;

/**
 * Texto de un plazo a partir de los días-calendario que faltan para la fecha
 * límite (EC-932), con signo: negativo = ya venció.
 * - `< 0`: "Vencido hace 1 día" / "Vencida hace 3 días";
 * - `0`: "Vence hoy";
 * - `1`: "Falta 1 día";
 * - `> 1`: "Faltan 5 días".
 *
 * Solo arma el texto: cada pantalla sigue calculando los días con su propio
 * "hoy" (el del backend o el día de México del navegador).
 */
export function formatDeadlineText(
  daysRemaining: number,
  { gender, capitalize = true }: DeadlineTextOptions,
): string {
  let text: string;
  if (daysRemaining < 0) {
    text = `${gender === "f" ? "vencida" : "vencido"} hace ${daysLabel(-daysRemaining)}`;
  } else if (daysRemaining === 0) {
    text = "vence hoy";
  } else {
    text = `${daysRemaining === 1 ? "falta" : "faltan"} ${daysLabel(daysRemaining)}`;
  }
  return capitalize ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}
