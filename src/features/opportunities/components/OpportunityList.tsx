"use client";

import { useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { opportunityColumns } from "./OpportunityColumns";
import OpportunityForm from "./OpportunityForm";
import { useDeleteOpportunity } from "../hooks/useDeleteOpportunity";
import { useOpportunitiesTable } from "../hooks/useOpportunitiesTable";
import { OpportunityRowActionsProvider } from "../hooks/useOpportunityRowActions";
import type { Opportunity } from "../interfaces/opportunity.interface";
import { describeOpportunity } from "../utils/describeOpportunity";

/**
 * Listado de oportunidades del CRM, en MODO SERVIDOR: filtros, búsqueda, orden
 * y paginación los resuelve el backend y su estado vive en la URL
 * (`useOpportunitiesTable`). Por eso la página que lo monta lo envuelve en
 * `<Suspense>`.
 *
 * El alcance lo decide el backend: un vendedor ve las suyas; un administrador
 * de empresa, las de toda la empresa.
 */
export default function OpportunityList() {
  const table = useOpportunitiesTable();

  // Los diálogos guardan el REGISTRO, no su id: la tabla solo tiene la página
  // actual, y editar la etapa puede sacar la fila del filtro activo. Con el
  // registro guardado el diálogo sigue completo hasta que se cierra.
  const [isFormOpen, setIsFormOpen] = useState(false);
  // Cada apertura monta un formulario NUEVO (`key`): no depende de que el
  // diálogo anterior haya terminado de desmontarse (su animación de salida),
  // así que "Nueva" nunca hereda lo capturado en la apertura previa.
  const [formSession, setFormSession] = useState(0);
  const [opportunityToEdit, setOpportunityToEdit] = useState<Opportunity | null>(null);
  const [opportunityToDelete, setOpportunityToDelete] = useState<Opportunity | null>(null);

  const { mutate: deleteOpportunity, isPending: isDeleting } = useDeleteOpportunity();

  const handleNew = () => {
    setOpportunityToEdit(null);
    setFormSession((session) => session + 1);
    setIsFormOpen(true);
  };

  const handleEdit = (opportunity: Opportunity) => {
    setOpportunityToEdit(opportunity);
    setFormSession((session) => session + 1);
    setIsFormOpen(true);
  };

  return (
    <OpportunityRowActionsProvider value={{ onEdit: handleEdit, onDelete: setOpportunityToDelete }}>
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
          <MainDialog
            title={
              <DialogHeader
                title={opportunityToEdit ? "Editar Oportunidad" : "Nueva Oportunidad"}
                subtitle={opportunityToEdit ? "Edición de registro" : "Registro Nuevo"}
                statusColor="sky"
              />
            }
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            maxWidth="1000px"
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
          >
            <OpportunityForm
              key={formSession}
              onSuccess={() => setIsFormOpen(false)}
              opportunityToEdit={opportunityToEdit}
            />
          </MainDialog>
        }
      />

      {/*
        Sin optimista: queda abierto y bloqueado (`busy`) hasta que el servidor
        responde y el listado se refresca; entonces se cierra.
      */}
      {opportunityToDelete && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open && !isDeleting) setOpportunityToDelete(null);
          }}
          title="Dar de Baja Oportunidad"
          description={`¿Dar de baja la oportunidad ${describeOpportunity(
            opportunityToDelete
          )}? Dejará de aparecer en el listado y en el seguimiento comercial.`}
          confirmText={isDeleting ? "Dando de baja…" : "Dar de baja"}
          confirmColor="red"
          closeOnConfirm={false}
          busy={isDeleting}
          onConfirm={() =>
            deleteOpportunity(opportunityToDelete.id, {
              onSettled: () => setOpportunityToDelete(null),
            })
          }
        />
      )}
    </OpportunityRowActionsProvider>
  );
}
