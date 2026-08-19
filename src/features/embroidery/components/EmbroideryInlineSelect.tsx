"use client";

import type { ReactNode } from "react";
import { DropdownMenu } from "@radix-ui/themes";
import { ChevronDownIcon, RefreshIcon } from "@/src/components/Icons";

export interface EmbroideryInlineSelectOption {
  value: string;
  label: string;
  /** Clase del punto de color, para opciones que se pintan como badge. */
  dot?: string;
}

interface EmbroideryInlineSelectProps {
  options: EmbroideryInlineSelectOption[];
  onSelect: (value: string) => void;
  /** Contenido del disparador (badge o texto); el chevron lo pone este componente. */
  children: ReactNode;
  ariaLabel: string;
  /** Clases del disparador — es lo que distingue un badge de un texto plano. */
  triggerClassName?: string;
  /** Mutación en vuelo: inhabilita el disparador y gira el icono. */
  isPending?: boolean;
  /** Texto del ítem inerte cuando no hay opciones (catálogo cargando o vacío). */
  emptyLabel?: string;
}

/**
 * Disparador + menú para editar UN campo de la ficha en línea.
 *
 * Extrae el andamiaje de Radix que comparten los selectores inline del módulo
 * (prioridad, operador) para no triplicarlo. `EmbroideryStatusSelect` mantiene
 * el suyo propio: su disparador degrada a badge de solo lectura según las
 * transiciones disponibles, una regla que no aplica a los demás campos.
 *
 * El aspecto lo decide el consumidor vía `triggerClassName` + `children`; aquí
 * solo viven el chevron, el estado pendiente y la lista.
 */
export function EmbroideryInlineSelect({
  options,
  onSelect,
  children,
  ariaLabel,
  triggerClassName = "",
  isPending = false,
  emptyLabel = "Sin opciones disponibles",
}: EmbroideryInlineSelectProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <button
          type="button"
          disabled={isPending}
          aria-label={ariaLabel}
          className={`inline-flex items-center gap-1.5 cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-wait ${triggerClassName}`}
        >
          {children}
          {isPending ? (
            <RefreshIcon className="w-3 h-3 shrink-0 animate-spin" aria-hidden="true" />
          ) : (
            <ChevronDownIcon className="w-3 h-3 shrink-0" aria-hidden="true" />
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align="start"
        className="bg-white! dark:bg-zinc-900! min-w-44 max-h-64 overflow-y-auto rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 p-1"
      >
        {options.length === 0 ? (
          <DropdownMenu.Item
            disabled
            className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 dark:text-slate-500 rounded-lg outline-none data-disabled:opacity-100"
          >
            {emptyLabel}
          </DropdownMenu.Item>
        ) : (
          options.map((option) => (
            <DropdownMenu.Item
              key={option.value}
              onSelect={() => onSelect(option.value)}
              className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer! outline-none data-highlighted:bg-slate-50 dark:data-highlighted:bg-white/5 data-highlighted:text-sky-600 dark:data-highlighted:text-sky-400 transition-colors ease-in-out"
            >
              {option.dot && (
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${option.dot}`}
                  aria-hidden="true"
                />
              )}
              <span>{option.label}</span>
            </DropdownMenu.Item>
          ))
        )}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
