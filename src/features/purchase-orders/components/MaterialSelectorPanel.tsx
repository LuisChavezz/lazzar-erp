"use client";

import { useState, useMemo } from "react";
import {
  MOCK_RAW_MATERIALS,
  CATEGORIAS_MATERIALES,
  type MateriaPrima,
  type CategoriaMaterial,
} from "../mocks/raw-materials.mock";
import { SearchIcon, CheckIcon } from "@/src/components/Icons";

// Color del indicador de punto por categoría
const CATEGORIA_DOT: Record<string, string> = {
  telas: "bg-sky-400",
  hilos: "bg-amber-400",
  botones_cierres: "bg-violet-400",
  accesorios: "bg-emerald-400",
};

// Etiquetas de color para los filtros activos
const CATEGORIA_ACTIVE: Record<string, string> = {
  telas: "bg-sky-600 text-white",
  hilos: "bg-amber-500 text-white",
  botones_cierres: "bg-violet-600 text-white",
  accesorios: "bg-emerald-600 text-white",
};

export interface LineaMaterial {
  material: MateriaPrima;
  cantidad: number;
}

export interface MaterialSelectorPanelProps {
  /** Callback que se dispara cada vez que cambia la selección o las cantidades */
  onLinesChange?: (lineas: LineaMaterial[], total: number) => void;
}

// Formateador de moneda MXN reutilizable
const MXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
});

export function MaterialSelectorPanel({ onLinesChange }: MaterialSelectorPanelProps) {
  const [busqueda, setBusqueda] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState<CategoriaMaterial | "todas">("todas");
  // Map de id → línea seleccionada con cantidad
  const [seleccionados, setSeleccionados] = useState<Map<number, LineaMaterial>>(new Map());

  // Materiales filtrados por búsqueda y categoría activa
  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return MOCK_RAW_MATERIALS.filter((m) => {
      const matchBusqueda =
        q === "" ||
        m.nombre.toLowerCase().includes(q) ||
        m.clave.toLowerCase().includes(q);
      const matchCategoria = categoriaActiva === "todas" || m.categoria === categoriaActiva;
      return matchBusqueda && matchCategoria;
    });
  }, [busqueda, categoriaActiva]);

  // Total calculado a partir de las líneas seleccionadas
  const total = useMemo(
    () =>
      [...seleccionados.values()].reduce(
        (s, l) => s + l.cantidad * l.material.precio_unitario,
        0,
      ),
    [seleccionados],
  );

  // Notifica al padre con las líneas y el total actualizados
  const notificar = (map: Map<number, LineaMaterial>) => {
    const lineas = [...map.values()];
    const t = lineas.reduce((s, l) => s + l.cantidad * l.material.precio_unitario, 0);
    onLinesChange?.(lineas, t);
  };

  const toggleMaterial = (material: MateriaPrima) => {
    const next = new Map(seleccionados);
    if (next.has(material.id)) {
      next.delete(material.id);
    } else {
      next.set(material.id, { material, cantidad: 1 });
    }
    setSeleccionados(next);
    notificar(next);
  };

  const ajustarCantidad = (id: number, delta: number, absoluta?: number) => {
    const next = new Map(seleccionados);
    const linea = next.get(id);
    if (!linea) return;
    const nueva =
      absoluta !== undefined
        ? Math.max(1, isNaN(absoluta) ? 1 : absoluta)
        : Math.max(1, linea.cantidad + delta);
    next.set(id, { ...linea, cantidad: nueva });
    setSeleccionados(next);
    notificar(next);
  };

  const countSeleccionados = seleccionados.size;

  return (
    <div className="space-y-2.5">
      {/* Barra de búsqueda */}
      <div className="relative">
        <SearchIcon
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o clave..."
          aria-label="Buscar material"
          className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 dark:text-white placeholder-slate-400 transition-all"
        />
      </div>

      {/* Filtros de categoría */}
      <div className="flex gap-1 flex-wrap" role="group" aria-label="Filtrar por categoría">
        {CATEGORIAS_MATERIALES.map((cat) => {
          const esActivo = categoriaActiva === cat.key;
          const activeClass =
            cat.key === "todas"
              ? "bg-sky-600 text-white"
              : (CATEGORIA_ACTIVE[cat.key] ?? "bg-sky-600 text-white");

          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setCategoriaActiva(cat.key)}
              aria-pressed={esActivo}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                esActivo
                  ? activeClass
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              {cat.key !== "todas" && (
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${CATEGORIA_DOT[cat.key]}`}
                  aria-hidden="true"
                />
              )}
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Lista scrollable de materiales */}
      <div
        className="max-h-56 overflow-y-auto border border-slate-200 dark:border-white/10 rounded-xl divide-y divide-slate-100 dark:divide-white/5 overscroll-contain"
        role="list"
        aria-label="Catálogo de materias primas"
      >
        {filtrados.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400 select-none">
            Sin resultados para la búsqueda
          </div>
        ) : (
          filtrados.map((material) => {
            const sel = seleccionados.get(material.id);
            const estaSeleccionado = !!sel;

            return (
              <div
                key={material.id}
                role="listitem"
                className={`flex items-center gap-2.5 px-3 py-2.5 transition-colors ${
                  estaSeleccionado
                    ? "bg-sky-50 dark:bg-sky-500/10"
                    : "hover:bg-slate-50 dark:hover:bg-white/5"
                }`}
              >
                {/* Checkbox de selección */}
                <button
                  type="button"
                  onClick={() => toggleMaterial(material)}
                  aria-label={
                    estaSeleccionado ? `Quitar ${material.nombre}` : `Agregar ${material.nombre}`
                  }
                  className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${
                    estaSeleccionado
                      ? "bg-sky-600 border-sky-600"
                      : "border-slate-300 dark:border-slate-600 hover:border-sky-400"
                  }`}
                >
                  {estaSeleccionado && (
                    <CheckIcon className="w-3 h-3 text-white" strokeWidth={3} />
                  )}
                </button>

                {/* Punto indicador de categoría */}
                <span
                  className={`shrink-0 w-2 h-2 rounded-full ${CATEGORIA_DOT[material.categoria]}`}
                  aria-hidden="true"
                />

                {/* Nombre y clave — clickear para alternar selección */}
                <button
                  type="button"
                  onClick={() => toggleMaterial(material)}
                  className="flex-1 text-left min-w-0 cursor-pointer"
                >
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate leading-tight">
                    {material.nombre}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {material.clave} · {material.unidad}
                  </p>
                </button>

                {/* Controles de cantidad (seleccionado) o precio unitario (no seleccionado) */}
                {estaSeleccionado && sel ? (
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Stepper +/- con input numérico */}
                    <div className="flex items-center border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => ajustarCantidad(material.id, -1)}
                        aria-label="Reducir cantidad"
                        className="w-7 h-7 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer select-none text-sm leading-none"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={sel.cantidad}
                        onChange={(e) =>
                          ajustarCantidad(material.id, 0, parseInt(e.target.value, 10))
                        }
                        aria-label={`Cantidad de ${material.nombre}`}
                        className="w-12 text-center text-sm font-semibold bg-transparent dark:text-white outline-none py-1 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => ajustarCantidad(material.id, 1)}
                        aria-label="Aumentar cantidad"
                        className="w-7 h-7 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer select-none text-sm leading-none"
                      >
                        +
                      </button>
                    </div>

                    {/* Subtotal de la línea */}
                    <span className="text-xs font-bold text-sky-600 dark:text-sky-400 tabular-nums w-22 text-right whitespace-nowrap">
                      {MXN.format(sel.cantidad * material.precio_unitario)}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums shrink-0 whitespace-nowrap">
                    {MXN.format(material.precio_unitario)}/{material.unidad}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Resumen: cantidad de materiales seleccionados + total */}
      <div
        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all ${
          countSeleccionados > 0
            ? "bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20"
            : "bg-slate-50 dark:bg-white/2 border-slate-200 dark:border-white/5"
        }`}
      >
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {countSeleccionados === 0
            ? "Sin materiales seleccionados"
            : `${countSeleccionados} material${countSeleccionados !== 1 ? "es" : ""} seleccionado${countSeleccionados !== 1 ? "s" : ""}`}
        </span>
        <span
          className={`text-sm font-bold tabular-nums transition-colors ${
            countSeleccionados > 0 ? "text-sky-700 dark:text-sky-300" : "text-slate-400"
          }`}
        >
          {MXN.format(total)}
        </span>
      </div>
    </div>
  );
}
