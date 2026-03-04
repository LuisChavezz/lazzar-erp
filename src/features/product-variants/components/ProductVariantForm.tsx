"use client";

import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProductVariantFormSchema, ProductVariantFormValues } from "../schemas/product-variant.schema";
import { FormInput } from "../../../components/FormInput";
import { FormSelect } from "../../../components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { InfoIcon, ProductVariantsIcon, SettingsIcon } from "../../../components/Icons";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";
import { useProducts } from "../../products/hooks/useProducts";
import { useColors } from "../../colors/hooks/useColors";
import { useSizes } from "../../sizes/hooks/useSizes";
import MissingPrerequisites from "../../products/components/MissingPrerequisites";
import { useCreateProductVariant } from "../hooks/useCreateProductVariant";
import { useUpdateProductVariant } from "../hooks/useUpdateProductVariant";
import { ProductVariant } from "../interfaces/product-variant.interface";

interface ProductVariantFormProps {
  onSuccess: () => void;
  productVariantToEdit?: ProductVariant | null;
}

export default function ProductVariantForm({
  onSuccess,
  productVariantToEdit,
}: ProductVariantFormProps) {
  // Store de Workspace para obtener la compañía seleccionada
  const selectedCompany = useWorkspaceStore((state) => state.selectedCompany);

  // Stores de Products, Colors, y Sizes para obtener los datos necesarios
  const { products, isLoading: isLoadingProducts } = useProducts();
  const { colors, isLoading: isLoadingColors } = useColors();
  const { sizes, isLoading: isLoadingSizes } = useSizes();

  // Filtrar productos, colores y tallas activos
  const activeProducts = products.filter((product) => product.activo);
  const activeColors = colors;
  const activeSizes = sizes;

  // Verificar si hay productos, colores y tallas activos
  const missingItems = [
    activeProducts.length === 0 && !isLoadingProducts ? "Productos" : null,
    activeColors.length === 0 && !isLoadingColors ? "Colores" : null,
    activeSizes.length === 0 && !isLoadingSizes ? "Tallas" : null,
  ].filter((item): item is string => Boolean(item));

  const isEditing = Boolean(productVariantToEdit?.id); // Verificar si hay una variante seleccionada para editar
  const emptyValues: ProductVariantFormValues = { // Valores vacíos para el formulario
    producto: 0,
    color: 0,
    talla: 0,
    sku: "",
    precio_base: "",
    activo: true,
  };

  // Verificar si la variante seleccionada tiene un producto, color y talla activos
  const hasProduct = activeProducts.some(
    (product) => product.id === productVariantToEdit?.producto
  );
  const hasColor = activeColors.some((color) => color.id === productVariantToEdit?.color);
  const hasSize = activeSizes.some((size) => size.id === productVariantToEdit?.talla);

  // Preparar valores para editar si la variante tiene un producto, color y talla activos
  const editValues: ProductVariantFormValues = productVariantToEdit
    ? {
        producto: hasProduct ? productVariantToEdit.producto : 0,
        color: hasColor ? productVariantToEdit.color : 0,
        talla: hasSize ? productVariantToEdit.talla : 0,
        sku: productVariantToEdit.sku,
        precio_base: productVariantToEdit.precio_base,
        activo: productVariantToEdit.activo,
      }
    : emptyValues;

  // Configurar el formulario con react-hook-form
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<ProductVariantFormValues>({
    resolver: zodResolver(ProductVariantFormSchema) as Resolver<ProductVariantFormValues>,
    defaultValues: emptyValues,
    values: isEditing ? editValues : undefined,
  });

  const isActive = watch("activo"); // Observar el estado de activo en el formulario
  const { mutateAsync: createProductVariant, isPending: isCreating } =
    useCreateProductVariant(setError);
  const { mutateAsync: updateProductVariant, isPending: isUpdating } =
    useUpdateProductVariant(setError);
  const isPending = isCreating || isUpdating;

  // Manejar la submisión del formulario
  const onSubmit = async (data: ProductVariantFormValues) => {
    try {
      if (isEditing && productVariantToEdit) { // Actualizar la variante si existe
        await updateProductVariant({
          id: productVariantToEdit.id,
          empresa: productVariantToEdit.empresa ?? selectedCompany.id!,
          ...data,
        });
        reset(editValues);
      } else { // Registrar una nueva variante si no existe
        await createProductVariant({
          empresa: selectedCompany.id!,
          ...data,
        });
        reset(emptyValues);
      }
      onSuccess();
    } catch (error) {
      console.error(error);
    }
  };

  // Mostrar un mensaje si faltan productos, colores o tallas activos
  if (missingItems.length > 0) {
    return <MissingPrerequisites items={missingItems} />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full">
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
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
                  placeholder="Ej. SKU-001"
                  className="text-2xl font-bold"
                  variant="ghost"
                  {...register("sku")}
                  error={errors.sku}
                />
              </div>

              <div className="group/field">
                <FormSelect
                  label="Producto"
                  {...register("producto", { valueAsNumber: true })}
                  error={errors.producto}
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
                  {...register("color", { valueAsNumber: true })}
                  error={errors.color}
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
                  {...register("talla", { valueAsNumber: true })}
                  error={errors.talla}
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
            disabled={isPending}
          />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            {isEditing ? "Actualizar Variante" : "Registrar Variante"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
