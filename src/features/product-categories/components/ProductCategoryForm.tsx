"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useProductCategoryStore } from "../stores/product-category.store";
import { ProductCategoryFormSchema, ProductCategoryFormValues } from "../schemas/product-category.schema";
import { FormInput } from "../../../components/FormInput";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { ProductCategoriesIcon, SettingsIcon } from "../../../components/Icons";
import toast from "react-hot-toast";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";

interface ProductCategoryFormProps {
  onSuccess: () => void;
}

export default function ProductCategoryForm({ onSuccess }: ProductCategoryFormProps) {

  // Product Category Store
  const addCategory = useProductCategoryStore((state) => state.addCategory);
  const updateCategory = useProductCategoryStore((state) => state.updateCategory);
  const selectedCategory = useProductCategoryStore((state) => state.selectedCategory);
  const isLoading = useProductCategoryStore((state) => state.isLoading);
  const setIsLoading = useProductCategoryStore((state) => state.setIsLoading);

  // Workspace Store
  const selectedCompany = useWorkspaceStore((state) => state.selectedCompany);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProductCategoryFormValues>({
    resolver: zodResolver(ProductCategoryFormSchema),
    defaultValues: {
      nombre: "",
      codigo: "",
      descripcion: "",
      activo: true,
    },
    values: selectedCategory
      ? {
          nombre: selectedCategory.nombre,
          codigo: selectedCategory.codigo,
          descripcion: selectedCategory.descripcion ?? "",
          activo: selectedCategory.activo,
        }
      : undefined,
  });

  const isActive = watch("activo");

  const onSubmit = async (data: ProductCategoryFormValues) => {
    setIsLoading(true);
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Prepare data for update or insert
      const now = new Date().toISOString();
      const descripcion = data.descripcion?.trim() || undefined;

      if (selectedCategory) {
        updateCategory({
          ...selectedCategory,
          ...data,
          descripcion,
          updated_at: now,
        });
        toast.success("Categoría actualizada correctamente");
      } else {
        addCategory({
          id: Date.now(),
          empresa_id: selectedCompany.id!,
          nombre: data.nombre,
          codigo: data.codigo,
          descripcion,
          activo: data.activo,
          created_at: now,
          updated_at: now,
        });
        toast.success("Categoría registrada correctamente");
      }
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Ocurrió un error al guardar la categoría");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full">
      <fieldset disabled={isLoading} className="group-disabled:opacity-50">
        <section className="mb-8">
          <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-8 border border-slate-100 dark:border-white/5">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <ProductCategoriesIcon className="w-4 h-4" />
              Información General
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field md:col-span-2">
                <FormInput
                  label="Nombre de la Categoría"
                  placeholder="Ej. Electrónica"
                  variant="ghost"
                  className="text-3xl font-bold"
                  {...register("nombre")}
                  error={errors.nombre}
                />
              </div>

              <div className="group/field">
                <div className="relative">
                  <div className="absolute left-3 top-9 text-slate-400 font-mono text-sm">#</div>
                  <FormInput
                    label="Código"
                    placeholder="Ej. CAT-001"
                    className="pl-8 font-mono"
                    {...register("codigo")}
                    error={errors.codigo}
                  />
                </div>
              </div>

              <div className="group/field md:col-span-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within:text-sky-500">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe la categoría (opcional)"
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all dark:text-white resize-none"
                  {...register("descripcion")}
                />
                {errors.descripcion && (
                  <p className="text-xs text-red-600 mt-1">{errors.descripcion.message}</p>
                )}
              </div>
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
                    Estado y Visibilidad
                  </h3>
                  <p className="text-xs text-slate-500">Control de disponibilidad</p>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 px-4 py-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                    {...register("activo")}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {isActive ? "Categoría activa" : "Categoría inactiva"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {isActive
                        ? "Disponible para asignación en productos"
                        : "No disponible para nuevas asignaciones"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-8 mt-8">
          <FormCancelButton onClick={() => reset()} disabled={isLoading} />
          <FormSubmitButton isPending={isLoading} loadingLabel="Guardando...">
            {selectedCategory ? "Actualizar Categoría" : "Registrar Categoría"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
