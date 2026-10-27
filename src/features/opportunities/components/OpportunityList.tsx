"use client";

import { useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { opportunityColumns } from "./OpportunityColumns";
import { OpportunityDeleteDialog } from "./OpportunityDeleteDialog";
import { OpportunityFormDialog } from "./OpportunityFormDialog";
import { OpportunityFunnel } from "./OpportunityFunnel";
import { OpportunityTransferDialog } from "./OpportunityTransferDialog";
import { useOpportunitiesTable } from "../hooks/useOpportunitiesTable";
import { useCompanyAdminStatus } from "@/src/features/users/hooks/useIsCompanyAdmin";
import { OpportunityRowActionsProvider } from "../hooks/useOpportunityRowActions";
import type { EstadoOportunidad } from "../constants/opportunityChoices";
import type { Opportunity } from "../interfaces/opportunity.interface";
import {
  readCurrentOpportunitiesEstado,
  serializeOpportunitiesListState,
} from "../utils/opportunityListQuery";

/**
 * Listado de oportunidades del CRM, en MODO SERVIDOR: filtros, búsqueda, orden
 * y paginación los resuelve el backend y su estado vive en la URL
 * (`useOpportunitiesTable`). Por eso la página que lo monta lo envuelve en
 * `<Suspense>`.
 *
 * El alcance lo decide el backend: un vendedor ve las suyas; un administrador
 * de empresa, las de toda la empresa.
 *
 * Encima de la tabla va el EMBUDO (`OpportunityFunnel`), que resume el mismo
 * conjunto que se está listando: recibe los criterios de la tabla SIN `estado`
 * (para mostrar siempre la distribución completa) y sin orden ni paginación,
 * que no le afectan; `vendedor` viaja salvo para un vendedor, con la MISMA
 * regla con que la tabla le quita ese filtro (ver `useOpportunitiesTable`),
 * para que el total del embudo sea siempre el de la tabla. Sus barras aplican y quitan el filtro por estado con el
 * mismo `setFilter` de la tabla (misma URL, vuelta a la página 1).
 */
export default function OpportunityList() {
  const table = useOpportunitiesTable();

  // Los diálogos reciben el REGISTRO, no su id: la tabla solo tiene la página
  // actual, y editar la etapa puede sacar la fila del filtro activo. Con el
  // registro guardado el diálogo sigue completo hasta que se cierra.
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [opportunityToEdit, setOpportunityToEdit] = useState<Opportunity | null>(null);
  const [opportunityToDelete, setOpportunityToDelete] = useState<Opportunity | null>(null);
  const [opportunityToTransfer, setOpportunityToTransfer] = useState<Opportunity | null>(null);

  const handleNew = () => {
    setOpportunityToEdit(null);
    setIsFormOpen(true);
  };

  const handleEdit = (opportunity: Opportunity) => {
    setOpportunityToEdit(opportunity);
    setIsFormOpen(true);
  };

  const activeEstado = table.state.filters.estado;
  // `vendedor` no viaja con la sesión RESUELTA como no administrador: la tabla
  // le va a quitar ese filtro, y pedir el embudo con él sería una petición de
  // más. Con `admin` o `unknown` la tabla lo conserva, y el embudo también.
  const adminStatus = useCompanyAdminStatus();
  const dropsVendedor = adminStatus === "not-admin";
  const funnelParams = Object.fromEntries(
    Object.entries(table.criteria).filter(
      ([key]) =>
        key !== "estado" && key !== "ordering" && (key !== "vendedor" || !dropsVendedor)
    )
  );
  // Aplicar o quitar se decide con la URL del momento del clic, no con el
  // `activeEstado` de este render: dos clics seguidos en la misma barra deben
  // aplicar y luego quitar.
  const handleToggleEstado = (estado: EstadoOportunidad) =>
    table.setFilter("estado", estado === readCurrentOpportunitiesEstado() ? undefined : estado);

  return (
    <OpportunityRowActionsProvider
      value={{
        listQuery: serializeOpportunitiesListState(table.state),
        onEdit: handleEdit,
        onDelete: setOpportunityToDelete,
        // "Transferir" solo para un administrador de empresa RESUELTO.
        onTransfer: adminStatus === "admin" ? setOpportunityToTransfer : undefined,
      }}
    >
      <div className="mb-4">
        <OpportunityFunnel
          params={funnelParams}
          filter={{ activeEstado, onToggle: handleToggleEstado }}
        />
      </div>

      <DataTable
        columns={opportunityColumns}
        {...table.tableProps}
        // Identidad de la fila por registro, no por posición en la página.
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar por título o contacto..."
        emptyMessage="Aún no hay oportunidades registradas"
        errorTitle="Error al cargar oportunidades"
        loadingAriaLabel="Cargando oportunidades"
        actionButton={
          <OpportunityFormDialog
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            opportunityToEdit={opportunityToEdit}
            trigger={
              <Button
                variant="primary"
                rounded="full"
                onClick={handleNew}
                className="hover:scale-105 active:scale-95"
              >
                + Nueva Oportunidad
              </Button>
            }
          />
        }
      />

      <OpportunityDeleteDialog
        opportunity={opportunityToDelete}
        onClose={() => setOpportunityToDelete(null)}
      />

      {/* Sin `cotizaciones`: el listado no las trae y el aviso es genérico. */}
      <OpportunityTransferDialog
        opportunity={opportunityToTransfer}
        onClose={() => setOpportunityToTransfer(null)}
      />
    </OpportunityRowActionsProvider>
  );
}
