"use client";

import { useEffect, useRef, useState } from "react";
import { FormInput } from "./FormInput";
import { isCompleteDateEntry } from "../utils/formatDate";

/** Espera desde el último cambio antes de publicar una fecha completa. */
const COMMIT_DEBOUNCE_MS = 600;

interface UrlDateInputProps {
  label: string;
  name: string;
  /** Valor crudo de la URL ("" si no hay). */
  value: string;
  /** Publica el nuevo valor (escribirlo en la URL). Solo recibe "" o una fecha completa. */
  onCommit: (value: string) => void;
}

/**
 * `<input type="date">` cuyo valor vive en la URL, con BORRADOR local.
 *
 * No puede estar controlado directo por la URL: la escritura es asíncrona, así
 * que tras cada tecla React repintaba el valor VIEJO y eso reiniciaba la
 * edición por segmentos del control (el año no se podía teclear).
 *
 * Cuándo se publica (`onCommit`):
 * - Una fecha completa (`isCompleteDateEntry`) o el vacío, ~600 ms después del
 *   último cambio. El debounce evita publicar cada dígito al corregir el día o
 *   el mes de una fecha ya aplicada ("2026-05-01" → "2026-05-15" son dos fechas
 *   completas), y sigue aplicando lo elegido en el calendario del navegador,
 *   que deja el foco en el input.
 * - Al salir del campo o con Enter, de inmediato (cancela el debounce).
 * - Al salir con un borrador INCOMPLETO (año a medias, o segmentos sin llenar,
 *   que el control reporta como `""` con `validity.badInput`), el campo vuelve
 *   al valor aplicado en la URL: nunca se ve un periodo distinto del filtrado.
 *
 * Si la URL cambia por otra vía (atrás, un enlace, código que fija el periodo),
 * el borrador se alinea con ella. Al desmontar se cancela cualquier publicación
 * pendiente, para no escribir en la URL de otra página.
 *
 * Lo usan los filtros de periodo que viven en la URL: historial de órdenes de
 * compra del proveedor y Conciliaciones.
 */
export function UrlDateInput({ label, name, value, onCommit }: UrlDateInputProps) {
  const [draft, setDraft] = useState(value);
  const [seenValue, setSeenValue] = useState(value);
  const [committed, setCommitted] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ajuste de estado al cambiar la prop (patrón de React, sin efecto): solo un
  // cambio que NO vino de este control pisa el borrador.
  if (value !== seenValue) {
    setSeenValue(value);
    if (value !== committed) {
      setDraft(value);
      setCommitted(value);
    }
  }

  // Desmontar con una publicación pendiente no debe escribir en otra página.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const cancelPending = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const publish = (next: string) => {
    cancelPending();
    if (next === committed) return;
    setCommitted(next);
    onCommit(next);
  };

  /** "" o fecha completa, y el control no tiene segmentos a medias. */
  const isPublishable = (next: string, input: HTMLInputElement) =>
    (next === "" && !input.validity.badInput) || isCompleteDateEntry(next);

  const flush = (input: HTMLInputElement, revertIfIncomplete: boolean) => {
    if (isPublishable(input.value, input)) {
      publish(input.value);
      return;
    }
    if (!revertIfIncomplete) return;
    // Borrador incompleto: vuelve al valor aplicado. Se escribe también en el
    // DOM porque un control con segmentos a medias reporta `""` y, si el valor
    // aplicado también es `""`, React no vería diferencia que repintar.
    cancelPending();
    setDraft(value);
    input.value = value;
  };

  return (
    <FormInput
      label={label}
      type="date"
      name={name}
      value={draft}
      onChange={(event) => {
        const input = event.target;
        setDraft(input.value);
        cancelPending();
        if (isPublishable(input.value, input)) {
          const next = input.value;
          timerRef.current = setTimeout(() => publish(next), COMMIT_DEBOUNCE_MS);
        }
      }}
      onBlur={(event) => flush(event.currentTarget, true)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          flush(event.currentTarget, false);
        }
      }}
    />
  );
}
