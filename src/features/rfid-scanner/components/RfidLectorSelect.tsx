"use client";

import { useSession } from "next-auth/react";
import type { RfidLectorConfig } from "../interfaces/rfid-scanner.interface";

const ESTADO_TXT: Record<string, string> = {
  LEYENDO: "conectado",
  CONECTADO_SIN_TAGS: "conectado",
  SIN_CONEXION: "sin conexión",
};

const DOT: Record<string, string> = {
  LEYENDO: "bg-emerald-500",
  CONECTADO_SIN_TAGS: "bg-sky-500",
  SIN_CONEXION: "bg-rose-500",
};

interface Props {
  lectores: RfidLectorConfig[];
  value: number | null;
  onChange: (id: number | null) => void;
  disabled?: boolean;
  /** Ofrece "Todos los lectores" (`null`): solo para el monitor, que es informativo. */
  allowAll?: boolean;
}

/**
 * Selector compacto del lector RFID con el que se escanea. Debajo avisa si
 * otro usuario lo está usando (no bloquea: dos personas pueden mirar el mismo
 * cajón). Sin lectores en el catálogo no se pinta: se lee de todos, como antes.
 */
export function RfidLectorSelect({ lectores, value, onChange, disabled, allowAll }: Props) {
  const { data: session } = useSession();
  if (lectores.length === 0) return null;
  const actual = lectores.find((l) => l.id === value) ?? null;
  const yo = session?.user?.name ?? session?.user?.email ?? null;
  const enUso = actual?.en_uso_por && actual.en_uso_por.usuario !== yo ? actual.en_uso_por : null;

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <label className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 pl-2.5 text-xs text-slate-500 dark:text-slate-400 focus-within:ring-2 focus-within:ring-sky-500/40">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${actual?.estado ? DOT[actual.estado] : "bg-slate-300 dark:bg-slate-600"}`}
          aria-hidden="true"
        />
        Lector
        <select
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          className="h-full cursor-pointer rounded-r-lg bg-transparent pr-2 text-xs font-semibold text-slate-700 outline-none disabled:opacity-60 dark:text-slate-200 [&>option]:bg-white [&>option]:text-slate-700 dark:[&>option]:bg-slate-900 dark:[&>option]:text-slate-200"
        >
          {(allowAll || value === null) && (
            <option value="">{allowAll ? "Todos los lectores" : "Seleccionar lector"}</option>
          )}
          {lectores.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nombre}
              {l.estado ? ` · ${ESTADO_TXT[l.estado] ?? l.estado}` : ""}
              {l.en_uso_por && l.en_uso_por.usuario !== yo ? " · en uso" : ""}
            </option>
          ))}
        </select>
      </label>
      {enUso && (
        <span className="truncate text-[11px] text-amber-600 dark:text-amber-400">
          En uso por {enUso.usuario}
          {enUso.pantalla ? ` en ${enUso.pantalla}` : ""}
          {enUso.documento ? ` (${enUso.documento})` : ""}
        </span>
      )}
    </div>
  );
}
