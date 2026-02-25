"use client";

import { useState } from "react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { WarehouseFormSchema, WarehouseFormValues } from "../schemas/warehouse.schema";
import { FormInput } from "../../../components/FormInput";
import { FormSelect } from "../../../components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { BuildingIcon, MapPinIcon, SettingsIcon } from "../../../components/Icons";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";
import { useCompanyBranches } from "../../branches/hooks/useCompanyBranches";
import { useCreateWarehouse } from "../hooks/useCreateWarehouse";
import { useUpdateWarehouse } from "../hooks/useUpdateWarehouse";
import { Warehouse } from "../interfaces/warehouse.interface";

interface WarehouseFormProps {
  onSuccess: () => void;
  warehouseToEdit?: Warehouse | null;
}

export default function WarehouseForm({ onSuccess, warehouseToEdit }: WarehouseFormProps) {

  // Obtener las sucursales y el ID de la compañía seleccionada
  const companyId = useWorkspaceStore((state) => state.selectedCompany.id);
  const { branches, isLoading: isLoadingBranches } = useCompanyBranches(companyId);

  const isEditing = Boolean(warehouseToEdit?.id_almacen); // Verificar si se está editando un almacén
  const emptyValues: WarehouseFormValues = { // Valores por defecto para el formulario
    sucursal: 0,
    codigo: "",
    nombre: "",
    estatus: "ACTIVO",
  };

  // Verificar si la sucursal del almacén a editar existe en las sucursales de la compañía
  const hasBranch = branches.some((branch) => branch.id === warehouseToEdit?.sucursal);

  const editValues: WarehouseFormValues = warehouseToEdit // Valores para editar un almacén
    ? { 
        sucursal: hasBranch ? warehouseToEdit.sucursal : 0,
        codigo: warehouseToEdit.codigo,
        nombre: warehouseToEdit.nombre,
        estatus: warehouseToEdit.estatus as WarehouseFormValues["estatus"],
      }
    : emptyValues;

  // Configurar el formulario con los valores por defecto y los valores de edición si es necesario
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<WarehouseFormValues>({
    resolver: zodResolver(WarehouseFormSchema) as Resolver<WarehouseFormValues>,
    defaultValues: emptyValues,
    values: isEditing ? editValues : undefined,
  });

  // Manejar la creación y actualización de almacenes
  const { mutateAsync: createWarehouse, isPending: isCreating } = useCreateWarehouse(setError);
  const { mutateAsync: updateWarehouse, isPending: isUpdating } = useUpdateWarehouse(setError);

  const [isLoading, setIsLoading] = useState(false); // Estado para controlar la carga

  // Combinar los diferentes estados de carga en uno solo
  const isPending = isCreating || isUpdating || isLoading;

  // Manejar el envío del formulario
  const onSubmit = async (values: WarehouseFormValues) => {
    setIsLoading(true);
    try {
      if (isEditing && warehouseToEdit) {
        await updateWarehouse({ id_almacen: warehouseToEdit.id_almacen, ...values });
        reset(editValues);
      } else {
        await createWarehouse(values);
        reset(emptyValues);
      }
      onSuccess();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full">
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
        <section className="mb-8">
          <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-8 border border-slate-100 dark:border-white/5">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <BuildingIcon className="w-4 h-4" />
              Información General
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field md:col-span-2">
                <FormInput
                  label="Nombre"
                  placeholder="Ej. Almacén Central"
                  className="text-2xl font-bold"
                  variant="ghost"
                  {...register("nombre")}
                  error={errors.nombre}
                />
              </div>

              <div className="group/field">
                <FormInput
                  label="Código"
                  placeholder="ALM-001"
                  {...register("codigo")}
                  error={errors.codigo}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-8 border border-slate-100 dark:border-white/5">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <MapPinIcon className="w-4 h-4" />
              Sucursal
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormSelect
                label="Sucursal"
                {...register("sucursal", { valueAsNumber: true })}
                error={errors.sucursal}
              >
                <option value="0" disabled>
                  {isLoadingBranches ? "Cargando sucursales..." : "Seleccionar..."}
                </option>
                {branches.map((branch) => (
                  <option
                    key={branch.id}
                    value={branch.id}
                    className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                  >
                    {branch.codigo} - {branch.nombre}
                  </option>
                ))}
              </FormSelect>
            </div>
          </div>
        </section>

        <div className="w-full">
          <div className="w-full space-y-8">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
                  <SettingsIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                    Estado
                  </h3>
                  <p className="text-xs text-slate-500">Disponibilidad del almacén</p>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormSelect label="Estatus del almacén" {...register("estatus")} error={errors.estatus}>
                    <option value="ACTIVO" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                      Activo
                    </option>
                    <option value="INACTIVO" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                      Inactivo
                    </option>
                  </FormSelect>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-8 mt-8">
          <FormCancelButton
            onClick={() => reset(isEditing ? editValues : emptyValues)}
            disabled={isPending}
          />
          <FormSubmitButton isPending={isPending} loadingLabel={isEditing ? "Actualizando..." : "Guardando..."}>
            {isEditing ? "Actualizar Almacén" : "Registrar Almacén"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
