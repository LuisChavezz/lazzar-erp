"use client";

import { FormSelect } from "@/src/components/FormSelect";
import { SegmentedControl } from "@/src/components/SegmentedControl";
import { getMexicoCurrentQuincena } from "@/src/utils/mexicoTime";
import {
  getQuincenaDaysLabel,
  MESES,
  type Quincena,
  type QuincenaHalf,
} from "@/src/utils/quincena";

const OPTION_CLASS = "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white";

/** Años ofrecidos: de 5 atrás a 1 adelante del año en curso, más el elegido si cae fuera. */
const buildYearOptions = (selectedYear: number): number[] => {
  const currentYear = getMexicoCurrentQuincena().year;
  const years = new Set<number>([selectedYear]);
  for (let year = currentYear - 5; year <= currentYear + 1; year += 1) {
    years.add(year);
  }
  return [...years].sort((a, b) => b - a);
};

interface QuincenaPickerProps {
  value: Quincena;
  onChange: (next: Quincena) => void;
  /** Prefijo de `name`/`id` de los controles (hay dos selectores en la misma página). */
  name: string;
  disabled?: boolean;
}

/**
 * Selector de quincena: mes, año y mitad (1–15 / 16–fin). El rango de fechas
 * se deriva de aquí, nunca se teclea. Sin `<input type="month">`: Firefox de
 * escritorio no lo implementa.
 */
export function QuincenaPicker({ value, onChange, name, disabled = false }: QuincenaPickerProps) {
  const halfOptions: { value: `${QuincenaHalf}`; label: string }[] = [
    { value: "1", label: getQuincenaDaysLabel({ ...value, half: 1 }) },
    { value: "2", label: getQuincenaDaysLabel({ ...value, half: 2 }) },
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="grid grid-cols-2 gap-3 sm:w-80">
        <FormSelect
          label="Mes"
          name={`${name}-mes`}
          value={value.month}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, month: Number(event.target.value) })}
        >
          {MESES.map((mes, index) => (
            <option key={mes} value={index + 1} className={OPTION_CLASS}>
              {mes}
            </option>
          ))}
        </FormSelect>
        <FormSelect
          label="Año"
          name={`${name}-anio`}
          value={value.year}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, year: Number(event.target.value) })}
        >
          {buildYearOptions(value.year).map((year) => (
            <option key={year} value={year} className={OPTION_CLASS}>
              {year}
            </option>
          ))}
        </FormSelect>
      </div>
      <div>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block">
          Quincena
        </span>
        <div className={disabled ? "pointer-events-none opacity-60" : undefined}>
          <SegmentedControl
            options={halfOptions}
            value={`${value.half}`}
            onChange={(half) => onChange({ ...value, half: Number(half) as QuincenaHalf })}
            className="h-[46px] items-stretch"
          />
        </div>
      </div>
    </div>
  );
}
