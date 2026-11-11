"use client";

import { useEffect, useRef, useState } from "react";
import { DateParamInput } from "@/src/components/DateParamInput";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { ItemPickerButton } from "@/src/components/ItemPickerButton";
import { MainDialog } from "@/src/components/MainDialog";
import { SingleSelectPickerDialogContent } from "@/src/components/SingleSelectPickerDialogContent";
import type { Branch } from "@/src/features/branches/interfaces/branch.interface";
import type { UserCatalogItem } from "@/src/features/users/interfaces/user.interface";
import {
  ACCION_BITACORA_LABELS,
  ACCIONES_BITACORA,
  TIPO_DOCUMENTO_LABELS,
  TIPOS_DOCUMENTO,
  isAccionBitacora,
  isTipoDocumento,
} from "../constants/documentAuditValues";
import type {
  DocumentAuditFilterKey,
  DocumentAuditFilterValues,
} from "../constants/documentAuditTable";
import {
  MAX_AUDIT_FOLIO_LENGTH,
  normalizeAuditFolio,
} from "../schemas/documentAuditFilters.schema";

/** Pausa antes de consultar por folio: es "contiene" contra el servidor. */
const FOLIO_DEBOUNCE_MS = 400;

const OPTION_CLS = "text-slate-900 dark:text-white bg-white dark:bg-zinc-900";

interface DocumentAuditFiltersProps {
  filters: DocumentAuditFilterValues;
  setFilter: <K extends DocumentAuditFilterKey>(
    key: K,
    value: DocumentAuditFilterValues[K] | undefined,
  ) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  users: UserCatalogItem[];
  isUsersLoading: boolean;
  isUsersError: boolean;
  branches: Branch[];
  isBranchesLoading: boolean;
}

/**
 * Filtros de la bitácora. Todos son del SERVIDOR: cada cambio reescribe la URL
 * (`useDocumentAuditFilters`) y la lista vuelve a pedir su primera página. Los
 * selectores solo ofrecen valores que el endpoint sabe responder (tipos y
 * acciones de su enum, ids del catálogo), y las fechas solo se confirman con
 * un día completo que no invierta el rango.
 *
 * El folio guarda un BORRADOR local que se confirma tras una pausa (o con
 * Enter) y sigue a la URL cuando esta cambia por fuera (p. ej. "Limpiar
 * filtros" desde el error de la tabla).
 */
export function DocumentAuditFilters({
  filters,
  setFilter,
  hasActiveFilters,
  onClearFilters,
  users,
  isUsersLoading,
  isUsersError,
  branches,
  isBranchesLoading,
}: DocumentAuditFiltersProps) {
  const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);
  const [folioDraft, setFolioDraft] = useState(filters.folio ?? "");
  // ¿Hay un folio tecleado sin confirmar? Mientras lo haya, la URL no pisa el
  // borrador.
  const [isFolioPending, setIsFolioPending] = useState(false);
  // Último folio de la URL visto: si cambia por fuera (limpiar filtros, atrás o
  // adelante del navegador), el borrador lo sigue. `useSearchParams` refleja la
  // escritura de `replaceState` un render después, así que inicializar desde la
  // URL al limpiar no basta.
  const [syncedFolio, setSyncedFolio] = useState(filters.folio ?? "");
  // Solo se pisa el borrador si DICE otra cosa que la URL: uno que solo difiere
  // en espacios de los extremos ("PED " frente a "PED") es el que el usuario
  // sigue escribiendo, y recortarlo le borraría el espacio recién tecleado.
  if ((filters.folio ?? "") !== syncedFolio) {
    setSyncedFolio(filters.folio ?? "");
    if (!isFolioPending && (normalizeAuditFolio(folioDraft) ?? "") !== (filters.folio ?? "")) {
      setFolioDraft(filters.folio ?? "");
    }
  }
  const folioTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (folioTimer.current) clearTimeout(folioTimer.current);
    },
    [],
  );

  const commitFolio = (value: string) => {
    if (folioTimer.current) clearTimeout(folioTimer.current);
    folioTimer.current = null;
    setIsFolioPending(false);
    // Se recorta lo que va a la URL y al backend, nunca el borrador.
    setFilter("folio", normalizeAuditFolio(value) ?? undefined);
  };

  const handleFolioChange = (value: string) => {
    setFolioDraft(value);
    setIsFolioPending(true);
    if (folioTimer.current) clearTimeout(folioTimer.current);
    folioTimer.current = setTimeout(() => commitFolio(value), FOLIO_DEBOUNCE_MS);
  };

  const selectedUser =
    filters.usuario !== undefined ? users.find((user) => user.id === filters.usuario) : undefined;
  // Un id de la URL que el catálogo no trae (usuario desactivado) sigue
  // filtrando: se nombra por su id en vez de ocultar el filtro activo.
  const selectedUserLabel =
    filters.usuario === undefined
      ? null
      : (selectedUser?.nombre_completo ?? `Usuario #${filters.usuario}`);

  const handleClear = () => {
    if (folioTimer.current) clearTimeout(folioTimer.current);
    folioTimer.current = null;
    setIsFolioPending(false);
    setFolioDraft("");
    onClearFilters();
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FormSelect
          label="Tipo de documento"
          value={filters.tipo ?? ""}
          onChange={(event) =>
            setFilter("tipo", isTipoDocumento(event.target.value) ? event.target.value : undefined)
          }
        >
          <option value="" className={OPTION_CLS}>
            Todos los tipos
          </option>
          {TIPOS_DOCUMENTO.map((tipo) => (
            <option key={tipo} value={tipo} className={OPTION_CLS}>
              {TIPO_DOCUMENTO_LABELS[tipo]}
            </option>
          ))}
        </FormSelect>

        <FormSelect
          label="Acción"
          value={filters.accion ?? ""}
          onChange={(event) =>
            setFilter(
              "accion",
              isAccionBitacora(event.target.value) ? event.target.value : undefined,
            )
          }
        >
          <option value="" className={OPTION_CLS}>
            Todas las acciones
          </option>
          {ACCIONES_BITACORA.map((accion) => (
            <option key={accion} value={accion} className={OPTION_CLS}>
              {ACCION_BITACORA_LABELS[accion]}
            </option>
          ))}
        </FormSelect>

        <div>
          <ItemPickerButton
            label="Usuario"
            placeholder="Todos los usuarios"
            selectedLabel={selectedUserLabel}
            onClick={() => setIsUserPickerOpen(true)}
          />
          {filters.usuario !== undefined && (
            <button
              type="button"
              onClick={() => setFilter("usuario", undefined)}
              className="ml-1 mt-1 text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
            >
              Todos los usuarios
            </button>
          )}
        </div>

        <FormSelect
          label="Sucursal"
          value={filters.sucursal !== undefined ? String(filters.sucursal) : ""}
          disabled={isBranchesLoading}
          onChange={(event) => {
            const id = Number(event.target.value);
            setFilter("sucursal", Number.isInteger(id) && id > 0 ? id : undefined);
          }}
        >
          <option value="" className={OPTION_CLS}>
            Todas las sucursales
          </option>
          {/* Una sucursal de la URL que el catálogo no trae se conserva como
              opción para que el select no aparente "Todas". */}
          {filters.sucursal !== undefined &&
            !branches.some((branch) => branch.id === filters.sucursal) && (
              <option value={String(filters.sucursal)} className={OPTION_CLS}>
                Sucursal #{filters.sucursal}
              </option>
            )}
          {branches.map((branch) => (
            <option key={branch.id} value={String(branch.id)} className={OPTION_CLS}>
              {branch.nombre}
            </option>
          ))}
        </FormSelect>

        <DateParamInput
          label="Desde"
          name="fecha_desde"
          value={filters.fecha_desde ?? ""}
          max={filters.fecha_hasta}
          isAcceptable={(value) => filters.fecha_hasta === undefined || value <= filters.fecha_hasta}
          onCommit={(value) => setFilter("fecha_desde", value || undefined)}
        />

        <DateParamInput
          label="Hasta"
          name="fecha_hasta"
          value={filters.fecha_hasta ?? ""}
          min={filters.fecha_desde}
          isAcceptable={(value) => filters.fecha_desde === undefined || value >= filters.fecha_desde}
          onCommit={(value) => setFilter("fecha_hasta", value || undefined)}
        />

        <FormInput
          label="Folio"
          name="folio"
          placeholder="Contiene…"
          value={folioDraft}
          maxLength={MAX_AUDIT_FOLIO_LENGTH}
          onChange={(event) => handleFolioChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitFolio(folioDraft);
            }
          }}
          autoComplete="off"
        />

        <div className="flex items-end">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClear}
              className="mb-3 text-sm font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <MainDialog
        open={isUserPickerOpen}
        onOpenChange={setIsUserPickerOpen}
        title=""
        maxWidth="560px"
        showCloseButton={false}
      >
        {/* Se monta solo abierto: la selección tentativa arranca en la vigente. */}
        {isUserPickerOpen && (
          <SingleSelectPickerDialogContent
            title="Filtrar por usuario"
            subtitle="Usuarios activos de la empresa"
            items={users}
            isLoading={isUsersLoading}
            isError={isUsersError}
            errorMessage="No se pudo cargar el catálogo de usuarios."
            searchPlaceholder="Buscar por nombre o correo..."
            filterPredicate={(user, term) => user.nombre_completo.toLowerCase().includes(term)}
            getKey={(user) => user.id}
            selectedKey={filters.usuario ?? null}
            pinSelected
            emptyMessage="No hay usuarios activos en la empresa."
            noResultsMessage="No se encontraron usuarios"
            renderContent={(user) => (
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {user.nombre_completo}
              </p>
            )}
            onConfirm={(user) => {
              setFilter("usuario", user.id);
              setIsUserPickerOpen(false);
            }}
            onCancel={() => setIsUserPickerOpen(false)}
          />
        )}
      </MainDialog>
    </div>
  );
}
