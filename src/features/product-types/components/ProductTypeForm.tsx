"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProductTypeFormSchema, ProductTypeFormValues } from "../schemas/product-type.schema";
import { FormInput } from "../../../components/FormInput";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { ProductTypesIcon } from "../../../components/Icons";
import { useCreateProductType } from "../hooks/useCreateProductType";
import { useUpdateProductType } from "../hooks/useUpdateProductType";
import { ProductType } from "../interfaces/product-type.interface";

interface ProductTypeFormProps {
  onSuccess: () => void;
  productTypeToEdit?: ProductType | null;
}

export default function ProductTypeForm({ onSuccess, productTypeToEdit }: ProductTypeFormProps) {
  const isEditing = Boolean(productTypeToEdit?.id);
  const emptyValues: ProductTypeFormValues = {
    codigo: "",
  };
  const editValues: ProductTypeFormValues = productTypeToEdit
    ? { codigo: productTypeToEdit.codigo }
    : emptyValues;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ProductTypeFormValues>({
    resolver: zodResolver(ProductTypeFormSchema),
    defaultValues: emptyValues,
    values: isEditing ? editValues : undefined,
  });

  const { mutateAsync: createProductType, isPending: isCreating } = useCreateProductType(setError);
  const { mutateAsync: updateProductType, isPending: isUpdating } = useUpdateProductType(setError);
  const [isLoading, setIsLoading] = useState(false);
  const isPending = isCreating || isUpdating || isLoading;

  const onSubmit = async (data: ProductTypeFormValues) => {
    setIsLoading(true);
    try {
      if (isEditing && productTypeToEdit) {
        await updateProductType({
          id: productTypeToEdit.id,
          codigo: data.codigo,
        });
        reset(editValues);
      } else {
        await createProductType({ codigo: data.codigo });
        reset(emptyValues);
      }
      onSuccess();
    } catch (error) {
      console.error(error);
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
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 pb-8 mt-8">
          <FormCancelButton onClick={() => reset(isEditing ? editValues : emptyValues)} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel={isEditing ? "Actualizando..." : "Guardando..."}>
            {isEditing ? "Actualizar Tipo" : "Registrar Tipo"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
