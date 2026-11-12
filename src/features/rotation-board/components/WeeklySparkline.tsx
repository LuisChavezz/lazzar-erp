import { formatShortCalendarDate } from "@/src/utils/formatDate";
import { formatPieces, weeklySeriesRanges } from "../utils/rotationBoardFormat";

interface WeeklySparklineProps {
  /** `serie_semanal`: piezas por semana, de la más antigua a la actual. */
  series: number[];
  /** `parametros.hasta`: fin de la última ventana de 7 días. */
  hasta: string | undefined;
  className?: string;
}

const WIDTH = 96;
const HEIGHT = 24;
const PAD = 2;

/**
 * Venta semanal en miniatura: un `<polyline>` en SVG inline, sin librería, que
 * hereda el color del texto (`currentColor`). Cada punto lleva su `<title>`
 * con el rango de días y las piezas: las semanas son ventanas MÓVILES de 7
 * días que terminan en `hasta`, no semanas de calendario.
 *
 * Accesibilidad: el SVG es una imagen con nombre (total y semana más alta);
 * el detalle por punto queda para el puntero.
 */
export function WeeklySparkline({ series, hasta, className = "" }: WeeklySparklineProps) {
  if (series.length === 0) return <span className="text-slate-400">—</span>;

  const ranges = hasta ? weeklySeriesRanges(hasta, series.length) : [];
  const max = Math.max(...series, 0);
  const total = series.reduce((sum, value) => sum + value, 0);
  const step = series.length > 1 ? (WIDTH - PAD * 2) / (series.length - 1) : 0;
  const x = (index: number) => (series.length > 1 ? PAD + index * step : WIDTH / 2);
  const y = (value: number) =>
    max > 0 ? HEIGHT - PAD - (value / max) * (HEIGHT - PAD * 2) : HEIGHT - PAD;
  const points = series.map((value, index) => `${x(index)},${y(value)}`).join(" ");

  const rangeLabel = (index: number) => {
    const range = ranges[index];
    return range
      ? `${formatShortCalendarDate(range.from)} – ${formatShortCalendarDate(range.to)}`
      : `Semana ${index + 1}`;
  };

  return (
    <svg
      role="img"
      aria-label={`Venta semanal: ${formatPieces(total)} piezas en ${series.length} semanas, máximo ${formatPieces(max)} en una semana`}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH}
      height={HEIGHT}
      className={`overflow-visible ${className}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {series.map((value, index) => (
        <circle
          key={index}
          cx={x(index)}
          cy={y(value)}
          r={value > 0 ? 1.75 : 1}
          fill="currentColor"
          opacity={value > 0 ? 1 : 0.35}
        >
          <title>{`${rangeLabel(index)}: ${formatPieces(value)} pzas`}</title>
        </circle>
      ))}
    </svg>
  );
}
