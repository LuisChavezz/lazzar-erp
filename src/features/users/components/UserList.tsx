"use client";

import { useState, useMemo } from "react";
import { useUsers } from "../hooks/useUsers";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { Button } from "@/src/components/Button";
import { getUserColumns } from "./UserColumns";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import UserForm from "./UserForm";
import { useSession } from "next-auth/react";

export default function UserList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: users, isLoading, isError, error } = useUsers();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const permissions = session?.user?.permissions ?? [];
  const canReadConfig = isAdmin || permissions.includes("R-CONFIGURACION");
  const canEditConfig = isAdmin || permissions.includes("E-CONFIGURACION");
  const canDeleteConfig = isAdmin || permissions.includes("D-CONFIGURACION");
  const columns = useMemo(
    () => getUserColumns({ canRead: canReadConfig, canEdit: canEditConfig, canDelete: canDeleteConfig }),
    [canReadConfig, canEditConfig, canDeleteConfig]
  );

  return (
    <DataTable
      columns={columns}
      data={users ?? []}
      title="Usuarios"
      searchPlaceholder="Buscar usuario..."
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar usuarios"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando usuarios"
      actionButton={
        canEditConfig ? (
          <MainDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            maxWidth="1000px"
            trigger={
              <Button
                variant="primary"
                rounded="full"
                className="hover:scale-105 active:scale-95"
              >
                + Nuevo Usuario
              </Button>
            }
            title={
              <DialogHeader
                title="Registrar Usuario"
                subtitle="Nuevo Registro"
                statusColor="emerald"
              />
            }
          >
            <UserForm onSuccess={() => setIsDialogOpen(false)} />
          </MainDialog>
        ) : null
      }
    />
  );
}
