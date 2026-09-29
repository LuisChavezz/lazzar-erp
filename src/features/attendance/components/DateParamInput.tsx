"use client";

import { useState } from "react";
import { FormInput } from "@/src/components/FormInput";
import { isPlausibleDateKey } from "../utils/dateInputs";

interface DateParamInputProps {
  label: string;
  name: string;
  /** Valor vigente (el de la URL). */
  value: string;
  /** Escribe en la URL: un día plausible y aceptado, o "" si se vació. */
  onCommit: (value: string) => void;
  /** Regla extra de la vista (p. ej. "no futuro"). Por defecto, todo día plausible. */
  isAcceptable?: (value: string) => boolean;
  min?: string;
  max?: string;
}

/**
 * Input de fecha cuyo valor vive en la URL, con un BORRADOR local.
 *
 * El borrador existe para que teclear el año dígito a dígito funcione: los
 * valores intermedios ("0002-09-16") se quedan en el input sin llegar a la
 * URL ni disparar una consulta (ver `isPlausibleDateKey`). Si el input fuera
 * controlado directamente por la URL, React repondría el valor anterior a cada
 * tecla y no se podría escribir el año.
 *
 * - Vaciar el campo se confirma AL SALIR ("" → cada vista decide qué
 *   significa), nunca mientras se edita un segmento.
 * - Al salir del campo, cualquier otro valor que no se confirmó se descarta y
 *   vuelve el vigente.
 */
export function DateParamInput({
  label,
  name,
  value,
  onCommit,
  isAcceptable = () => true,
  min,
  max,
}: DateParamInputProps) {
  const [draft, setDraft] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);
  // El valor vigente cambió desde fuera (URL, atrás/adelante): el borrador lo
  // sigue. Ajuste en RENDER, no en un efecto.
  if (value !== syncedValue) {
    setSyncedValue(value);
    setDraft(value);
  }

  return (
    <FormInput
      label={label}
      type="date"
      name={name}
      className="dark:scheme-dark"
      min={min}
      max={max}
      value={draft}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        // "" NO se confirma aquí: Chrome reporta vacío en cuanto se borra UN
        // segmento con Backspace, y confirmar entonces saltaba al valor por
        // defecto a media edición.
        if (isPlausibleDateKey(next) && isAcceptable(next)) {
          onCommit(next);
        }
      }}
      onBlur={() => {
        // Al salir: un campo vacío se confirma (cada vista lo resuelve a su
        // valor por defecto); cualquier otro borrador sin confirmar se
        // descarta y vuelve el vigente.
        // El borrador vuelve siempre al vigente: si la URL cambia por la
        // confirmación, la sincronización de arriba lo lleva al nuevo.
        if (draft === "") onCommit("");
        setDraft(value);
      }}
    />
  );
}
