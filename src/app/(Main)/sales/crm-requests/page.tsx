"use client";

import { useState } from "react";
import Link from "next/link";
import { DataTable, DataTableVisibleColumn } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { quoteColumns } from "@/src/features/quotes/components/QuoteColumns";
import { createQuoteFilterConfig } from "@/src/features/quotes/components/QuoteFilter";
import type { Quote } from "@/src/features/quotes/interfaces/quote.interface";

/**
 * Solicitudes (CRM) — andamiaje de la sección.
 *
 * Reutiliza TAL CUAL las columnas y el filtro de Cotizaciones
 * (`quoteColumns` / `createQuoteFilterConfig`) para que la vista sea
 * estructuralmente idéntica a `/sales/quotes`. No hay KPIs ni fuente de datos:
 * `data` es un arreglo vacío a propósito, la tabla se monta con su toolbar
 * completa (búsqueda, filtros, columnas, refresh) y cuerpo vacío.
 *
 * Pendiente: modelar la solicitud real (alta de producto/muestra y cotización
 * de pedido especial) y conectar su endpoint; entonces estas columnas dejarán de
 * ser las de cotización.
 *
 * Es un Client Component porque `quoteColumns` lleva funciones de render (`cell`)
 * que no cruzan el límite RSC; por eso esta página no exporta `metadata`.
 */

const SOLICITUDES: Quote[] = [];

const solicitudesFilterConfig = createQuoteFilterConfig(SOLICITUDES);

export default function CrmRequestsPage() {
  const [, setVisibleRows] = useState<Quote[]>([]);
  const [, setVisibleColumns] = useState<DataTableVisibleColumn<Quote>[]>([]);

  return (
    <main className="w-full space-y-6 md:space-y-8" aria-label="Gestión de Solicitudes">
      {/* Header */}
      <header>
        <h1 className="sr-only">Solicitudes</h1>
        <p className="text-slate-600 dark:text-slate-300 mt-1">
          Gestiona y monitorea todas las solicitudes.
        </p>
      </header>

      {/* Listado */}
      <section aria-labelledby="crm-requests-list-heading" className="space-y-4">
        <h2 id="crm-requests-list-heading" className="sr-only">Solicitudes</h2>
        <div className="mt-12 min-h-165">
          <DataTable
            columns={quoteColumns}
            data={SOLICITUDES}
            baseDataCount={SOLICITUDES.length}
            searchPlaceholder="Buscar solicitud..."
            onVisibleRowsChange={setVisibleRows}
            onVisibleColumnsChange={setVisibleColumns}
            filterConfig={solicitudesFilterConfig}
            actionButton={
              // Sin gate de permiso propio: no existe un código `C-CRM-SOLICITUDES`
              // en el catálogo, y la ruta ya exige R-CRM (regla de módulo "/sales").
              <div className="flex items-center gap-2 shrink-0">
                <Button asChild variant="primary" rounded="xl">
                  <Link
                    href="/sales/crm-requests/new"
                    aria-label="Crear nueva solicitud"
                  >
                    + Nueva solicitud
                  </Link>
                </Button>
              </div>
            }
          />
        </div>
      </section>
    </main>
  );
}
