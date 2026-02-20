"use client";

import { useState, useMemo } from "react";
import { useUsers } from "../hooks/useUsers";
import { DataTable } from "@/src/components/DataTable";
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
  const canReadConfig = isAdmin || permissions.includes("R-CONF");
  const canEditConfig = isAdmin || permissions.includes("E-CONF");
  const canDeleteConfig = isAdmin || permissions.includes("D-CONF");
  const columns = useMemo(
    () => getUserColumns({ canRead: canReadConfig, canEdit: canEditConfig, canDelete: canDeleteConfig }),
    [canReadConfig, canEditConfig, canDeleteConfig]
  );

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        <span className="ml-3 text-slate-500">Cargando usuarios...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-600">
        <p className="font-medium">Error al cargar usuarios</p>
        <p className="text-sm opacity-80">{(error as Error).message}</p>
      </div>
    );
  }

  if (!users) return null;

  return (
    <DataTable
      columns={columns}
      data={users}
      title="Usuarios"
      searchPlaceholder="Buscar usuario..."
      actionButton={
        canEditConfig ? (
          <MainDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            maxWidth="1000px"
            trigger={
              <button
                className="px-4 py-2 cursor-pointer bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-full shadow-lg shadow-sky-500/30 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
              >
                + Nuevo Usuario
              </button>
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
