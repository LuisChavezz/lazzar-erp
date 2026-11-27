import { getMexicoTodayDate } from "@/src/utils/mexicoTime";

export type MovementDatePreset = "hoy" | "7dias" | "mes" | "mes_anterior";

export const MOVEMENT_DATE_PRESETS: { key: MovementDatePreset; label: string }[] = [
  { key: "hoy", label: "Hoy" },
  { key: "7dias", label: "Últimos 7 días" },
  { key: "mes", label: "Este mes" },
  { key: "mes_anterior", label: "Mes anterior" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/**
 * Rango `[inicio, final]` (`YYYY-MM-DD`) de un atajo de fechas, contado desde
 * el día de hoy en México. Aritmética en UTC sobre la fecha ya resuelta, así
 * que no depende de la zona del navegador.
 */
export function movementDatePresetRange(
  preset: MovementDatePreset,
  now: Date = new Date(),
): [string, string] {
  const hoy = getMexicoTodayDate(now);
  const [y, m, d] = hoy.split("-").map(Number);
  switch (preset) {
    case "hoy":
      return [hoy, hoy];
    case "7dias":
      return [ymd(new Date(Date.UTC(y, m - 1, d - 6))), hoy];
    case "mes":
      return [ymd(new Date(Date.UTC(y, m - 1, 1))), hoy];
    case "mes_anterior":
      return [ymd(new Date(Date.UTC(y, m - 2, 1))), ymd(new Date(Date.UTC(y, m - 1, 0)))];
  }
}

/** Atajo que coincide exactamente con el rango elegido, si alguno. */
export function activeMovementDatePreset(
  inicio: string | null,
  final: string | null,
  now: Date = new Date(),
): MovementDatePreset | null {
  if (!inicio || !final) return null;
  return (
    MOVEMENT_DATE_PRESETS.find(({ key }) => {
      const [i, f] = movementDatePresetRange(key, now);
      return i === inicio && f === final;
    })?.key ?? null
  );
}
