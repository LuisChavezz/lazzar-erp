"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useProductTypeStore } from "../stores/product-type.store";
import { ProductTypeFormSchema, ProductTypeFormValues } from "../schemas/product-type.schema";
import { FormInput } from "../../../components/FormInput";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { ProductTypesIcon } from "../../../components/Icons";
import toast from "react-hot-toast";

interface ProductTypeFormProps {
  onSuccess: () => void;
}

export default function ProductTypeForm({ onSuccess }: ProductTypeFormProps) {
  const addProductType = useProductTypeStore((state) => state.addProductType);
  const updateProductType = useProductTypeStore((state) => state.updateProductType);
  const selectedProductType = useProductTypeStore((state) => state.selectedProductType);
  const isLoading = useProductTypeStore((state) => state.isLoading);
  const setIsLoading = useProductTypeStore((state) => state.setIsLoading);
  const isEditing = Boolean(selectedProductType?.id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductTypeFormValues>({
    resolver: zodResolver(ProductTypeFormSchema),
    defaultValues: {
      codigo: "",
      descripcion: "",
    },
    values: isEditing
      ? {
          codigo: selectedProductType.codigo,
          descripcion: selectedProductType.descripcion ?? "",
        }
      : undefined,
  });

  const onSubmit = async (data: ProductTypeFormValues) => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const descripcion = data.descripcion?.trim() || undefined;

      if (isEditing) {
        updateProductType({
          id: selectedProductType.id,
          codigo: data.codigo,
          descripcion,
        });
        toast.success("Tipo de producto actualizado correctamente");
      } else {
        addProductType({
          id: Date.now(),
          codigo: data.codigo,
          descripcion,
        });
        toast.success("Tipo de producto registrado correctamente");
      }
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Ocurrió un error al guardar el tipo de producto");
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
              <ProductTypesIcon className="w-4 h-4" />
              Información General
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field">
                <div className="relative">
                  <div className="absolute left-3 top-9 text-slate-400 font-mono text-sm">#</div>
                  <FormInput
                    label="Código"
                    placeholder="Ej. TIPO-01"
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
                  placeholder="Describe el tipo de producto (opcional)"
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

        <div className="flex justify-end gap-3 pb-8 mt-8">
          <FormCancelButton onClick={() => reset()} disabled={isLoading} />
          <FormSubmitButton isPending={isLoading} loadingLabel="Guardando...">
            {isEditing ? "Actualizar Tipo" : "Registrar Tipo"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
