"use client";

// Piezas presentacionales compartidas por diálogos de detalle (rejilla de
// campos + tabla de líneas con encabezado pegajoso + estado vacío en cursiva).
// Originadas en el detalle de CxC (dos secciones: factura y pólizas) y
// adoptadas también por el detalle de traspasos (una sola tabla de líneas) —
// el chrome es el mismo sin importar cuántas tablas tenga un diálogo dado, así
// que se comparte aquí en vez de quedar duplicado por feature.
//
// `LineItemsTable` aporta solo el CHROME (contenedor con scroll, `<table>`,
// `<thead>` pegajoso, separadores del `<tbody>`); cada sección declara sus
// propias columnas como hijos. Se queda así a propósito: un componente de
// tabla genérico dirigido por config sería reinventar `DataTable`, que es para
// tablas de página (paginación, búsqueda, reordenar columnas), no para un
// listado corto e incrustado dentro de un diálogo.

import type React from "react";

/** Campo etiqueta/valor de las rejillas de encabezado del diálogo. */
export const InfoField = ({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={className}>
    <span className="text-slate-400 dark:text-slate-500">{label}</span>
    <div className="font-medium text-slate-700 dark:text-slate-200 mt-0.5">
      {children}
    </div>
  </div>
);

/** Título de sección del diálogo. */
export const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
    {children}
  </h3>
);

/**
 * Tarjeta de sección: el bloque contenedor de las PÁGINAS de detalle (borde
 * redondeado, fondo, `SectionTitle` y un `action` opcional alineado a la
 * derecha). Antes vivía duplicada en cada página de detalle; `action` viene de
 * `PedidoDetailContent`, cuya versión era la más completa. Sin `action` el DOM
 * es idéntico al de las páginas que no lo usan.
 */
export const Section = ({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 md:p-6">
    <div className="flex items-center justify-between gap-3 mb-4">
      <SectionTitle>{title}</SectionTitle>
      {action}
    </div>
    {children}
  </section>
);

/** Rejilla de campos etiqueta/valor reutilizada por las secciones de detalle. */
export const InfoGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 text-xs">
    {children}
  </div>
);

/** Estado vacío de una tabla de líneas (mismo tono en todas las secciones). */
export const EmptyLines = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-slate-400 dark:text-slate-500 italic px-1 py-4 text-center">
    {children}
  </p>
);

/**
 * Chrome de una tabla de líneas incrustada. `head` recibe las `<th>` y
 * `children` las `<tr>` del cuerpo.
 */
export const LineItemsTable = ({
  head,
  children,
}: {
  head: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-100 dark:border-white/10">
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-slate-50 dark:bg-zinc-800/90 backdrop-blur">
        <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
          {head}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
        {children}
      </tbody>
    </table>
  </div>
);

/**
 * Valor de texto opcional del backend. Cubre `null`, `undefined` y la cadena
 * vacía con el mismo guion largo que usa el resto de las tablas del proyecto.
 */
export const textOrDash = (value: string | null | undefined): string =>
  value && value.trim() !== "" ? value : "—";
