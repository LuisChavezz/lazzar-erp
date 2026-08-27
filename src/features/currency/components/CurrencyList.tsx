"use client";

import { useState, useMemo } from "react";
import { useCurrencies } from "../hooks/useCurrencies";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { getCurrencyColumns } from "./CurrencyColumns";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { PlusIcon } from "@/src/components/Icons";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/src/utils/permissions";
import CurrencyForm from "./CurrencyForm";

export default function CurrencyList() {
  const { data: currencies, isLoading, isError, error } = useCurrencies();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: session } = useSession();

  // `hasPermission` ya cortocircuita para el rol admin, así que sustituye al
  // chequeo manual que vivía aquí. El alta usa su propio código
  // (C-CONFIGURACION), no el de edición.
  const canCreate = hasPermission("C-CONFIGURACION", session?.user);
  const canEdit = hasPermission("E-CONFIGURACION", session?.user);
  const canDelete = hasPermission("D-CONFIGURACION", session?.user);
  const columns = useMemo(
    () => getCurrencyColumns({ canEdit, canDelete }),
    [canEdit, canDelete]
  );

  return (
    <>
      <MainDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        maxWidth="1000px"
        title={
          <DialogHeader
            title="Nueva Moneda"
            subtitle="Información General"
            statusColor="emerald"
          />
        }
      >
        <CurrencyForm onSuccess={() => setIsCreateOpen(false)} />
      </MainDialog>

      <DataTable
        columns={columns}
        data={currencies ?? []}
        title="Monedas"
        searchPlaceholder="Buscar moneda..."
        isLoading={isLoading}
        isError={isError}
        errorTitle="Error al cargar monedas"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        loadingAriaLabel="Cargando monedas"
        actionButton={
          canCreate ? (
            <Button
              variant="primary"
              rounded="xl"
              onClick={() => setIsCreateOpen(true)}
              leftIcon={<PlusIcon className="w-5 h-5" />}
              className="font-medium! shadow-sm! shadow-sky-600/20!"
            >
              Nueva Moneda
            </Button>
          ) : null
        }
      />
    </>
  );
}
