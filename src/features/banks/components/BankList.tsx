"use client";

import { useCallback, useMemo, useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { getColumns } from "./BankColumns";
import { Banco } from "../interfaces/bank.interface";
import BankForm from "./BankForm";
import { useBanks } from "../hooks/useBanks";

/**
 * Filtro de estatus. `DataTable` filtra en MEMORIA comparando
 * `String(row[configId]) === value`, así que los valores son los del booleano
 * `activo` serializado ("true"/"false"), no etiquetas. El backend sí acepta
 * `?activo=`, pero la tabla no tiene puente hacia parámetros del servidor.
 */
const ACTIVO_FILTER = [
  { value: "true", label: "Activo" },
  { value: "false", label: "Inactivo" },
];

export default function BankList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Banco | null>(null);
  const { banks, hasLoaded, isLoading, isError, error, refetch, isFetching } = useBanks();

  // Un error de refetch transitorio no debe descartar la tabla ya cargada; solo
  // se trata como error "de pantalla completa" si la consulta nunca cargó.
  const showError = isInitialLoadError(isError, hasLoaded);

  const handleEdit = useCallback((banco: Banco) => {
    setSelectedBank(banco);
    setIsDialogOpen(true);
  }, []);

  const handleNew = () => {
    setSelectedBank(null);
    setIsDialogOpen(true);
  };

  const columns = useMemo(() => getColumns(handleEdit), [handleEdit]);

  // `DataTable` se monta SIEMPRE: recibe `isLoading`/`isError` y alterna solo su
  // cuerpo, de modo que el toolbar —búsqueda, filtro, refrescar, columnas y el
  // botón "+ Nuevo Banco"— sigue disponible durante la carga y ante un error.
  // El listado no se gatea con permisos de acción: el backend de finanzas solo
  // exige `IsAuthenticated` y no existen códigos de permiso para bancos.
  return (
    <DataTable
      columns={columns}
      data={banks}
      baseDataCount={banks.length}
      title="Bancos"
      searchPlaceholder="Buscar banco por nombre, código o SWIFT..."
      filterConfig={[{ id: "activo", label: "Estatus", options: ACTIVO_FILTER }]}
      onRefetch={refetch}
      isRefetching={isFetching}
      emptyMessage="No hay bancos registrados."
      isLoading={isLoading}
      isError={showError}
      errorTitle="Error al cargar los bancos"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando bancos"
      getRowId={(row) => String(row.id)}
      actionButton={
        <MainDialog
          title={
            <DialogHeader
              title={selectedBank ? "Editar Banco" : "Alta de Banco"}
              subtitle={selectedBank ? "Edición de registro" : "Registro Nuevo"}
              statusColor="emerald"
            />
          }
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          maxWidth="1000px"
          trigger={
            <Button
              variant="primary"
              rounded="full"
              onClick={handleNew}
              className="hover:scale-105 active:scale-95"
            >
              + Nuevo Banco
            </Button>
          }
        >
          <BankForm onSuccess={() => setIsDialogOpen(false)} bankToEdit={selectedBank} />
        </MainDialog>
      }
    />
  );
}
