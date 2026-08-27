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
import { hasPermission } from "@/src/utils/permissions";

export default function UserList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: users, isLoading, isError, error } = useUsers();
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol admin, así que sustituye al
  // chequeo manual que vivía aquí. El alta usa su propio código
  // (C-CONFIGURACION), no el de edición.
  const canRead = hasPermission("R-CONFIGURACION", session?.user);
  const canCreate = hasPermission("C-CONFIGURACION", session?.user);
  const canEdit = hasPermission("E-CONFIGURACION", session?.user);
  const canDelete = hasPermission("D-CONFIGURACION", session?.user);
  const columns = useMemo(
    () => getUserColumns({ canRead, canEdit, canDelete }),
    [canRead, canEdit, canDelete]
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
        canCreate ? (
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
