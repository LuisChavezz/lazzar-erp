"use client";

import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useProductVariantStore } from "../stores/product-variant.store";
import { ProductVariantFormSchema, ProductVariantFormValues } from "../schemas/product-variant.schema";
import { FormInput } from "../../../components/FormInput";
import { FormSelect } from "../../../components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { InfoIcon, ProductVariantsIcon, SettingsIcon } from "../../../components/Icons";
import toast from "react-hot-toast";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";
import { useProductStore } from "../../products/stores/product.store";
import { useColorStore } from "../../colors/stores/color.store";
import { useSizeStore } from "../../sizes/stores/size.store";
import MissingPrerequisites from "../../products/components/MissingPrerequisites";

interface ProductVariantFormProps {
  onSuccess: () => void;
}

export default function ProductVariantForm({ onSuccess }: ProductVariantFormProps) {
  const addProductVariant = useProductVariantStore((state) => state.addProductVariant);
  const updateProductVariant = useProductVariantStore((state) => state.updateProductVariant);
  const selectedProductVariant = useProductVariantStore((state) => state.selectedProductVariant);
  const isLoading = useProductVariantStore((state) => state.isLoading);
  const setIsLoading = useProductVariantStore((state) => state.setIsLoading);

  const selectedCompany = useWorkspaceStore((state) => state.selectedCompany);
  const { products } = useProductStore((state) => state);
  const { colors } = useColorStore((state) => state);
  const { sizes } = useSizeStore((state) => state);

  const activeProducts = products.filter((product) => product.activo);
  const activeColors = colors.filter((color) => color.activo);
  const activeSizes = sizes.filter((size) => size.activo);

  const missingItems = [
    activeProducts.length === 0 ? "Productos" : null,
    activeColors.length === 0 ? "Colores" : null,
    activeSizes.length === 0 ? "Tallas" : null,
  ].filter((item): item is string => Boolean(item));

  const isEditing = Boolean(selectedProductVariant?.id);
  const emptyValues: ProductVariantFormValues = {
    producto_id: 0,
    color_id: 0,
    talla_id: 0,
    sku: "",
    precio_base: "",
    activo: true,
  };

  const hasProduct = activeProducts.some(
    (product) => product.id === selectedProductVariant?.producto_id
  );
  const hasColor = activeColors.some((color) => color.id === selectedProductVariant?.color_id);
  const hasSize = activeSizes.some((size) => size.id === selectedProductVariant?.talla_id);

  const editValues: ProductVariantFormValues = selectedProductVariant
    ? {
        producto_id: hasProduct ? selectedProductVariant.producto_id : 0,
        color_id: hasColor ? selectedProductVariant.color_id : 0,
        talla_id: hasSize ? selectedProductVariant.talla_id : 0,
        sku: selectedProductVariant.sku,
        precio_base: selectedProductVariant.precio_base,
        activo: selectedProductVariant.activo,
      }
    : emptyValues;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProductVariantFormValues>({
    resolver: zodResolver(ProductVariantFormSchema) as Resolver<ProductVariantFormValues>,
    defaultValues: emptyValues,
    values: isEditing ? editValues : undefined,
  });

  const isActive = watch("activo");

  const onSubmit = async (data: ProductVariantFormValues) => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (selectedProductVariant) {
        updateProductVariant({
          ...selectedProductVariant,
          ...data,
        });
        toast.success("Variante actualizada correctamente");
      } else {
        addProductVariant({
          id: Date.now(),
          empresa_id: selectedCompany.id!,
          producto_id: data.producto_id,
          color_id: data.color_id,
          talla_id: data.talla_id,
          sku: data.sku,
          precio_base: data.precio_base,
          activo: data.activo,
        });
        toast.success("Variante registrada correctamente");
      }
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Ocurrió un error al guardar la variante");
    } finally {
      setIsLoading(false);
    }
  };

  if (missingItems.length > 0) {
    return <MissingPrerequisites items={missingItems} />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full">
      <fieldset disabled={isLoading} className="group-disabled:opacity-50">
        <section className="mb-8">
          <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-8 border border-slate-100 dark:border-white/5">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <ProductVariantsIcon className="w-4 h-4" />
              Información General
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field md:col-span-2">
                <FormInput
                  label="SKU"
                  placeholder="Ej. SKU-0001"
                  className="text-2xl font-bold"
                  variant="ghost"
                  {...register("sku")}
                  error={errors.sku}
                />
              </div>

              <div className="group/field">
                <FormSelect
                  label="Producto"
                  {...register("producto_id", { valueAsNumber: true })}
                  error={errors.producto_id}
                >
                  <option value="0" disabled>
                    Seleccionar...
                  </option>
                  {activeProducts.map((product) => (
                    <option
                      key={product.id}
                      value={product.id}
                      className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                    >
                      {product.nombre}
                    </option>
                  ))}
                </FormSelect>
              </div>

              <div className="group/field">
                <FormSelect
                  label="Color"
                  {...register("color_id", { valueAsNumber: true })}
                  error={errors.color_id}
                >
                  <option value="0" disabled>
                    Seleccionar...
                  </option>
                  {activeColors.map((color) => (
                    <option
                      key={color.id}
                      value={color.id}
                      className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                    >
                      {color.nombre}
                    </option>
                  ))}
                </FormSelect>
              </div>

              <div className="group/field">
                <FormSelect
                  label="Talla"
                  {...register("talla_id", { valueAsNumber: true })}
                  error={errors.talla_id}
                >
                  <option value="0" disabled>
                    Seleccionar...
                  </option>
                  {activeSizes.map((size) => (
                    <option
                      key={size.id}
                      value={size.id}
                      className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                    >
                      {size.nombre}
                    </option>
                  ))}
                </FormSelect>
              </div>

              <div className="group/field">
                <FormInput
                  label="Precio Base"
                  placeholder="0.00"
                  {...register("precio_base")}
                  error={errors.precio_base}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-8 border border-slate-100 dark:border-white/5">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <InfoIcon className="w-4 h-4" />
              Detalles de la variante
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormInput
                  label="Empresa"
                  placeholder={selectedCompany?.nombre_comercial || selectedCompany?.razon_social || "Empresa activa"}
                readOnly
                tabIndex={-1}
                className="cursor-not-allowed bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-slate-400 focus:bg-slate-100 dark:focus:bg-zinc-800 focus:ring-0 focus:border-slate-200 dark:focus:border-zinc-700"
              />
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
                      {isActive ? "Variante activa" : "Variante inactiva"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {isActive ? "Disponible para selección" : "No disponible para selección"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-8 mt-8">
          <FormCancelButton
            onClick={() => reset(isEditing ? editValues : emptyValues)}
            disabled={isLoading}
          />
          <FormSubmitButton isPending={isLoading} loadingLabel="Guardando...">
            {isEditing ? "Actualizar Variante" : "Registrar Variante"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
