"use client";

import { useEffect, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { searchResurtidoCatalog } from "../services/actions";
import type { ResurtidoCatalogItem } from "../interfaces/pre-order.interface";
import { compareSizes } from "../utils/sizeOrder";
import { draftKey, sanitizeQtyInput, type ResurtidoDraftLine } from "../utils/resurtidoDraft";

const PAGE = 20;

/**
 * Variantes que se pueden fabricar (BOM activo con materiales). Con variantes,
 * el backend deja `tipo_linea` del producto en `null` y lo decide por variante.
 */
const fabricables = (item: ResurtidoCatalogItem) =>
  item.variantes
    .filter((v) => v.tipo_linea === "fabricado")
    .sort((a, b) => compareSizes(a.talla, b.talla) || (a.color ?? "").localeCompare(b.color ?? "", "es"));

/**
 * Buscador de prendas para la pre-orden, como el de la cotización: SOLO el
 * catálogo de producto terminado con BOM (lo que se fabrica). Busca en el
 * servidor por nombre, código, clave Proscai o SKU; al abrir una prenda se
 * capturan piezas por talla/color.
 */
export function ResurtidoProductPicker({
  disabled,
  onAdd,
}: {
  disabled: boolean;
  onAdd: (lines: ResurtidoDraftLine[]) => void;
}) {
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(text.trim());
      setOffset(0);
    }, 300);
    return () => clearTimeout(t);
  }, [text]);

  const enabled = q.length >= 2;
  const { data, isFetching, isInitialError } = useGuardedQuery(
    {
      queryKey: ["resurtido-catalogo", q, "PT", offset],
      queryFn: () => searchResurtidoCatalog({ q, tipo: "PT", limit: PAGE, offset }),
      enabled,
      staleTime: 60_000,
      placeholderData: keepPreviousData,
    },
    { toastId: "resurtido-catalogo-refetch-error" },
  );
  const results = (data?.results ?? []).filter((item) => fabricables(item).length > 0);
  const count = data?.count ?? 0;

  return (
    <div className="space-y-3">
      <label className="relative block">
        <span className="sr-only">Buscar prendas</span>
        <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="9" r="6" />
          <path d="m14 14 4 4" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          name="buscar"
          placeholder="Busca la prenda por nombre, código o SKU…"
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </label>

      {!enabled ? (
        <p className="px-1 text-xs text-slate-500 dark:text-slate-400">
          Solo aparecen prendas con lista de materiales (BOM). Escribe al menos 2 letras.
        </p>
      ) : isInitialError ? (
        <p className="px-1 text-xs text-rose-600 dark:text-rose-400">No se pudo buscar en el catálogo.</p>
      ) : (
        <div
          className={`rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 transition-opacity ${isFetching ? "opacity-60" : ""}`}
          aria-busy={isFetching}
        >
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
              {isFetching ? "Buscando…" : "Ninguna prenda con BOM coincide con la búsqueda."}
            </p>
          ) : (
            <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
              {results.map((item) => {
                const open = openId === item.producto;
                const tallas = fabricables(item).length;
                return (
                  <li key={item.producto} className={open ? "bg-sky-50/40 dark:bg-sky-500/[0.04]" : undefined}>
                    <button
                      type="button"
                      disabled={disabled}
                      aria-expanded={open}
                      onClick={() => setOpenId(open ? null : item.producto)}
                      className="group w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-800 dark:text-white">{item.nombre}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-mono">{item.codigo ?? "—"}</span> · {tallas} {tallas === 1 ? "variante" : "variantes"} con BOM
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-sky-50 dark:bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300 group-hover:bg-sky-100 dark:group-hover:bg-sky-500/20">
                        {open ? "Cerrar" : "Capturar piezas"}
                      </span>
                    </button>
                    {open && (
                      <PickerEntry
                        item={item}
                        disabled={disabled}
                        onAdd={(lines) => {
                          onAdd(lines);
                          setOpenId(null);
                        }}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {count > PAGE && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400">
              <span className="tabular-nums">
                {offset + 1}–{Math.min(offset + PAGE, count)} de {count}
              </span>
              <span className="flex gap-1">
                <button type="button" disabled={offset === 0 || isFetching} onClick={() => setOffset((o) => Math.max(0, o - PAGE))} className="rounded-full px-3 py-1 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 cursor-pointer">
                  Anterior
                </button>
                <button type="button" disabled={offset + PAGE >= count || isFetching} onClick={() => setOffset((o) => o + PAGE)} className="rounded-full px-3 py-1 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 cursor-pointer">
                  Siguiente
                </button>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Cuadrícula de piezas por talla/color de una prenda, solo variantes con BOM. */
function PickerEntry({
  item,
  disabled,
  onAdd,
}: {
  item: ResurtidoCatalogItem;
  disabled: boolean;
  onAdd: (lines: ResurtidoDraftLine[]) => void;
}) {
  const [qty, setQty] = useState<Record<number, string>>({});
  const variantes = fabricables(item);

  const lines: ResurtidoDraftLine[] = variantes
    .filter((v) => Number(qty[v.id] || 0) > 0)
    .map((v) => {
      const ref = { variante: v.id };
      return {
        key: draftKey(ref),
        ref,
        nombre: item.nombre,
        codigo: v.sku,
        detalle: [v.talla, v.color].filter(Boolean).join(" · "),
        unidad: "pz",
        tipo: "fabricado",
        cantidad: qty[v.id],
      };
    });
  const total = lines.reduce((acc, l) => acc + Number(l.cantidad), 0);

  return (
    <div className="px-4 pb-4 pt-1">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {variantes.map((v) => {
          const filled = Number(qty[v.id] || 0) > 0;
          return (
            <label
              key={v.id}
              title={v.sku}
              className={`block rounded-xl border px-2.5 py-2 transition-colors ${
                filled
                  ? "border-sky-300 bg-white dark:border-sky-500/40 dark:bg-zinc-900"
                  : "border-slate-200 bg-white/70 dark:border-white/10 dark:bg-white/[0.02]"
              }`}
            >
              <span className="block truncate text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                {[v.talla, v.color].filter(Boolean).join(" · ") || v.sku}
              </span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                disabled={disabled}
                value={qty[v.id] ?? ""}
                onChange={(e) => setQty((p) => ({ ...p, [v.id]: sanitizeQtyInput(e.target.value, "fabricado") }))}
                className="mt-1 w-full bg-transparent text-right text-base font-semibold tabular-nums text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none"
              />
            </label>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-end gap-3">
        {total > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {lines.length} {lines.length === 1 ? "talla" : "tallas"} · <b className="text-slate-800 dark:text-white">{total}</b> pz
          </span>
        )}
        <button
          type="button"
          disabled={disabled || lines.length === 0}
          onClick={() => onAdd(lines)}
          className="rounded-full bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Agregar a la pre-orden
        </button>
      </div>
    </div>
  );
}
