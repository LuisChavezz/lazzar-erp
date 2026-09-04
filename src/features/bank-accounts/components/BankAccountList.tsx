"use client";

import { useCallback, useMemo, useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { useBanks } from "@/src/features/banks/hooks/useBanks";
import { getColumns } from "./BankAccountColumns";
import { BankAccountSummaryDialog } from "./BankAccountSummaryDialog";
import { CuentaBancaria } from "../interfaces/bank-account.interface";
import BankAccountForm from "./BankAccountForm";
import { useBankAccounts } from "../hooks/useBankAccounts";

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

export default function BankAccountList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<CuentaBancaria | null>(null);
  // Estado del resumen, EN LA VISTA y no en la celda de acciones: una celda se
  // desmonta al ordenar, filtrar o paginar, y alternar `activo` con el resumen
  // abierto reordena la tabla — el diálogo se cerraría solo a media consulta.
  const [openSummaryId, setOpenSummaryId] = useState<number | null>(null);

  const { bankAccounts, hasLoaded, isLoading, isError, error, refetch, isFetching } =
    useBankAccounts();
  // Mismo hook que alimenta el select del formulario (no un segundo fetcher):
  // aquí solo se usa para poblar las opciones del filtro por banco.
  const { banks } = useBanks();

  // Un error de refetch transitorio no debe descartar la tabla ya cargada; solo
  // se trata como error "de pantalla completa" si la consulta nunca cargó.
  const showError = isInitialLoadError(isError, hasLoaded);

  const handleEdit = useCallback((cuenta: CuentaBancaria) => {
    setSelectedAccount(cuenta);
    setIsDialogOpen(true);
  }, []);

  const handleNew = () => {
    setSelectedAccount(null);
    setIsDialogOpen(true);
  };

  const columns = useMemo(
    () => getColumns(handleEdit, setOpenSummaryId),
    [handleEdit]
  );

  // El filtro por banco compara contra `row.banco` (el id crudo del FK), así que
  // sus valores son ids. Se omite mientras no haya bancos cargados: un filtro
  // sin opciones es un control muerto.
  const filterConfig = useMemo(() => {
    const configs = [{ id: "activo", label: "Estatus", options: ACTIVO_FILTER }];
    if (banks.length > 0) {
      configs.unshift({
        id: "banco",
        label: "Banco",
        options: banks.map((banco) => ({
          value: String(banco.id),
          label: banco.nombre ?? `Banco #${banco.id}`,
        })),
      });
    }
    return configs;
  }, [banks]);

  // La cuenta cuyo resumen está abierto se busca contra el arreglo que esta
  // vista ya tiene: el diálogo no vuelve a suscribirse al listado solo para
  // localizar un renglón.
  const summaryAccount =
    openSummaryId !== null
      ? bankAccounts.find((cuenta) => cuenta.id === openSummaryId) ?? null
      : null;

  // El id NO puede sobrevivir a la desaparición de su renglón. El DELETE del
  // backend es real y alcanzable fuera de esta pantalla, así que la cuenta puede
  // irse del payload con el resumen abierto: sin esto el diálogo se desmontaba
  // pero `openSummaryId` seguía apuntando al id, y cualquier refetch posterior
  // que devolviera la fila volvía a abrir el diálogo solo, encima de lo que el
  // usuario estuviera haciendo. Se ajusta en RENDER (patrón de "estado derivado"
  // de React, re-render inmediato sin pintar) y no en un efecto, que además
  // dispararía `react-hooks/set-state-in-effect`.
  if (openSummaryId !== null && summaryAccount === null) {
    setOpenSummaryId(null);
  }

  // `DataTable` se monta SIEMPRE: recibe `isLoading`/`isError` y alterna solo su
  // cuerpo, de modo que el toolbar —búsqueda, filtros, refrescar, columnas y el
  // botón "+ Nueva Cuenta"— sigue disponible durante la carga y ante un error.
  // El listado no se gatea con permisos de acción: el backend de finanzas solo
  // exige `IsAuthenticated` y no existen códigos de permiso para cuentas.
  return (
    <div className="space-y-6">
      <DataTable
        columns={columns}
        data={bankAccounts}
        baseDataCount={bankAccounts.length}
        title="Cuentas Bancarias"
        searchPlaceholder="Buscar alias, banco, titular o número de cuenta..."
        filterConfig={filterConfig}
        onRefetch={refetch}
        isRefetching={isFetching}
        emptyMessage="No hay cuentas bancarias registradas."
        isLoading={isLoading}
        isError={showError}
        errorTitle="Error al cargar las cuentas bancarias"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        onErrorRetry={refetch}
        loadingAriaLabel="Cargando cuentas bancarias"
        getRowId={(row) => String(row.id)}
        actionButton={
          <MainDialog
            title={
              <DialogHeader
                title={selectedAccount ? "Editar Cuenta Bancaria" : "Alta de Cuenta Bancaria"}
                subtitle={selectedAccount ? "Edición de registro" : "Registro Nuevo"}
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
                + Nueva Cuenta
              </Button>
            }
          >
            <BankAccountForm
              onSuccess={() => setIsDialogOpen(false)}
              accountToEdit={selectedAccount}
            />
          </MainDialog>
        }
      />

      {summaryAccount && (
        <BankAccountSummaryDialog
          account={summaryAccount}
          open={true}
          onOpenChange={(open) => {
            if (!open) setOpenSummaryId(null);
          }}
        />
      )}
    </div>
  );
}
